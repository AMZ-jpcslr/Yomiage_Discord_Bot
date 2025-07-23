# Discord Bot for Railway Deployment
FROM node:18-alpine

# Install ffmpeg for VoiceVox functionality
RUN apk add --no-cache \
    ffmpeg \
    opus \
    libsodium

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm config set fund false && \
    npm config set audit false && \
    npm ci --only=production

# Copy all files
COPY . .

# Build TypeScript
RUN npm install typescript --no-save && \
    npx tsc && \
    npm uninstall typescript

# Set environment variables
ENV NODE_ENV=production

# Start
CMD ["npm", "start"]