# Use official Node.js image
FROM node:20-slim

# Install system dependencies for Baileys and media processing
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY . .

# Expose the port (Render/Koyeb usually use 8000 or 10000)
EXPOSE 8000

# Start the application
CMD ["npm", "start"]
