# Stage 1: Build the frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/client
COPY apps/stock-manager-client/package*.json ./
RUN npm install
COPY apps/stock-manager-client/ ./
RUN npm run build

# Stage 2: Run the production application
FROM node:20-slim
WORKDIR /app

# Install build tools to compile native modules (sqlite3) from source
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package configurations and install production dependencies
COPY apps/stock-manager-server/package*.json ./server/
WORKDIR /app/server
RUN npm install --only=production --build-from-source

# Copy server code
COPY apps/stock-manager-server/ ./

# Copy compiled static frontend assets
COPY --from=frontend-builder /app/client/dist /app/stock-manager-client/dist

# Expose backend server port
EXPOSE 5001

# Keep mutable database and uploads outside the image.
RUN mkdir -p /app/data/uploads
ENV DATABASE_PATH=/app/data/stock.db
ENV UPLOADS_PATH=/app/data/uploads

# Start the Node.js server
CMD ["node", "src/server.js"]
