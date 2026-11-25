#!/usr/bin/env bash
set -euo pipefail

fail() {
    printf '::error::%s\n' "$1" >&2
    exit 1
}

build_release() {
    (
        cd apps/client
        npm ci
        npm run build
    )
    docker build -t "oriens-api:${IMAGE_TAG}" apps/api
}

upload_release() {
    ssh vps "mkdir -p ~/${REMOTE_DIR} ${WEB_ROOT} /opt/oriens-uploads"
    docker save "oriens-api:${IMAGE_TAG}" | gzip | ssh vps 'gunzip | docker load'
    scp ops/compose/docker-compose-prod.yml "vps:${REMOTE_DIR}/docker-compose-prod.yml"
}

write_environment() {
    local name value
    local -a names=(DB_URL DB_USER DB_PASSWORD JWT_SECRET API_PORT ORIENS_MCP_ENABLED)
    if [[ "${ORIENS_MCP_ENABLED:-}" == true ]]; then
        names+=(ORIENS_MCP_ISSUER ORIENS_MCP_FRONTEND ORIENS_MCP_ENCRYPTION_PASSWORD ORIENS_MCP_ENCRYPTION_SALT)
    fi
    # Validate all values before opening the remote file.
    for name in "${names[@]}"; do
        value="${!name:-}"
        [[ -n "$value" ]] || fail "Secret $name não configurado"
        case "$value" in
            *"'"*|*$'\n'*) fail "$name não pode conter aspas simples nem quebra de linha" ;;
        esac
    done
    [[ "$(printf '%s' "$JWT_SECRET" | wc -c)" -ge 64 ]] || fail "JWT_SECRET precisa de pelo menos 64 bytes"

    for name in "${names[@]}"; do
        printf "%s='%s'\n" "$name" "${!name}"
    done | ssh vps "umask 077 && cat > ~/${REMOTE_DIR}/.env"
}

restart_api() {
    ssh vps "IMAGE_TAG=${IMAGE_TAG} REMOTE_DIR=${REMOTE_DIR} bash -s" <<'REMOTE'
set -euo pipefail
cd ~/"${REMOTE_DIR}"
set -a
. ./.env
set +a
compose() {
    docker compose -f docker-compose-prod.yml "$@"
}

if docker image inspect oriens-api:latest >/dev/null 2>&1; then
    docker tag oriens-api:latest oriens-api:previous
fi
docker tag "oriens-api:${IMAGE_TAG}" oriens-api:latest
# The VPS observability stack shares this network with the API.
docker network create observability >/dev/null 2>&1 || true
compose up -d --force-recreate --remove-orphans

echo "Aguardando a API responder em 127.0.0.1:${API_PORT}..."
# The shared VPS can take several minutes to boot the API under load.
for _ in $(seq 1 72); do
    # Any HTTP status means Spring finished booting.
    if curl -s -o /dev/null --max-time 5 "http://127.0.0.1:${API_PORT}/"; then
        compose ps
        docker images oriens-api --format '{{.Tag}}' | grep -vxE 'latest|previous' | tail -n +4 \
          | xargs -r -I {} docker rmi "oriens-api:{}" >/dev/null 2>&1 || true
        docker image prune -f >/dev/null
        echo "API ${IMAGE_TAG} no ar."
        exit 0
    fi
    sleep 5
done

echo "::error::API não respondeu em 360s; restaurando a versão anterior."
compose logs --tail 100 api || true
if docker image inspect oriens-api:previous >/dev/null 2>&1; then
    docker tag oriens-api:previous oriens-api:latest
    compose up -d --force-recreate
fi
exit 1
REMOTE
}

publish_release() {
    [[ "${REMOTE_DIR:-}" =~ ^[a-zA-Z0-9_][a-zA-Z0-9_./-]*$ ]] || fail "REMOTE_DIR precisa ser um caminho relativo à home da VPS"
    [[ "${WEB_ROOT:-}" =~ ^/[a-zA-Z0-9_./-]+$ ]] || fail "WEB_ROOT precisa ser um caminho absoluto na VPS"

    upload_release
    write_environment
    restart_api
    # Publish only after the API answers the readiness probe.
    tar -C apps/client/dist -czf - . | ssh vps "tar -xzf - -C ${WEB_ROOT}"
}

[[ "$#" -eq 1 && "$1" =~ ^(build|publish)$ ]] || fail "Uso: scripts/deploy.sh {build|publish}"
[[ "${IMAGE_TAG:-}" =~ ^[a-f0-9]{40}$ ]] || fail "IMAGE_TAG precisa ser o SHA completo do commit"
cd "$(dirname "${BASH_SOURCE[0]}")/.."

case "$1" in
    build) build_release ;;
    publish) publish_release ;;
esac
