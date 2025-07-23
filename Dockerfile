FROM docker.io/node:22-slim AS build
RUN set -ex \
    && apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install \
    -y --no-install-recommends \
          "openssl" \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY client/package.json client/pnpm-lock.yaml ./
# Eventually we can use devEngines.packageManager, but for now we hardcode pnpm version...
RUN npm install --global pnpm@10.13.1
RUN pnpm install
CMD ["pnpm", "run", "dev"]
