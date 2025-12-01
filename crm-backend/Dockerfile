# ------------------------------
# 1. Base Image
# ------------------------------
FROM node:22-alpine AS base

WORKDIR /app

# Install openssl (needed for Prisma)
RUN apk add --no-cache openssl

# ------------------------------
# 2. Install dependencies
# ------------------------------
FROM base AS deps

COPY package.json package-lock.json ./
RUN npm install --production=false

# ------------------------------
# 3. Build the app
# ------------------------------
FROM deps AS build

COPY . .
RUN npm run build

# ------------------------------
# 4. Production image
# ------------------------------
FROM node:22-alpine AS prod

WORKDIR /app

# Install openssl for Prisma
RUN apk add --no-cache openssl

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma ./prisma

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# ------------------------------
# Prisma: generate client on container
# ------------------------------
RUN npx prisma generate

# ------------------------------
# Start the server
# ------------------------------
CMD ["node", "build/server.js"]