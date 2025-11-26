# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
COPY .yarnrc.yml* ./

# Install ALL dependencies (including dev for build)
RUN corepack enable && \
    if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm install --frozen-lockfile; \
    else npm install; fi

# Copy source code
COPY . .

# Set dummy env vars for build (real values come from Coolify at runtime)
ENV DATABASE_URL=postgres://localhost:5432/medusa \
    STORE_CORS=http://localhost:8000 \
    ADMIN_CORS=http://localhost:9000 \
    AUTH_CORS=http://localhost:9000 \
    JWT_SECRET=build-secret \
    COOKIE_SECRET=build-secret

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

# Install dependencies for native modules (needed at runtime)
RUN apk add --no-cache python3 make g++

# Create non-root user
RUN addgroup --system --gid 1001 medusa && \
    adduser --system --uid 1001 medusa

# Set working directory to the built server
WORKDIR /app/.medusa/server

# Copy the ENTIRE app from builder (we need node_modules too)
COPY --from=builder /app /app

# Set NODE_ENV to production
ENV NODE_ENV=production

# Set ownership
RUN chown -R medusa:medusa /app

USER medusa

# Expose port
EXPOSE 9000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-9000}/health || exit 1

# Start the server - run from .medusa/server directory
CMD ["npm", "run", "start"]
