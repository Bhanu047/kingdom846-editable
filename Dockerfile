# --- Build stage ---
FROM node:20-bookworm-slim AS build
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Runtime stage ---
FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
# Copy built native modules (better-sqlite3) from the build stage — same base image, so the binary is compatible
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY server ./server
COPY package.json ./
EXPOSE 5000
ENV PORT=5000
# Persistent volume mount point — mount a cloud volume at /data so the SQLite DB survives restarts
ENV DB_PATH=/data/data.db
CMD ["node", "server/index.cjs"]
