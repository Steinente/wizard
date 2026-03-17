FROM node:22-alpine AS build

WORKDIR /app

RUN corepack enable

# Copy workspace manifests first for better layer caching.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json angular.json ./
COPY apps/client-ui/package.json apps/client-ui/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile

COPY apps ./apps
COPY packages ./packages

RUN pnpm --filter @wizard/shared build && pnpm --filter @wizard/client-ui build

FROM nginx:1.27-alpine

COPY apps/client-ui/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/client-ui/browser /usr/share/nginx/html

EXPOSE 80
