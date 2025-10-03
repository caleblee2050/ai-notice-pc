# Build stage: install deps and export Expo web build
FROM node:20-alpine AS builder
WORKDIR /app

# Install base tools that Expo export may rely on
RUN apk add --no-cache bash git

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy project sources
COPY . .

# Export static web build (Expo)
# Outputs to /app/web-build
RUN npx expo export --platform web --output-dir web-build


# Runtime stage: minimal image serving API + static web
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Copy only runtime deps and outputs
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/server ./server
COPY --from=builder /app/web-build ./web-build

EXPOSE 8080
CMD ["node", "server/index.js"]