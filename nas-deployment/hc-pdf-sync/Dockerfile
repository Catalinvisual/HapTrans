FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install production dependencies
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

# Copy worker application
COPY hc-pdf-sync.js ./

# Default command
CMD ["node", "hc-pdf-sync.js"]
