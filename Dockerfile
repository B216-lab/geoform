FROM oven/bun:1.3.11-alpine AS base

WORKDIR /app

COPY package.json bun.lock ./

FROM base AS build

RUN bun install --frozen-lockfile

COPY . .

ARG VITE_DADATA_KEY
ARG VITE_DADATA_API

ENV VITE_DADATA_KEY=$VITE_DADATA_KEY \
    VITE_DADATA_API=$VITE_DADATA_API

RUN bun run build

FROM nginx:stable-alpine3.23-slim AS runtime

# hadolint ignore=DL3018
RUN apk add --no-cache gettext

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY env.template.js /usr/share/nginx/html/env.template.js
COPY docker-entrypoint.d/10-env.sh /docker-entrypoint.d/10-env.sh
RUN chmod +x /docker-entrypoint.d/10-env.sh

EXPOSE 4173

CMD ["sh", "-c", "/docker-entrypoint.d/10-env.sh && nginx -g 'daemon off;'"]
