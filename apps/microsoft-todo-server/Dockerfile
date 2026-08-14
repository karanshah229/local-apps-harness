# Stage 1: Build the frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/client
COPY apps/microsoft-todo-client/package*.json ./
RUN npm install
COPY apps/microsoft-todo-client/ ./
RUN npm run build

# Stage 2: Run the production application
FROM node:20-slim
WORKDIR /app

# Copy package configurations and install production dependencies
COPY apps/microsoft-todo-server/package*.json ./server/
WORKDIR /app/server
RUN npm install --only=production

# Copy server code
COPY apps/microsoft-todo-server/ ./

# Copy compiled static frontend assets
COPY --from=frontend-builder /app/client/dist /app/microsoft-todo-client/dist

# Expose backend server port
EXPOSE 5005

# Setup persistent volume directory for SQLite database
RUN mkdir -p /app/data
ENV DATABASE_PATH=/app/data/todo.db

# Start the Node.js server
CMD ["node", "src/server.js"]
