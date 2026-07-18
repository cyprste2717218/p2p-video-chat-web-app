$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "..")

npx concurrently `
	"docker compose --env-file .env -f web-socket-api/src/compose.yaml down mysql-db" `
	"docker compose --env-file .env -f web-socket-api/src/compose.yaml down signalling-server-dev" `
	"docker compose --env-file .env -f web-server/src/compose.yaml down web-server-dev"
