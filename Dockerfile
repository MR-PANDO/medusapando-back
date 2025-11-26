# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
COPY .yarnrc.yml* ./

# Install dependencies
RUN corepack enable && \
    if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm install --frozen-lockfile; \
    else npm install; fi

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install dependencies for native modules (needed at runtime)
RUN apk add --no-cache python3 make g++

# Create non-root user
RUN addgroup --system --gid 1001 medusa && \
    adduser --system --uid 1001 medusa

# Copy package files
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
COPY .yarnrc.yml* ./

# Install production dependencies only
RUN corepack enable && \
    if [ -f yarn.lock ]; then yarn install --frozen-lockfile --production; \
    elif [ -f package-lock.json ]; then npm ci --only=production; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm install --frozen-lockfile --prod; \
    else npm install --only=production; fi

# Copy built application from builder
COPY --from=builder /app/.medusa ./.medusa

# Copy medusa-config and other necessary files
COPY medusa-config.ts ./
COPY tsconfig.json ./

# Set ownership
RUN chown -R medusa:medusa /app

USER medusa

# Expose port
EXPOSE 9000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:9000/health || exit 1

# Start the server
CMD ["npm", "run", "start"]
