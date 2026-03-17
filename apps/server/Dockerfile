FROM node:22-alpine

WORKDIR /app

RUN corepack enable

# Copy workspace manifests first for better layer caching.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json angular.json ./
COPY apps/server/package.json apps/server/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile

# Copy source and build workspace packages.
COPY apps ./apps
COPY packages ./packages
COPY .env.example ./.env.example

RUN pnpm --filter @wizard/shared build && pnpm --filter @wizard/server build

EXPOSE 3000

CMD ["sh", "-c", "pnpm --filter @wizard/server prisma:deploy && node apps/server/dist/main.js"]
