# Rodrigo

Pool water chemistry & maintenance tracker. React + TypeScript + Tailwind frontend, Express + better-sqlite3 backend.

## Development

```bash
npm install
npm run dev
```

- Client: http://localhost:5173
- Server API: http://localhost:4000

## Deployment (Docker)

```bash
docker compose up -d --build
```

- App: http://localhost:8080
- The API is proxied through nginx at `/api`.
- Data persists in the `pool-data` Docker volume (sqlite file at `/data/pool.sqlite3` inside the server container).

To stop:

```bash
docker compose down
```
