# Use Node.js LTS version with minimal dependencies
FROM node:18-alpine

# Install system dependencies needed for Sharp, Canvas and image processing
RUN apk add --no-cache \
    vips-dev \
    build-base \
    python3 \
    make \
    g++ \
    libc6-compat \
    fontconfig \
    ttf-dejavu \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev \
    pixman-dev \
    pkg-config

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies and rebuild Canvas
RUN npm ci --only=production && \
    npm rebuild canvas --build-from-source

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
# Canvas specific settings
ENV CANVAS_PREBUILT=false

# Expose port (if needed for health checks)
EXPOSE 3000

# Start the bot
CMD ["npm", "run", "start:prod"]
