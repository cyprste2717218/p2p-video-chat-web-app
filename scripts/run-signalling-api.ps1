$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "..")

docker compose --env-file .env -f web-socket-api/src/compose.yaml watch signalling-server-dev
