#!/bin/bash
# Fix ownership of /data volume (mounted as root by Fly.io)
# Then exec the main process as the builder user
chown -R builder:builder /data 2>/dev/null || true
exec su builder -c "node dist/index.js"
