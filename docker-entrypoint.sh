#!/bin/sh
set -e

echo "Generating Prisma client..."
prisma generate 2>&1

echo "Running Prisma migrations..."
prisma migrate deploy 2>&1 || echo "Migration skipped"

echo "Starting application..."
exec node dist/src/main.js