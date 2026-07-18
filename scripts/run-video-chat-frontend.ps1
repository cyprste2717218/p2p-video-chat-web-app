$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "..")

docker compose --env-file .env -f web-server/src/compose.yaml watch web-server-dev
