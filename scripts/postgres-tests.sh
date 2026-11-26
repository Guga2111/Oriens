#!/usr/bin/env bash
# Runs the PostgreSQL integration tests against a disposable PostgreSQL 15 container.
# Each test class gets its own empty database; Flyway installs the schema when the test context starts.
# The container listens only on loopback and is removed on exit. Never point these tests at a shared DB.
#
# Usage (from anywhere):  scripts/postgres-tests.sh [TestClass ...]
# Without arguments every *PostgresTest runs. Browser/client proofs keep their own opt-in variables
# (e.g. P5_BROWSER_PROOF=1, MCP_CLIENT_PROOF=1), which pass through unchanged.
set -euo pipefail
cd "$(dirname "$0")/../apps/api"

tests=("$@")
if [ ${#tests[@]} -eq 0 ]; then
  tests=(ProjectWorkPostgresTest WorkApiPostgresTest StatisticsPostgresTest InvestmentPostgresTest InvestmentMigrationPostgresTest
         McpPostgresTest McpP2PostgresTest McpP3PostgresTest McpP4PostgresTest)
fi

name="oriens-pg-tests-$(date +%s)-$$"
docker run --detach --name "$name" --publish 127.0.0.1::5432 --tmpfs /var/lib/postgresql/data \
  -e POSTGRES_HOST_AUTH_METHOD=trust postgres:15-alpine >/dev/null
trap 'docker rm --force "$name" >/dev/null' EXIT

for _ in $(seq 120); do
  docker exec "$name" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1 && break
  sleep 0.5
done
port=$(docker port "$name" 5432 | head -n1 | sed 's/.*://')

for test in "${tests[@]}"; do
  # The tests' safety guard only accepts loopback databases named oriens_*_proof.
  docker exec "$name" psql -X -q -U postgres \
    -c "DROP DATABASE IF EXISTS oriens_mcp_proof" -c "CREATE DATABASE oriens_mcp_proof"
  url="jdbc:postgresql://127.0.0.1:${port}/oriens_mcp_proof"
  echo "== $test"
  P1_JDBC_URL="$url" P2_JDBC_URL="$url" MCP_JDBC_URL="$url" ./mvnw -q test -Dtest="$test"
done
echo "PostgreSQL tests passed: ${tests[*]}"
