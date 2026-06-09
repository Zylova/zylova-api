#!/bin/sh
set -e

echo "Running Prisma migrations..."
npx prisma migrate deploy 2>&1 || echo "Migration failed, continuing..."

echo "Starting application..."
exec node dist/src/main.js