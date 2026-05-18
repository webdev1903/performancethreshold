# ---- base: shared deps ----
FROM node:22-alpine AS base
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund

# ---- dev: used by docker-compose for local dev ----
FROM base AS dev
COPY . .
EXPOSE 4321
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ---- build: produces /app/dist ----
FROM base AS build
ENV NODE_ENV=production
COPY . .
RUN npm run build

# ---- runner: production image (zero npm deps at runtime) ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
COPY --from=build /app/dist ./dist
COPY server.mjs ./
EXPOSE 8080
CMD ["node", "server.mjs"]
