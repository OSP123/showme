# Build stage
FROM docker.io/node:22-slim AS build

RUN set -ex \
    && apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install \
    -y --no-install-recommends \
WORKDIR /app

# Copy package files
COPY client/package*.json client/pnpm-lock.yaml ./

# Install dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy application code
COPY client/ ./

# Build the application
RUN pnpm run build

# Production stage
FROM docker.io/node:22-slim AS production

WORKDIR /app

# Install sirv-cli for serving static files
RUN npm install -g sirv-cli

# Copy built files from build stage
COPY --from=build /app/dist ./dist

# Railway provides $PORT, default to 3000 for local
ENV PORT=3000

# Serve static files with sirv (SPA mode with --single flag)
CMD sirv-cli dist --host 0.0.0.0 --port $PORT --single
```
