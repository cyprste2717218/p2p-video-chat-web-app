#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/.."

docker compose --env-file .env -f web-server/src/compose.yaml watch web-server-dev
