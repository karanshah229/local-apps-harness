FROM node:22-alpine AS build
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/tidy-contacts/package.json apps/tidy-contacts/package.json
RUN corepack enable && pnpm install --filter tidy-contacts... --frozen-lockfile
COPY apps/tidy-contacts apps/tidy-contacts
RUN pnpm --filter tidy-contacts build

FROM nginx:1.27-alpine
COPY --from=build /workspace/apps/tidy-contacts/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -q --spider http://127.0.0.1/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
