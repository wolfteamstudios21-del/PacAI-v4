FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY client/ ./client/
COPY vite.config.ts ./
COPY tsconfig.json ./
COPY postcss.config.cjs ./
RUN cd client && npm run build

FROM node:20-alpine AS backend
WORKDIR /app
COPY --from=frontend-build /app/dist/public ./dist/public
COPY server/ ./server/
COPY shared/ ./shared/
COPY package*.json ./
COPY drizzle.config.ts ./
COPY tsconfig.json ./
RUN npm ci --only=production
EXPOSE 8080
ENV NODE_ENV=production
CMD ["node", "server/index-prod.js"]
