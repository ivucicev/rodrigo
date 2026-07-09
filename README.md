# Rodrigo

Pool water chemistry & maintenance tracker. React + TypeScript + Tailwind frontend, Express + better-sqlite3 backend.

## Features

- Active water chemistry dashboard (pH, Free Chlorine, Total Alkalinity) with live status gauges and a metric/imperial toggle
- Dynamic dosage recipes calculated from your own chemical inventory — add whatever products you actually have (any brand, form, and strength) in Settings
- Sequenced 5-phase maintenance checklist with recurring chores that reset on their own schedule (skim, empty baskets, vacuum, brush, backwash, filter check)
- Water test history log

## Project layout

- `client/` — Vite + React 18 + TypeScript + Tailwind frontend
- `server/` — Express + better-sqlite3 API

## Development

```bash
npm install
npm run dev
```

- Client: http://localhost:5173
- Server API: http://localhost:4000

Data is stored in `server/pool.sqlite3` (created automatically, gitignored).

## Deployment

### Option A: build locally with Docker Compose

```bash
docker compose up -d --build
```

- App: http://localhost:8080
- The API is proxied through nginx at `/api`.
- Data persists in the `pool-data` Docker volume (sqlite file at `/data/pool.sqlite3` inside the server container).

Stop with `docker compose down`.

### Option B: pull prebuilt images from GHCR

Every push to `main` builds and publishes both images via [`.github/workflows/docker-publish.yml`](.github/workflows/docker-publish.yml):

- `ghcr.io/ivucicev/rodrigo-server:latest`
- `ghcr.io/ivucicev/rodrigo-client:latest`

Point `docker-compose.yml`'s `build:` keys at these images instead (replace `build: ./server` with `image: ghcr.io/ivucicev/rodrigo-server:latest`, same for `client`) to deploy without building on the target machine, then `docker compose up -d`.
