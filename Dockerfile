# Use Node.js as the base image
FROM node:20

# Install dependencies for yt-dlp and ffmpeg
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Manually install the latest yt-dlp binary to /usr/local/bin
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

# Set the working directory
WORKDIR /app

# Copy dependency files and install them
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy the rest of the application code
COPY . .

# Ensure the temp and downloads directories exist
RUN mkdir -p temp downloads session

# Expose port and start the bot
EXPOSE 10000
CMD ["node", "index.js"]
