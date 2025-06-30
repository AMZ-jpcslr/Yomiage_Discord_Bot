# Use Node.js LTS version with minimal dependencies
FROM node:18-alpine

# Install system dependencies needed for Sharp and image processing
RUN apk add --no-cache \
    vips-dev \
    build-base \
    python3 \
    make \
    g++ \
    libc6-compat

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code and build files
COPY . .

# Create directories for generated maps
RUN mkdir -p /app/generated_maps

# Set environment variables for production
ENV NODE_ENV=production
ENV FONTCONFIG_PATH=/dev/null
ENV FONTCONFIG_FILE=/dev/null

# Expose port (if needed for health checks)
EXPOSE 3000

# Start the bot
CMD ["npm", "run", "start:prod"]
