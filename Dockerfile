# Discord Bot for Railway Deployment
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

# Install build dependencies in separate layer
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

# Set working directory
WORKDIR /app

# Set memory optimization environment variables
ENV NODE_OPTIONS="--max-old-space-size=1024 --optimize-for-size"
ENV SHARP_IGNORE_GLOBAL_LIBVIPS=1
ENV SHARP_FORCE_GLOBAL_LIBVIPS=false
ENV NPM_CONFIG_LOGLEVEL=error

# Copy package files
COPY package*.json ./

# Install dependencies with memory optimization
RUN npm config set fund false && \
    npm config set audit false && \
    npm config set progress false && \
    npm ci --only=production --no-optional --prefer-offline --silent

# Copy source code and configuration files
COPY src/ ./src/
COPY tsconfig.json ./
COPY scripts/ ./scripts/
COPY config/ ./config/
COPY data/ ./data/

# Copy build directory if it exists, otherwise prepare for building
COPY build/ ./build/
RUN if [ -f "./build/main.js" ]; then \
        echo "✅ Using pre-built files"; \
    else \
        echo "📦 Building TypeScript in container..."; \
        npm install typescript@5.8.3 --no-save --prefer-offline && \
        npx tsc -p . && \
        npm uninstall typescript; \
    fi

# Create directory for generated images
RUN mkdir -p generated_images

# Clean up build dependencies to reduce image size
RUN apk del .build-deps && \
    npm cache clean --force && \
    rm -rf /tmp/* /var/cache/apk/*

# Expose port (Railway will set PORT environment variable)
EXPOSE $PORT

# Set environment variables
ENV NODE_ENV=production
ENV RAILWAY=true

# Start the application
CMD ["npm", "run", "start:railway"]