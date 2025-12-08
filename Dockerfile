# PacAI v5.3 - Production Dockerfile for Fly.io
# Multi-stage build optimized for enterprise deployment

FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDeps for build)
RUN npm ci

# Copy source files
COPY . .

# Use existing npm run build which handles client + server correctly
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Copy built assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/shared ./shared

# Production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Security: non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S pacai -u 1001
USER pacai

EXPOSE 8080

# Health check for Fly.io
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/v5/health || exit 1

CMD ["node", "dist/index.js"]
