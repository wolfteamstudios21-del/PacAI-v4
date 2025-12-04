FROM node:20-bullseye-slim

WORKDIR /app

# Install zip for bundling
RUN apt-get update && apt-get install -y zip && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --production

COPY . .
ENV NODE_ENV=production

CMD ["node", "--loader", "ts-node/esm", "src/worker.ts"]
