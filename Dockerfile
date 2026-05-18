# syntax=docker/dockerfile:1.7

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

# ---- runner: production image ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g serve@14
COPY --from=build /app/dist ./dist
EXPOSE 4321
CMD ["sh", "-c", "serve dist -l tcp://0.0.0.0:${PORT:-4321}"]
