#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/.."

npx concurrently \
	"cd web-socket-api/src && docker compose down mysql-db" \
	"docker compose --env-file .env -f web-socket-api/src/compose.yaml down signalling-server-dev" \
	"docker compose --env-file .env -f web-server/src/compose.yaml down web-server-dev"
