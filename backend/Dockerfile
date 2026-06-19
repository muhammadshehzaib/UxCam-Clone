# NOTE: build context is the repo ROOT (see docker-compose.yml) so this image can
# also build the browser SDK bundle from sdk/.

# ── Stage 1: build the browser SDK bundle from source ───────────────────────────
# Runs `npm run bundle` on every image build, so the sdk.js the API serves is
# always fresh. A stale hand-built sdk/dist/ is exactly what made session replays
# show clicks only (no screen) — baking the build in removes that failure mode.
FROM node:20-alpine AS sdk-build
WORKDIR /sdk
COPY sdk/package*.json ./
RUN npm ci
COPY sdk/ ./
RUN npm run bundle    # -> /sdk/dist/uxclone-sdk.js

# ── Stage 2: API server ─────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Install backend deps
COPY backend/package*.json ./
RUN npm install

# Copy backend source
COPY backend/ .

# Bake the freshly built SDK bundle in at a stable path. It lives OUTSIDE /app so
# the dev bind-mount (./backend:/app in docker-compose) can't hide it. Served by
# GET /sdk.js (see backend/src/app.ts).
COPY --from=sdk-build /sdk/dist/uxclone-sdk.js /sdk/uxclone-sdk.js

# Expose the API port
EXPOSE 3001

# Run migrations and then start the backend in dev mode
CMD npm run migrate && npm run dev
