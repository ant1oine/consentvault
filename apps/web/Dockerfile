# Clean rebuild for Next.js web app

FROM node:20-alpine

# Set working directory
WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy dependency files from repo root (build context is repo root)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/

# Install dependencies for web app only (using workspace filtering)
# Use --no-frozen-lockfile to allow lockfile updates during development
RUN pnpm install --filter @consentvault/web --no-frozen-lockfile

# Copy the rest of the web app
COPY apps/web/ ./apps/web/

# Set working directory to web app
WORKDIR /app/apps/web

# Expose dev port
EXPOSE 3000

# Start Next.js
CMD ["pnpm", "dev"]
