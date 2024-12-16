# -----------------------------
# Stage 1: Builder
# -----------------------------
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies including dev dependencies for building
RUN npm ci

# Copy source code and config files
COPY tsconfig.json .
COPY src ./src

# Build TypeScript code
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# -----------------------------
# Stage 2: Production
# -----------------------------
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Add non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built artifacts from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3002

# Create necessary directories with correct permissions
RUN mkdir -p /app/logs && \
    chown -R nodejs:nodejs /app

# Set security configurations
RUN chmod -R 555 /app && \
    chmod -R 444 /app/dist && \
    chmod 644 /app/package.json /app/package-lock.json

# Switch to non-root user
USER nodejs

# Expose service port
EXPOSE 3002

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node dist/healthcheck.js || exit 1

# Set read-only filesystem
RUN chmod a-w /app

# Drop all capabilities and run with minimal privileges
RUN setcap cap_net_bind_service=+ep /usr/local/bin/node

# Start the service
CMD ["node", "dist/app.js"]

# Build-time metadata
LABEL maintainer="Habit Tracker Team" \
      version="1.0.0" \
      description="Habit management microservice for the Habit Tracking application" \
      org.opencontainers.image.source="https://github.com/habit-tracker/habit-service"

# Security scanning
COPY --from=aquasec/trivy:latest /usr/local/bin/trivy /usr/local/bin/trivy
RUN trivy filesystem --no-progress /