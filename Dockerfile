# Build stage
FROM docker.io/node:22-slim AS build

WORKDIR /app

# Copy package files
COPY client/package*.json client/pnpm-lock.yaml* ./

# Install pnpm and dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy application code
COPY client/ ./

# Build the application
RUN pnpm run build

# Production stage
FROM docker.io/node:22-slim AS production

WORKDIR /app

# Install pnpm globally (needed for dev server in docker-compose)
RUN npm install -g pnpm

# Install sirv-cli for serving static files
RUN npm install -g sirv-cli

# Copy built files from build stage
COPY --from=build /app/dist ./dist

# Fly.io provides $PORT, default to 8080
ENV PORT=8080

# Serve static files with sirv (SPA mode with --single flag)
CMD npx sirv-cli dist --host 0.0.0.0 --port $PORT --single
