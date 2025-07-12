FROM docker.io/node:22-slim AS build
RUN set -ex \
    && apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install \
    -y --no-install-recommends \
          "openssl" \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY client/package.json client/pnpm-lock.yaml ./
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN pnpm install
CMD ["pnpm", "run", "dev"]
