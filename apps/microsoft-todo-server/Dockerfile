# Stage 1: Build the frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/todo-shared ./packages/todo-shared
COPY apps/microsoft-todo-client ./apps/microsoft-todo-client
RUN corepack enable && pnpm install --filter @shared/todo --filter microsoft-todo-frontend
RUN pnpm --filter @shared/todo build && pnpm --filter microsoft-todo-frontend build

# Stage 2: Build the backend
FROM node:20-slim AS backend-builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/todo-shared ./packages/todo-shared
COPY apps/microsoft-todo-server ./apps/microsoft-todo-server
RUN corepack enable && pnpm install --filter @shared/todo --filter microsoft-todo-backend
RUN pnpm --filter @shared/todo build && pnpm --filter microsoft-todo-backend build

# Stage 3: Run the production application
FROM node:20-slim
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/todo-shared ./packages/todo-shared
COPY apps/microsoft-todo-server/package.json ./apps/microsoft-todo-server/
COPY --from=backend-builder /app/apps/microsoft-todo-server/dist ./apps/microsoft-todo-server/dist

RUN pnpm install --prod --filter @shared/todo --filter microsoft-todo-backend

# Copy compiled static frontend assets
COPY --from=frontend-builder /app/apps/microsoft-todo-client/dist /app/microsoft-todo-client/dist

# Expose backend server port
EXPOSE 5005

# Setup persistent volume directory for SQLite database
RUN mkdir -p /app/data
ENV DATABASE_PATH=/app/data/todo.db

WORKDIR /app/apps/microsoft-todo-server
# Start the Fastify Node.js server
CMD ["node", "dist/server.js"]
