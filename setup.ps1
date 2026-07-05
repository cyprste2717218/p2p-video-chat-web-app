$ErrorActionPreference = "Stop"

Write-Host "Installing root npm dependencies..."
npm install

Write-Host "Installing web-server dependencies..."
Set-Location web-server
npm install
Set-Location ..

Write-Host "Installing signalling API dependencies..."
Set-Location web-socket-api/src
npm install
Set-Location ../..

Write-Host "Installing infra dependencies..."
Set-Location infra
npm install
Set-Location ..

Write-Host "Building signalling API image..."
docker build -t europe-west2-docker.pkg.dev/signalling-api/voneo/voneo-backend:1.0.0 ./web-socket-api/src

Write-Host "Building frontend dev image..."
docker build -f ./web-server/Dockerfile.dev -t web-server-dev:1.0.0 ./web-server

Write-Host "Ready for dev!"

