FROM node:20-alpine AS builder
WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm ci

# Copy sources and build
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy package.json dla instalacji prod deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built app z builder
COPY --from=builder /app/.next /app/.next
COPY --from=builder /app/public /app/public
COPY --from=builder /app/lib /app/lib
COPY --from=builder /app/server.js /app/server.js

EXPOSE 3000
CMD ["node", "server.js"]
