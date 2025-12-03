# Build stage
# Force rebuild: 2025-11-30-retry
FROM node:20-alpine AS builder

WORKDIR /app/medusa

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy everything
COPY . .

# Remove node_modules if exists
RUN rm -rf node_modules

# Install dependencies
RUN npm ci

# Set dummy env vars for build
ENV DATABASE_URL=postgres://localhost:5432/medusa \
    STORE_CORS=http://localhost:8000 \
    ADMIN_CORS=http://localhost:9000 \
    AUTH_CORS=http://localhost:9000 \
    JWT_SECRET=build-secret \
    COOKIE_SECRET=build-secret

# Increase Node memory for admin build
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Build the application
RUN npm run build

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
ARG STOREFRONT_URL
ARG MEILISEARCH_HOST
ARG MEILISEARCH_API_KEY

# Convert ARGs to ENV vars for runtime
ENV COOKIE_SECRET=$COOKIE_SECRET \
    JWT_SECRET=$JWT_SECRET \
    STORE_CORS=$STORE_CORS \
    ADMIN_CORS=$ADMIN_CORS \
    AUTH_CORS=$AUTH_CORS \
    DISABLE_ADMIN=$DISABLE_ADMIN \
    WORKER_MODE=$WORKER_MODE \
    PORT=$PORT \
    DATABASE_URL=$DATABASE_URL \
    REDIS_URL=$REDIS_URL \
    BACKEND_URL=$BACKEND_URL \
    MINIO_ACCESS_KEY=$MINIO_ACCESS_KEY \
    MINIO_SECRET_KEY=$MINIO_SECRET_KEY \
    MINIO_BUCKET=$MINIO_BUCKET \
    MINIO_CDN_URL=$MINIO_CDN_URL \
    MINIO_ENDPOINT=$MINIO_ENDPOINT \
    MINIO_REGION=$MINIO_REGION \
    STOREFRONT_URL=$STOREFRONT_URL \
    MEILISEARCH_HOST=$MEILISEARCH_HOST \
    MEILISEARCH_API_KEY=$MEILISEARCH_API_KEY

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
RUN npm ci --omit=dev

# Copy migrations script
COPY migrations.sh /app/medusa/.medusa/server/migrations.sh
RUN chmod +x /app/medusa/.medusa/server/migrations.sh

# Set NODE_ENV
ENV NODE_ENV=production

# Expose port
EXPOSE 9000

# Run migrations and start the server
ENTRYPOINT ["/app/medusa/.medusa/server/migrations.sh"]
CMD ["npm", "run", "start"]
