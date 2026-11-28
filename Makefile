.PHONY: help dev test test-postgres lint build e2e

help:
	@printf '%s\n' \
	  'make help          Lista os comandos disponíveis' \
	  'make dev           Sobe API e PostgreSQL locais e executa o Vite' \
	  'make test          Executa testes da API (H2) e do cliente' \
	  'make test-postgres Executa a suíte PostgreSQL descartável' \
	  'make lint          Executa o ESLint do cliente' \
	  'make build         Empacota a API e gera o cliente estático' \
	  'make e2e           Executa o Playwright contra uma API de teste em execução' \
	  '' \
	  'Pré-requisitos e configuração local em docs/guides/setup.md'

dev:
	docker compose -f ops/compose/docker-compose.dev.yml up -d
	npm --prefix apps/client run dev

test:
	cd apps/api && ./mvnw -B test '-Dtest=!McpP2PostgresTest,!McpP3PostgresTest,!McpP4PostgresTest' -Dsurefire.failIfNoSpecifiedTests=false
	npm --prefix apps/client test

test-postgres:
	scripts/postgres-tests.sh

lint:
	npm --prefix apps/client run lint

build:
	cd apps/api && ./mvnw -B -DskipTests package
	npm --prefix apps/client run build

e2e:
	npm --prefix apps/client run test:e2e
