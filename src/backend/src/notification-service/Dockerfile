# Stage 1: Builder
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /usr/src/app

# Copy package files for dependency installation
COPY package*.json ./

# Install dependencies with exact versions for reproducible builds
# Use ci instead of install for more deterministic builds
RUN npm ci

# Copy TypeScript configuration and source code
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript code
RUN npm run build

# Prune dev dependencies for production
RUN npm prune --production

# Stage 2: Production
FROM node:18-alpine

# Add labels for better container management
LABEL maintainer="DevOps Team" \
      service="notification-service" \
      version="${BUILD_VERSION:-latest}"

# Create non-root user and group for security
RUN addgroup -S nodegroup && adduser -S nodeuser -G nodegroup

# Set working directory
WORKDIR /usr/src/app

# Copy package files for production dependencies
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built files from builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Set secure file permissions
RUN chown -R nodeuser:nodegroup /usr/src/app && \
    chmod -R 755 /usr/src/app

# Set production environment variables
ENV NODE_ENV=production \
    PORT=3003

# Switch to non-root user
USER nodeuser

# Expose port for the notification service
EXPOSE 3003

# Health check configuration
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3003/health || exit 1

# Start notification service
CMD ["node", "dist/app.js"]