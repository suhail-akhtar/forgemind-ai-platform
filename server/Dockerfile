FROM node:20-slim

WORKDIR /app

# Install dependencies first (for better caching)
COPY package*.json ./
RUN npm install

# Copy source files
COPY . .

# Build TypeScript files
RUN npm run build

# Expose the port
EXPOSE 3000

# Start the server
CMD ["node", "dist/app.js"]