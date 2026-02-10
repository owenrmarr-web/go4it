#!/bin/sh
# Prepare builder for Docker build by copying shared files from the parent project
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Copying prisma schema from platform..."
rm -rf "$SCRIPT_DIR/prisma"
cp -r "$ROOT_DIR/prisma" "$SCRIPT_DIR/prisma"

echo "Copying prisma.config.ts..."
cp "$ROOT_DIR/prisma.config.ts" "$SCRIPT_DIR/prisma.config.ts"

echo "Copying playbook and template..."
rm -rf "$SCRIPT_DIR/playbook"
cp -r "$ROOT_DIR/playbook" "$SCRIPT_DIR/playbook"

echo "Builder files prepared. Ready for Docker build or flyctl deploy."
