#!/bin/bash

echo "clearing out old json files from previous runs ..."
rm -r -f data/*.json

echo "🛑 Stopping all running containers..."
docker ps -q | xargs -r docker stop

echo "🧹 Removing all containers..."
docker ps -aq | xargs -r docker rm

echo "🧼 Removing all images..."
docker images -q | xargs -r docker rmi -f

echo "✅ Docker cleanup complete."