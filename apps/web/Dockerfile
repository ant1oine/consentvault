# Clean rebuild for Next.js web app

FROM node:20-alpine

# Set working directory
WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy dependency files first
COPY package.json pnpm-lock.yaml ./

# Install all deps (no workspace references)
RUN pnpm install --frozen-lockfile

# Copy the rest of the app
COPY . .

# Expose dev port
EXPOSE 3000

# Start Next.js
CMD ["pnpm", "dev"]
