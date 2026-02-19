FROM node:25-bullseye-slim AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./

RUN npm install -g pnpm@10.25.0 && \
    pnpm install --frozen-lockfile

COPY . .

ARG VITE_API_BASE_URL
ARG VITE_DADATA_KEY
ARG VITE_DADATA_API

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_DADATA_KEY=$VITE_DADATA_KEY \
    VITE_DADATA_API=$VITE_DADATA_API

RUN pnpm run build

FROM nginx:stable-alpine3.23-slim

RUN apk add --no-cache gettext

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY env.template.js /usr/share/nginx/html/env.template.js
COPY docker-entrypoint.d/10-env.sh /docker-entrypoint.d/10-env.sh
RUN chmod +x /docker-entrypoint.d/10-env.sh

EXPOSE 4173

# todo change to rootless user
# todo add healthcheck


CMD ["sh", "-c", "/docker-entrypoint.d/10-env.sh && nginx -g 'daemon off;'"]
