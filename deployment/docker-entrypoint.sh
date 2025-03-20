#!/bin/sh
set -e

# Start Docker daemon in the background
dockerd &

# Wait for Docker to start
echo "Waiting for Docker daemon to start..."
while ! docker info >/dev/null 2>&1; do
  sleep 1
done
sleep 2
echo "Docker daemon started"

# Set up buildx for multi-architecture builds
docker buildx create --name mybuilder --driver docker-container --use
docker buildx inspect --bootstrap

# Execute the provided command
exec "$@"
