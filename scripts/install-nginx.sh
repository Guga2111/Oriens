#!/usr/bin/env bash
set -euo pipefail

fail() {
    printf '%s\n' "$1" >&2
    exit 1
}

[[ $# == 2 ]] || fail "Uso: scripts/install-nginx.sh CANDIDATA ARQUIVO_ATIVO_ABSOLUTO"
candidate=$1
active=$2
[[ "$active" == /* && -f "$active" && ! -L "$active" ]] || fail "Informe o arquivo efetivo do Oriens, com caminho absoluto e sem link simbólico."
[[ -f "$candidate" && ! "$candidate" -ef "$active" ]] || fail "Informe uma candidata separada do arquivo ativo."

directory=$(dirname -- "$active")
umask 077
exec 9>"$directory/.oriens-nginx.lock"
flock -n 9 || fail "Já há uma instalação de Nginx do Oriens em andamento."
nginx -t

backup=$(mktemp -d "$directory/.oriens-nginx.XXXXXXXX")
cp -p -- "$active" "$backup/previous.conf"
cp -p -- "$active" "$backup/next.conf"
cat -- "$candidate" > "$backup/next.conf"
reload_attempted=false

recover_on_failure() {
    local status=$?
    trap - EXIT
    if (( status == 0 )); then
        return
    fi

    if cp -p -- "$backup/previous.conf" "$backup/restore.conf" &&
        mv -f -- "$backup/restore.conf" "$active" && nginx -t; then
        if [[ "$reload_attempted" == true ]] && ! nginx -s reload; then
            printf '%s\n' "Arquivo anterior restaurado. Falha ao recarregar o Nginx." >&2
        else
            printf '%s\n' "Configuração anterior restaurada." >&2
        fi
    else
        printf '%s\n' "Falha ao restaurar o Nginx. Cópia anterior em $backup/previous.conf." >&2
    fi
    exit "$status"
}

trap recover_on_failure EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
mv -f -- "$backup/next.conf" "$active"
nginx -t
reload_attempted=true
nginx -s reload
trap - EXIT INT TERM
printf 'Configuração validada e reload solicitado. Cópia anterior em %s/previous.conf.\n' "$backup"
