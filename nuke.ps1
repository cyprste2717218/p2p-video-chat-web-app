Write-Host ">>> Removing node_modules..."
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue node_modules
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue web-server/node_modules
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue web-socket-api/src/node_modules
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue infra/node_modules

Write-Host ">>> Clearing npm cache..."
npm cache clean --force

Write-Host ">>> Reinstalling dependencies..."
npm install
Push-Location web-server; npm install; Pop-Location
Push-Location web-socket-api/src; npm install; Pop-Location
Push-Location infra; npm install; Pop-Location

Write-Host ">>> Tearing down Docker containers and images..."
docker compose --env-file .env -f web-socket-api/src/compose.yaml down --rmi all
docker compose --env-file .env -f web-server/compose.yaml down web-server-dev --rmi all

Write-Host ">>> Pruning Docker system..."
docker system prune -f

Write-Host ">>> Rebuilding Docker images..."
docker compose --env-file .env -f web-socket-api/src/compose.yaml build signalling-server-dev mysql-db
docker compose --env-file .env -f web-server/compose.yaml build web-server-dev

Write-Host ">>> Done."
