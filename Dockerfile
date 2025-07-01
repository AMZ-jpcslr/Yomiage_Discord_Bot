# Use Node.js LTS version with minimal dependencies
FROM node:18-alpine

# Update package index and upgrade packages
RUN apk update && apk upgrade

# Install all dependencies in one layer to avoid conflicts
RUN apk add --no-cache \
    build-base \
    python3 \
    make \
    g++ \
    pkg-config \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    pixman-dev \
    fontconfig \
    ttf-dejavu \
    freetype-dev \
    harfbuzz-dev \
    fribidi-dev \
    glib-dev

# Try to install optional packages (ignore if not available)
RUN apk add --no-cache librsvg-dev || true
RUN apk add --no-cache vips-dev || true

# Clean up package cache
RUN rm -rf /var/cache/apk/* /tmp/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Set npm configuration for Canvas
ENV CANVAS_PREBUILT=false
ENV npm_config_build_from_source=true
ENV npm_config_canvas_prebuilt=false

# Install dependencies with verbose logging
RUN npm ci --only=production --verbose

# Rebuild Canvas specifically to ensure it's properly built
RUN npm rebuild canvas --build-from-source --verbose

# Copy source code and build files
COPY . .

# Compile TypeScript
RUN npm run compile

# Create directories for generated images
RUN mkdir -p /app/generated_images && \
    mkdir -p /app/generated_maps

# Set environment variables for production
ENV NODE_ENV=production
# Enable Canvas map generation for Railway
ENV FORCE_MAP_GENERATION=true
ENV SKIP_MAP_GENERATION=false

# Expose port (if needed for health checks)
EXPOSE 3000

# Start the bot
CMD ["npm", "run", "start:prod"]
