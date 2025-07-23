# Discord Bot for Railway - Fallback Dockerfile (Nixpacks preferred)
FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache \
    ffmpeg \
    cairo \
    jpeg \
    pango \
    pixman \
    freetype \
    opus \
    libsodium \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    pixman-dev \
    freetype-dev \
    python3 \
    make \
    g++ \
    pkgconfig

WORKDIR /app

# Copy package files
COPY package*.json ./

# Simple install - if this fails, use Nixpacks instead
RUN npm ci --only=production --verbose

# Copy all files
COPY . .

# Try to build if needed
RUN npm run build || echo "Build failed - will rely on existing build/"

# Set environment
ENV NODE_ENV=production
ENV RAILWAY=true
ENV NODE_OPTIONS="--max-old-space-size=512"

# Create directories
RUN mkdir -p generated_images

# Start
CMD ["npm", "run", "start:railway"]