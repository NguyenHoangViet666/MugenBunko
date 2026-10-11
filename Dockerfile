FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY server/package*.json ./server/
RUN npm ci && npm ci --prefix server
COPY . .
RUN npm run build && npm run build --prefix server

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=5000
COPY server/package*.json ./server/
RUN npm ci --omit=dev --prefix server && npm cache clean --force
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/server/dist ./server/dist
COPY --from=builder --chown=node:node /app/server/schema.sql ./server/schema.sql
RUN mkdir -p /app/server/dist/uploads && chown -R node:node /app/server/dist/uploads
USER node
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:5000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/dist/server.js"]
