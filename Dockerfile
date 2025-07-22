# Discord Bot for Railway Deployment
FROM node:18-alpine

# Install canvas dependencies for Alpine Linux
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
    g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./
COPY scripts/ ./scripts/
COPY config/ ./config/
COPY data/ ./data/

# Build the application
RUN npm run build

# Create directory for generated images
RUN mkdir -p generated_images

# Expose port (Railway will set PORT environment variable)
EXPOSE $PORT

# Set environment variables
ENV NODE_ENV=production
ENV RAILWAY=true

# Start the application
CMD ["npm", "run", "start:railway"]