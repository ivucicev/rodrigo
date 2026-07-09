FROM node:20-bullseye-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-bullseye-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm install --omit=dev && npm rebuild better-sqlite3
COPY --from=build /app/dist ./dist

ENV PORT=4000
ENV DB_PATH=/data/pool.sqlite3
VOLUME ["/data"]
EXPOSE 4000

CMD ["node", "dist/index.js"]
