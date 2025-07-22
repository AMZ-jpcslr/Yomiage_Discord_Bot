# Discord Bot for Railway Deployment
FROM node:18-alpine

# Install canvas dependencies and FFmpeg for Alpine Linux
RUN apk add --no-cache \
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
    ffmpeg \
    opus-dev \
    libsodium-dev

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./
COPY scripts/ ./scripts/
COPY config/ ./config/
COPY data/ ./data/

# Build the application
RUN npm run build

# Remove devDependencies after build
RUN npm ci --only=production && npm cache clean --force

# Create directory for generated images
RUN mkdir -p generated_images

# Expose port (Railway will set PORT environment variable)
EXPOSE $PORT

# Set environment variables
ENV NODE_ENV=production
ENV RAILWAY=true

# Start the application
CMD ["npm", "run", "start:railway"]