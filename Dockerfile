###############
# BUILD STAGE #
###############
FROM node:20-alpine AS builder

RUN apk add --no-cache --virtual .build-deps \
    python3 \
    make \
    g++ \
    sqlite-dev

WORKDIR /app

COPY package.json package-lock.json ./

# Install all dependencies (frontend and backend)
RUN npm install --no-audit --no-fund

# Copy source code
COPY . ./

# Build frontend
RUN NODE_ENV=production npm run frontend:build

# Run backend tests
RUN DOCKER_BUILD=1 npm run backend:test
# Cleanup
RUN npm cache clean --force && \
    rm -rf ~/.npm /tmp/* && \
    apk del .build-deps

####################
# Production stage #
####################
FROM node:20-alpine AS production

# Set build-time and runtime UID/GID (default 1001)
ARG APP_UID=1001
ARG APP_GID=1001
ENV APP_UID=${APP_UID}
ENV APP_GID=${APP_GID}

RUN addgroup -g ${APP_GID} -S app && \
    adduser -S app -u ${APP_UID} -G app

RUN apk add --no-cache --virtual .runtime-deps \
    sqlite \
    openssl \
    curl \
    dumb-init && \
    rm -rf /var/cache/apk/* /tmp/* && \
    rm -rf /usr/share/man /usr/share/doc /usr/share/info

# Set working directory
WORKDIR /app

# Copy backend
COPY ./backend/ /app/backend/
RUN chmod +x /app/backend/cmd/start.sh

# Copy frontend
RUN rm -rf /app/backend/dist
COPY --from=builder --chown=app:app /app/dist ./backend/dist
COPY --from=builder --chown=app:app /app/public/locales ./backend/dist/locales

# Copy all dependencies (now in root)
COPY --from=builder --chown=app:app /app/node_modules ./node_modules

# Create necessary directories
RUN mkdir -p /app/backend/db /app/backend/certs && \
    chown -R app:app /app

# Cleanup
RUN apk del --no-cache .runtime-deps sqlite openssl curl && \
    apk add --no-cache sqlite-libs openssl curl dumb-init && \
    rm -rf /usr/local/lib/node_modules/npm/docs /usr/local/lib/node_modules/npm/man && \
    rm -rf /root/.npm /tmp/* /var/tmp/* /var/cache/apk/*

VOLUME ["/app/backend/db"]

USER app

EXPOSE 3002

ENV NODE_ENV=production \
    PORT=3002 \
    TUDUDI_INTERNAL_SSL_ENABLED=false \
    TUDUDI_ALLOWED_ORIGINS="http://localhost:8080,http://localhost:3002,http://127.0.0.1:8080,http://127.0.0.1:3002" \
    TUDUDI_SESSION_SECRET="" \
    TUDUDI_USER_EMAIL="" \
    TUDUDI_USER_PASSWORD="" \
    DISABLE_TELEGRAM=false \
    DISABLE_SCHEDULER=false

# Docker healthcheck
HEALTHCHECK --interval=60s --timeout=3s --start-period=10s --retries=2 \
    CMD curl -sf http://localhost:3002/api/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
WORKDIR /app/backend
CMD ["/app/backend/cmd/start.sh"]