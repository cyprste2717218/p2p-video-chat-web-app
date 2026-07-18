#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/.."

docker compose --env-file .env -f web-socket-api/src/compose.yaml watch signalling-server-dev
