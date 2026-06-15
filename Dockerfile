# Step 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package configurations for root and server
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies for both frontend and backend
RUN npm install
RUN npm install --prefix server

# Copy the rest of the application source code
COPY . .

# Build Vite frontend (outputs to /app/dist)
RUN npm run build

# Build Express backend (outputs to /app/server/dist)
RUN npm run build --prefix server

# Step 2: Production runtime stage
FROM node:20-alpine

WORKDIR /app

# Copy package configurations
COPY package*.json ./
COPY server/package*.json ./server/

# Install only production dependencies
RUN npm install --only=production
RUN npm install --only=production --prefix server

# Copy build output from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server/dist ./server/dist

# Copy non-compiled JS utility files, DB schema and migration scripts
COPY --from=builder /app/server/*.js ./server/
COPY --from=builder /app/server/*.sql ./server/

# Expose backend port
EXPOSE 5000

ENV PORT=5000
ENV NODE_ENV=production

# Start Express server (serves API and front-end static files)
CMD ["node", "server/dist/server.js"]
