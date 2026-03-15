# Dockerfile for the backend (Express + Node)
# Build a minimal image suitable for production.

FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy source
COPY . .

# Backend listens on PORT (default 5000)
EXPOSE 5000

CMD ["node", "server.js"]
