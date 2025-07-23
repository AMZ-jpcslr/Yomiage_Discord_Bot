# Discord Bot for Railway Deployment
FROM node:18-alpine

# Install canvas dependencies and FFmpeg for Alpine Linux with minimal packages
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
    g++ \
    vips-dev && \
    apk add --no-cache \
    ffmpeg \
    opus-dev \
    libsodium-dev \
    cairo \
    jpeg \
    pango \
    giflib \
    pixman \
    libjpeg-turbo \
    freetype \
    vips

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
    npm ci --only=production --no-optional --prefer-offline

# Copy source code and pre-built files
COPY src/ ./src/
COPY build/ ./build/
COPY tsconfig.json ./
COPY scripts/ ./scripts/
COPY config/ ./config/
COPY data/ ./data/

# Only build if build directory doesn't exist or is incomplete
RUN if [ ! -d "./build" ] || [ ! -f "./build/main.js" ]; then \
        echo "Building TypeScript..."; \
        npm install typescript --no-save --prefer-offline && \
        npx tsc -p . && \
        npm uninstall typescript; \
    else \
        echo "Using pre-built files"; \
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