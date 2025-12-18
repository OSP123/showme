# Build stage
FROM docker.io/node:22-slim AS build

RUN set -ex \
    && apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install \
    -y --no-install-recommends \
          "openssl" \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY client/package.json client/package-lock.json* client/pnpm-lock.yaml* ./

# Install pnpm
RUN npm install --global pnpm@10.13.1

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY client/ .

# Build the application
RUN pnpm run build

# Production stage
FROM docker.io/node:22-slim AS production

WORKDIR /app

# Install sirv-cli for serving static files
RUN npm install -g sirv-cli

# Copy built files from build stage
COPY --from=build /app/dist ./dist

# Expose port (Render will set $PORT)
EXPOSE 3000

# Serve static files with sirv (SPA mode with --single flag)
CMD ["sirv-cli", "dist", "--host", "0.0.0.0", "--port", "3000", "--single"]

