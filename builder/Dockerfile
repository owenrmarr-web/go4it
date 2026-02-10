FROM node:20-slim

WORKDIR /app

# Install flyctl CLI and git (needed by Claude Code)
RUN apt-get update && \
    apt-get install -y curl git && \
    curl -L https://fly.io/install.sh | sh && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Create non-root user — Claude Code CLI refuses --dangerously-skip-permissions as root
RUN useradd -m -s /bin/bash builder && \
    cp -r /root/.fly /home/builder/.fly && \
    chown -R builder:builder /home/builder/.fly

ENV FLYCTL_PATH="/home/builder/.fly/bin/flyctl"

# Install builder dependencies
COPY package.json package-lock.json* ./

# Copy prisma schema and config from platform (builder shares the same DB schema)
COPY prisma ./prisma
COPY prisma.config.ts ./

RUN npm install

# Generate Prisma client (dummy URL — only schema is needed for codegen)
RUN DATABASE_URL="file:./dummy.db" npx prisma generate

# Copy builder source
COPY src ./src
COPY tsconfig.json ./

# Build TypeScript
RUN npx tsc

# Copy playbook and template (baked into image)
COPY playbook ./playbook

# Create apps directory on volume mount point and give builder user ownership
RUN mkdir -p /data/apps && chown -R builder:builder /data /app

# Copy entrypoint script (runs as root to fix volume perms, then drops to builder user)
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENV NODE_ENV=production
ENV APPS_DIR=/data/apps

EXPOSE 3001
# Start as root so entrypoint can fix /data ownership, then drop to builder user
CMD ["/app/entrypoint.sh"]
