# Discord Bot for Railway - High Memory Canvas Deployment
FROM node:18-alpine

# Install full dependencies for Canvas support
RUN apk add --no-cache \
    ffmpeg \
    opus \
    libsodium \
    cairo \
    jpeg \
    pango \
    pixman \
    freetype \
    giflib \
    vips

# Install build dependencies
RUN apk add --no-cache --virtual .build-deps \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    pixman-dev \
    freetype-dev \
    giflib-dev \
    vips-dev \
    python3 \
    make \
    g++ \
    pkgconfig

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies with high memory settings
RUN npm config set fund false && \
    npm config set audit false && \
    NODE_OPTIONS="--max-old-space-size=4096" npm ci --only=production --verbose

# Copy all files
COPY . .

# Build with high memory allocation
RUN NODE_OPTIONS="--max-old-space-size=4096" npm install typescript --no-save && \
    NODE_OPTIONS="--max-old-space-size=4096" npx tsc && \
    npm uninstall typescript

# Clean up build dependencies but keep runtime libs
RUN apk del .build-deps

# Set maximum memory environment for map generation
ENV NODE_ENV=production
ENV RAILWAY=true
ENV SKIP_MAP_GENERATION=false
ENV FORCE_MAP_GENERATION=true
ENV NODE_OPTIONS="--max-old-space-size=7168 --max-semi-space-size=512 --optimize-for-size"

# Create directories
RUN mkdir -p generated_images

# Start
CMD ["npm", "run", "start:railway"]