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

RUN npx prisma generate

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
# Start the server
# Apply any pending Prisma migrations to the (production) database first,
# then boot. `migrate deploy` is idempotent — it only runs migrations not yet
# recorded in the DB's _prisma_migrations table, and no-ops when up to date.
# ------------------------------
CMD ["sh", "-c", "npx prisma migrate deploy || echo '⚠️ prisma migrate deploy failed — starting server anyway'; node build/server.js"]