# Build stage
FROM node:20-alpine AS builder

WORKDIR /app/medusa

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy everything
COPY . .

# Remove node_modules if exists
RUN rm -rf node_modules

# Install dependencies
RUN corepack enable && yarn install --frozen-lockfile

# Set dummy env vars for build
ENV DATABASE_URL=postgres://localhost:5432/medusa \
    STORE_CORS=http://localhost:8000 \
    ADMIN_CORS=http://localhost:9000 \
    AUTH_CORS=http://localhost:9000 \
    JWT_SECRET=build-secret \
    COOKIE_SECRET=build-secret

# Build the application
RUN yarn run build

# Production stage
FROM node:20-alpine

# Coolify build args workaround (https://github.com/coollabsio/coolify/issues/1930)
ARG COOKIE_SECRET
ARG JWT_SECRET
ARG STORE_CORS
ARG ADMIN_CORS
ARG AUTH_CORS
ARG DISABLE_ADMIN
ARG WORKER_MODE
ARG PORT
ARG DATABASE_URL
ARG REDIS_URL
ARG BACKEND_URL
ARG MINIO_ACCESS_KEY
ARG MINIO_SECRET_KEY
ARG MINIO_BUCKET
ARG MINIO_CDN_URL
ARG MINIO_ENDPOINT
ARG MINIO_REGION

WORKDIR /app/medusa

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Create .medusa directory
RUN mkdir -p .medusa

# Copy built application from builder
COPY --from=builder /app/medusa/.medusa ./.medusa

# Change to server directory
WORKDIR /app/medusa/.medusa/server

# Install production dependencies
RUN corepack enable && yarn install --production

# Copy migrations script
COPY migrations.sh /app/medusa/.medusa/server/migrations.sh
RUN chmod +x /app/medusa/.medusa/server/migrations.sh

# Set NODE_ENV
ENV NODE_ENV=production

# Expose port
EXPOSE 9000

# Start the server
CMD ["yarn", "run", "start"]
