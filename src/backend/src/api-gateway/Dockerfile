# ===== Build Stage =====
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    # Clean up cache to reduce layer size
    && rm -rf /var/cache/apk/*

# Copy package files with cache optimization
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies with cache mounting
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript application
RUN npm run build \
    # Remove dev dependencies and build artifacts
    && npm prune --production \
    # Remove build dependencies
    && apk del python3 make g++

# ===== Production Stage =====
FROM node:18-alpine

# Add labels for container metadata
LABEL maintainer="DevOps Team" \
    version="1.0.0" \
    security.capabilities="none" \
    org.opencontainers.image.source="github.com/habit-tracking-app" \
    org.opencontainers.image.description="API Gateway Service"

# Create non-root user/group
RUN addgroup -g 1000 nodegroup && \
    adduser -u 1000 -G nodegroup -s /bin/false -D nodeuser

# Set working directory
WORKDIR /app

# Copy built artifacts from builder stage
COPY --from=builder --chown=nodeuser:nodegroup /app/dist ./dist
COPY --from=builder --chown=nodeuser:nodegroup /app/node_modules ./node_modules
COPY --from=builder --chown=nodeuser:nodegroup /app/package.json ./

# Set strict file permissions
RUN chmod 755 /app \
    && chmod 644 /app/package.json \
    && chmod -R 755 /app/dist \
    && chmod -R 755 /app/node_modules

# Configure security settings
RUN apk add --no-cache dumb-init \
    && rm -rf /var/cache/apk/* \
    # Remove shell access
    && rm -rf /bin/sh

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    NODE_OPTIONS="--max-old-space-size=512"

# Create volume mount points
RUN mkdir -p /app/config /app/secrets /tmp \
    && chown -R nodeuser:nodegroup /app/config /app/secrets /tmp \
    && chmod 755 /app/config /app/secrets \
    && chmod 1777 /tmp

# Switch to non-root user
USER nodeuser

# Expose application port
EXPOSE 3000

# Health check configuration
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Set resource limits
ENV TINI_SUBREAPER=1
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start application
CMD ["node", "dist/app.js"]

# Configure volumes
VOLUME ["/app/config", "/app/secrets", "/tmp"]

# Enable read-only root filesystem
# This should be set at runtime using: --read-only