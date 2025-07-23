# Discord Bot for Railway - Simplified Deployment
FROM node:18-alpine

# Install minimal runtime dependencies
RUN apk add --no-cache \
    ffmpeg \
    cairo \
    jpeg \
    pango \
    pixman \
    freetype \
    opus \
    libsodium

# Install build dependencies for canvas (will be removed later)
RUN apk add --no-cache --virtual .build-deps \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    pixman-dev \
    freetype-dev \
    python3 \
    make \
    g++ \
    npm

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (Railway has better memory management)
RUN npm install --production --silent

# Copy source and config files (Railway will handle TypeScript build)
COPY . .

# Build TypeScript if needed
RUN if [ ! -d "build" ] || [ ! -f "build/main.js" ]; then \
        npm install typescript --no-save && \
        npx tsc && \
        npm uninstall typescript; \
    fi

# Clean up build dependencies
RUN apk del .build-deps && \
    npm cache clean --force

# Create required directories
RUN mkdir -p generated_images

# Set environment variables
ENV NODE_ENV=production
ENV RAILWAY=true
ENV NODE_OPTIONS="--max-old-space-size=512"

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "run", "start:railway"]