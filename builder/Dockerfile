FROM node:20-slim

WORKDIR /app

# Install flyctl CLI
RUN apt-get update && \
    apt-get install -y curl && \
    curl -L https://fly.io/install.sh | sh && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

ENV FLYCTL_PATH="/root/.fly/bin/flyctl"

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

# Create apps directory on volume mount point
RUN mkdir -p /data/apps

ENV NODE_ENV=production
ENV APPS_DIR=/data/apps

EXPOSE 3001
CMD ["node", "dist/index.js"]
