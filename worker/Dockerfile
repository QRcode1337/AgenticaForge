# ── Build stage: compile TS → JS ──────────────────────────────────
FROM node:22-slim AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# ── Runtime stage: prod deps only ─────────────────────────────────
FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

CMD ["node", "dist/index.js"]
