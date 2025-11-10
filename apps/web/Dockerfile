# Development Dockerfile for Next.js web app

FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy dependency files
COPY package.json package-lock.json* pnpm-lock.yaml* ./

# Install dependencies
RUN npm ci || (npm install -g pnpm && pnpm install)

# Copy all source files
COPY . .

# Expose port for Next.js dev server
EXPOSE 3000

# Start development server (hot reload)
CMD ["npm", "run", "dev"]
