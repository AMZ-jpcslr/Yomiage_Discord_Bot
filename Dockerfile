# Discord Bot for Railway Deployment - Multi-stage build
# Stage 1: Build stage
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache --virtual .build-deps \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    python3 \
    make \
    g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci --silent

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./

# Build TypeScript
RUN npx tsc -p .

# Stage 2: Production stage
FROM node:18-alpine

# Install essential packages first
RUN apk add --no-cache \
    ffmpeg \
    cairo \
    jpeg \
    pango \
    giflib \
    pixman \
    libjpeg-turbo \
    freetype \
    opus-dev \
    libsodium-dev

WORKDIR /app

# Set memory optimization environment variables
ENV NODE_OPTIONS="--max-old-space-size=1024 --optimize-for-size"
ENV SHARP_IGNORE_GLOBAL_LIBVIPS=1
ENV SHARP_FORCE_GLOBAL_LIBVIPS=false
ENV NPM_CONFIG_LOGLEVEL=error

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm config set fund false && \
    npm config set audit false && \
    npm config set progress false && \
    npm ci --only=production --no-optional --prefer-offline --silent

# Copy built application from builder stage
COPY --from=builder /app/build ./build

# Copy configuration files
COPY scripts/ ./scripts/
COPY config/ ./config/
COPY data/ ./data/

# Create directory for generated images
RUN mkdir -p generated_images

# Clean up cache
RUN npm cache clean --force && \
    rm -rf /tmp/* /var/cache/apk/*

# Expose port (Railway will set PORT environment variable)
EXPOSE $PORT

# Set environment variables
ENV NODE_ENV=production
ENV RAILWAY=true

# Start the application
CMD ["npm", "run", "start:railway"]