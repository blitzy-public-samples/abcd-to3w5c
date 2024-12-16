# Stage 1: Builder
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install all dependencies including devDependencies
RUN npm ci

# Copy TypeScript source code and configuration
COPY tsconfig*.json ./
COPY src/ ./src/

# Build TypeScript to JavaScript
RUN npm run build

# Prune development dependencies
RUN npm prune --production

# Stage 2: Production
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Set NODE_ENV
ENV NODE_ENV=production
ENV PORT=3002

# Create non-root user and group
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy built JavaScript files and production dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

# Set proper permissions
RUN chown -R appuser:appgroup /app

# Configure security headers and hardening
RUN apk add --no-cache dumb-init && \
    chmod -R 555 /app/dist && \
    chmod -R 555 /app/node_modules

# Switch to non-root user
USER appuser

# Expose service ports
# - 3002: HTTP API
# - 50051: gRPC API
EXPOSE 3002 50051

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3002/health || exit 1

# Use dumb-init as PID 1
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start the application
CMD ["node", "dist/main"]