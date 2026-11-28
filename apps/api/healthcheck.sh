#!/usr/bin/env bash
set -euo pipefail

exec 3<>/dev/tcp/127.0.0.1/8081
printf 'GET /actuator/health/readiness HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n' >&3
read -r protocol status _ <&3
[[ "$protocol" == HTTP/1.1 && "$status" == 200 ]]
