FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
COPY --from=build /app/build ./build
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/drizzle ./drizzle

# Data volume for SQLite DB + uploads
VOLUME /app/data

ENV NODE_ENV=production
ENV PORT=3000
ENV ORIGIN=http://localhost:3000

EXPOSE 3000
CMD ["node", "build"]
