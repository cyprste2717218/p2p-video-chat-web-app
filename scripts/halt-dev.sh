#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/.."

npx concurrently \
	"docker compose --env-file .env -f web-socket-api/src/compose.yaml down mysql-db" \
	"docker compose --env-file .env -f web-socket-api/src/compose.yaml down signalling-server-dev" \
	"docker compose --env-file .env -f web-server/src/compose.yaml down web-server-dev"
