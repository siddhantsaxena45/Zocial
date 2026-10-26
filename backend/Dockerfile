FROM node:20-bullseye-slim

# Set working directory inside container
WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy backend source code
COPY . ./

# Expose backend server port
EXPOSE 8000

# Security: Run as non-root user
USER node

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:8000/api/v1/ping').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start the Node.js Express Server
CMD ["node", "index.js"]
