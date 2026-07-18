#!/bin/bash
set -e

echo ">>> Removing node_modules..."
rm -rf node_modules web-server/src/node_modules web-socket-api/src/node_modules infra/node_modules

echo ">>> Clearing npm cache..."
npm cache clean --force

echo ">>> Reinstalling dependencies..."
npm install
(cd web-server/src && npm install)
(cd web-socket-api/src && npm install)
(cd infra && npm install)

echo ">>> Tearing down Docker containers and images..."
docker compose --env-file .env -f web-socket-api/src/compose.yaml down --rmi all
docker compose --env-file .env -f web-server/src/compose.yaml down web-server-dev --rmi all

echo ">>> Pruning Docker system..."
docker system prune -f

echo ">>> Rebuilding Docker images..."
docker compose --env-file .env -f web-socket-api/src/compose.yaml build signalling-server-dev mysql-db
docker compose --env-file .env -f web-server/src/compose.yaml build web-server-dev

echo ">>> Done."
