# Stage 1: Builder
FROM node:18-alpine AS builder

# Set build arguments
ARG NODE_ENV=production
ARG BUILD_VERSION=latest

# Set environment variables
ENV NODE_ENV=${NODE_ENV}
ENV BUILD_VERSION=${BUILD_VERSION}

# Install build dependencies and security tools
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    curl \
    && rm -rf /var/cache/apk/*

# Create app directory with secure permissions
WORKDIR /app

# Copy package files for workspace setup
COPY package*.json ./
COPY src/analytics-service/package*.json ./src/analytics-service/
COPY src/auth-service/package*.json ./src/auth-service/
COPY src/habit-service/package*.json ./src/habit-service/

# Install dependencies using yarn for better performance and security
RUN yarn install --frozen-lockfile --production=false \
    && yarn cache clean

# Copy source code and TypeScript config
COPY tsconfig*.json ./
COPY src/ ./src/

# Run security audit
RUN yarn audit \
    && yarn snyk test || true

# Build TypeScript code
RUN yarn build

# Prune dev dependencies
RUN yarn install --frozen-lockfile --production=true \
    && yarn cache clean

# Stage 2: Production
FROM node:18-alpine

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Create non-root user for security
RUN addgroup -g 1001 nodejs \
    && adduser -u 1001 -G nodejs -s /bin/sh -D nodejs

# Install production dependencies
RUN apk add --no-cache \
    curl \
    tini \
    && rm -rf /var/cache/apk/*

# Set working directory with proper permissions
WORKDIR /app
RUN chown -R nodejs:nodejs /app

# Copy built artifacts from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

# Create volume directories with proper permissions
RUN mkdir -p /app/logs \
    && chown -R nodejs:nodejs /app/logs

# Configure security policies
RUN echo "kernel.unprivileged_userns_clone=1" >> /etc/sysctl.conf \
    && echo "fs.file-max=65535" >> /etc/sysctl.conf

# Switch to non-root user
USER nodejs

# Expose application port
EXPOSE 3000

# Health check configuration
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Set container metadata
LABEL maintainer="Habit Tracker Team" \
    version="1.0.0" \
    description="Habit Tracking Backend Microservices" \
    security.scan.status="verified"

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "dist/app.js"]

# Define volumes
VOLUME ["/app/logs", "/app/node_modules"]