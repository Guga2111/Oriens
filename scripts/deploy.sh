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
    docker build --label "org.opencontainers.image.revision=${IMAGE_TAG}" -t "oriens-api:${IMAGE_TAG}" apps/api
}

upload_release() {
    ssh vps "mkdir -p ~/${REMOTE_DIR} ${WEB_ROOT}"
    docker save "oriens-api:${IMAGE_TAG}" | gzip | ssh vps 'gunzip | docker load'
    scp ops/compose/docker-compose-prod.yml "vps:${REMOTE_DIR}/docker-compose-prod.next.yml"
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
    done | ssh vps "umask 077 && cat > ~/${REMOTE_DIR}/.env.next"
}

restart_api() {
    ssh vps "IMAGE_TAG=${IMAGE_TAG} REMOTE_DIR=${REMOTE_DIR} ROLLBACK_COMPATIBLE_PAIR=${ROLLBACK_COMPATIBLE_PAIR:-} bash -s" <<'REMOTE'
set -euo pipefail
cd ~/"${REMOTE_DIR}"
trap 'rm -f .env.next docker-compose-prod.next.yml' EXIT

image="oriens-api:${IMAGE_TAG}"
next() {
    ORIENS_API_TAG="$IMAGE_TAG" docker compose --env-file .env.next -f docker-compose-prod.next.yml "$@"
}

check_upload_permissions() {
    docker run --rm --network none --cap-drop ALL --security-opt no-new-privileges \
        --mount type=bind,src=/opt/oriens-uploads,dst=/opt/oriens-uploads \
        --entrypoint bash "$image" -ec '
            unavailable=$(find /opt/oriens-uploads \( -type d \( ! -readable -o ! -writable -o ! -executable \
                -o \( -perm -1000 ! -uid 10001 \) \) \
                -o -type f ! -readable -o ! -type f ! -type d \) -printf x -quit)
            test -z "$unavailable"
        '
}

image_revision() {
    docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$1"
}

has_healthcheck() {
    [[ "$(docker image inspect --format '{{if .Config.Healthcheck}}{{index .Config.Healthcheck.Test 0}}{{end}}' "$1")" == CMD ]]
}

rollback_previous() {
    local approved_tag
    [[ "$ROLLBACK_COMPATIBLE_PAIR" == "$IMAGE_TAG:"* && -n "$previous_id" ]] || return 1
    approved_tag="${ROLLBACK_COMPATIBLE_PAIR#*:}"
    [[ "$approved_tag" != "$IMAGE_TAG" && -f .env && -f docker-compose-prod.yml ]] || return 1
    [[ "$approved_tag" == "$(image_revision "$previous_id")" ]] || return 1
    [[ "$(docker image inspect --format '{{.Id}}' "oriens-api:${approved_tag}")" == "$previous_id" ]] || return 1
    has_healthcheck "$previous_id" || return 1

    if ! ORIENS_API_TAG="$approved_tag" docker compose --env-file .env -f docker-compose-prod.yml \
        up -d --wait --wait-timeout 360 api; then
        stop_failed_image "$previous_id"
        return 1
    fi
    echo "Versão anterior ${approved_tag} restaurada e pronta."
}

stop_failed_image() {
    if [[ "$(docker container inspect --format '{{.Image}}' oriens-api 2>/dev/null)" == "$1" ]]; then
        docker container stop oriens-api >/dev/null || {
            echo "::error::Não foi possível parar a API com falha. Verifique o container na VPS."
            exit 1
        }
    fi
}

candidate_id=$(docker image inspect --format '{{.Id}}' "$image")
if [[ "$(image_revision "$candidate_id")" != "$IMAGE_TAG" ]] || ! has_healthcheck "$candidate_id"; then
    echo "::error::A imagem candidata precisa corresponder ao SHA da publicação e ter healthcheck."
    exit 1
fi
next config -q
if ! check_upload_permissions; then
    echo "::error::Prepare as permissões de /opt/oriens-uploads para UID/GID 10001 antes de publicar."
    exit 1
fi
previous_id=$(docker image inspect --format '{{.Id}}' oriens-api:latest 2>/dev/null || true)
running_id=$(docker container inspect --format '{{if .State.Running}}{{.Image}}{{end}}' oriens-api 2>/dev/null || true)
if [[ -n "$running_id" && "$running_id" != "$previous_id" ]]; then
    echo "::error::A imagem em execução diverge da tag latest. Confira a versão ativa antes de publicar."
    exit 1
fi
# The VPS observability stack shares this network with the API.
docker network inspect observability >/dev/null 2>&1 || docker network create observability >/dev/null

echo "Aguardando a prontidão da API ${IMAGE_TAG}..."
if ! next up -d --wait --wait-timeout 360 --force-recreate api; then
    echo "::error::A API candidata não ficou pronta."
    next logs --tail 100 api || true
    stop_failed_image "$candidate_id"
    if ! rollback_previous; then
        echo "::error::Rollback automático indisponível ou falhou. Siga o guia de recuperação antes de reabrir escritas."
    fi
    exit 1
fi

if [[ -n "$previous_id" && "$previous_id" != "$candidate_id" ]]; then
    docker tag "$previous_id" oriens-api:previous
fi
mv .env.next .env
mv docker-compose-prod.next.yml docker-compose-prod.yml
docker tag "$candidate_id" oriens-api:latest
echo "API ${IMAGE_TAG} pronta."
REMOTE
}

publish_release() {
    [[ "${REMOTE_DIR:-}" =~ ^[a-zA-Z0-9_][a-zA-Z0-9_./-]*$ ]] || fail "REMOTE_DIR precisa ser um caminho relativo à home da VPS"
    [[ "${WEB_ROOT:-}" =~ ^/[a-zA-Z0-9_./-]+$ ]] || fail "WEB_ROOT precisa ser um caminho absoluto na VPS"
    [[ "${API_PORT:-}" =~ ^[1-9][0-9]{0,4}$ ]] && (( API_PORT <= 65535 )) || fail "API_PORT precisa ser uma porta fixa entre 1 e 65535"
    [[ "${ROLLBACK_COMPATIBLE_PAIR:-}" =~ ^([a-f0-9]{40}:[a-f0-9]{40})?$ ]] || fail "ROLLBACK_COMPATIBLE_PAIR precisa conter os SHAs completos da candidata e da anterior"

    upload_release
    write_environment
    restart_api
    # Publish only after Compose confirms the image's readiness probe.
    tar -C apps/client/dist -czf - . | ssh vps "tar -xzf - -C ${WEB_ROOT}"
}

[[ "$#" -eq 1 && "$1" =~ ^(build|publish)$ ]] || fail "Uso: scripts/deploy.sh {build|publish}"
[[ "${IMAGE_TAG:-}" =~ ^[a-f0-9]{40}$ ]] || fail "IMAGE_TAG precisa ser o SHA completo do commit"
cd "$(dirname "${BASH_SOURCE[0]}")/.."

case "$1" in
    build) build_release ;;
    publish) publish_release ;;
esac
