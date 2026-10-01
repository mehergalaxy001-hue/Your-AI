# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci

# ---- Development: Vite (5173) + Express API (3001) with hot reload ----
FROM deps AS dev
COPY . .
ENV NODE_ENV=development
EXPOSE 5173
CMD ["npm", "run", "dev"]

# ---- Build ----
FROM deps AS build
COPY . .
RUN npm run build && npm prune --omit=dev

# ---- Production: Express serves the API and the built frontend ----
FROM node:22-bookworm-slim AS prod
WORKDIR /app
ENV NODE_ENV=production PORT=3001 STATIC_DIR=/app/frontend/dist
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/package.json ./backend/
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/frontend/dist ./frontend/dist
USER node
EXPOSE 3001
CMD ["node", "backend/dist/server.js"]
