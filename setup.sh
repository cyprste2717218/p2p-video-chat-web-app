#!/usr/bin/env bash
set -e

echo "Installing root npm dependencies..."
npm install

echo "Installing web-server dependencies..."
(cd web-server && npm install)

echo "Installing signalling API dependencies..."
(cd web-socket-api/src && npm install)

echo "Installing infra dependencies..."
(cd infra && npm install)

echo "Building signalling API dev image..."
docker build -f ./web-socket-api/src/Dockerfile.dev -t signalling-server-dev:1.0.0 ./web-socket-api/src

echo "Building frontend dev image..."
docker build -f ./web-server/Dockerfile.dev -t web-server-dev:1.0.0 ./web-server

echo "Ready for dev!"
