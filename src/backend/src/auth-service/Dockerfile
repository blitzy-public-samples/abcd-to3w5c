# Stage 1: Builder
FROM node:18-alpine AS builder
# v18.x for Node.js base image

# Set working directory
WORKDIR /app

# Install build dependencies and Python for node-gyp
RUN apk add --no-cache python3 make g++ \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies with exact versions
RUN npm ci --only=production \
    && npm cache clean --force

# Copy source code
COPY . .

# Build TypeScript application
RUN npm run build

# Remove dev dependencies and source code
RUN npm prune --production

# Stage 2: Production
FROM node:18-alpine
# v18.x for Node.js runtime

# Install security updates and curl for healthcheck
RUN apk add --no-cache curl \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -S nodejs && adduser -S nodejs -G nodejs

# Set working directory
WORKDIR /app

# Copy built artifacts from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json

# Set secure permissions
RUN chmod -R 550 /app/dist \
    && chmod -R 550 /app/node_modules \
    && chmod 550 /app/package.json

# Configure environment
ENV NODE_ENV=production \
    PORT=3001 \
    USER=nodejs

# Expose service port
EXPOSE 3001

# Switch to non-root user
USER nodejs

# Health check configuration
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Start application
CMD ["node", "dist/index.js"]