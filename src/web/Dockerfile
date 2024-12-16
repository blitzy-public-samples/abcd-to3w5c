# Stage 1: Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Install dependencies first (caching layer)
COPY package*.json ./
RUN npm ci --only=production \
    && npm cache clean --force

# Copy source code and configuration
COPY . .
COPY .env.production .env

# Build production bundle with optimizations
RUN npm run build \
    && npm run generate-sw \
    # Verify build artifacts
    && test -d dist

# Stage 2: Production stage
FROM nginx:alpine

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create nginx user and group with non-root privileges
RUN addgroup -g 101 -S nginx \
    && adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx nginx \
    # Clean up unnecessary files
    && rm -rf /usr/share/nginx/html/* \
    && rm -rf /var/cache/apk/*

# Copy built assets from builder stage
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html

# Configure security headers and compression
RUN echo 'gzip on;\n\
gzip_vary on;\n\
gzip_min_length 10240;\n\
gzip_proxied expired no-cache no-store private auth;\n\
gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript;\n\
gzip_disable "MSIE [1-6]\.";\n' > /etc/nginx/conf.d/gzip.conf

# Security headers configuration
RUN echo 'add_header X-Frame-Options "DENY" always;\n\
add_header X-Content-Type-Options "nosniff" always;\n\
add_header X-XSS-Protection "1; mode=block" always;\n\
add_header Referrer-Policy "strict-origin-when-cross-origin" always;\n\
add_header Content-Security-Policy "default-src '\''self'\''; script-src '\''self'\'' '\''unsafe-inline'\'' '\''unsafe-eval'\''; style-src '\''self'\'' '\''unsafe-inline'\''; img-src '\''self'\'' data: https:; font-src '\''self'\'' data: https:;" always;\n\
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;\n' > /etc/nginx/conf.d/security-headers.conf

# Set proper permissions
RUN chown -R nginx:nginx /var/cache/nginx \
    && chown -R nginx:nginx /var/log/nginx \
    && chown -R nginx:nginx /etc/nginx/conf.d \
    && touch /var/run/nginx.pid \
    && chown -R nginx:nginx /var/run/nginx.pid

# Switch to non-root user
USER nginx

# Configure environment
ENV NGINX_PORT=8080

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:8080/health || exit 1

# Use exec form for better signal handling
CMD ["nginx", "-g", "daemon off;"]

# Build arguments for runtime configuration
ARG VITE_API_BASE_URL
ARG VITE_AUTH0_DOMAIN

# Labels for container metadata
LABEL maintainer="Habit Tracker Team" \
      version="1.0" \
      description="Habit Tracker Progressive Web Application" \
      org.opencontainers.image.source="https://github.com/habit-tracker/web"