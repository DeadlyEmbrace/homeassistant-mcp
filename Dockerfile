# Use Node.js 20 as the base image
FROM node:20-slim

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including devDependencies for building)
RUN npm ci || npm install

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Expose the port the app runs on (default 4000, configurable via PORT env var)
ARG PORT=4000
ENV PORT=${PORT}
EXPOSE ${PORT}

# Start the application
CMD ["node", "dist/src/index.js"] 