$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "..")

npx concurrently `
	"docker compose --env-file .env -f web-socket-api/src/compose.yaml watch signalling-server-dev" `
	"docker compose --env-file .env -f web-server/src/compose.yaml watch web-server-dev"
