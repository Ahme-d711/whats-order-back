# Docker deployment

## Image design

The Dockerfile uses these stages:

- `development-dependencies`: deterministic `npm ci` installation used only
  for compilation and Prisma tooling.
- `builder`: generates Prisma Client and compiles the NestJS application.
- `production-dependencies`: installs production dependencies without running
  package lifecycle scripts.
- `migrator`: a non-root, one-shot image containing Prisma CLI and migrations.
- `runtime`: the default minimal, non-root application image. It contains the
  compiled JavaScript, static public assets, production dependencies, generated
  Prisma Client, and migration metadata, but no TypeScript source or dev tools.

The runtime starts Node directly as PID 1 and uses Nest shutdown hooks for
SIGTERM/SIGINT. Compose also enables a small init process for child reaping.

## Local or integration deployment

Copy the safe template and replace every sample value:

```bash
cp .env.docker.example .env
docker compose build
docker compose up -d
docker compose ps
curl --fail http://localhost:3000/api/health
```

PostgreSQL is reachable only on the private Compose network. The one-shot
`migrate` service waits for PostgreSQL, runs `prisma migrate deploy`, and
must complete successfully before `backend` starts.

Stop the stack without deleting database data:

```bash
docker compose down
```

Delete the named database volume only when data removal is intentional:

```bash
docker compose down --volumes
```

## Production workflow without Compose

Build both targets from the same Dockerfile:

```bash
docker build --target migrator -t registry.example.com/attendance-migrator:TAG .
docker build --target runtime -t registry.example.com/attendance-backend:TAG .
```

Run exactly one migration job during deployment:

```bash
docker run --rm \
  --env DATABASE_URL="$DATABASE_URL" \
  registry.example.com/attendance-migrator:TAG
```

Start application replicas only after that job succeeds:

```bash
docker run -d \
  --name attendance-backend \
  --init \
  --read-only \
  --tmpfs /tmp \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  --env DATABASE_URL="$DATABASE_URL" \
  --env NODE_ENV=production \
  --env PORT=3000 \
  --env CORS_ORIGINS="$CORS_ORIGINS" \
  --publish 3000:3000 \
  registry.example.com/attendance-backend:TAG
```

Never run `prisma migrate dev` in deployment. Migration failure must stop the
release before new application containers are started.

## Operational checks

```bash
docker inspect --format '{{.Config.User}}' attendance-backend
docker inspect --format '{{.State.Health.Status}}' attendance-backend
docker exec attendance-backend id
docker exec attendance-backend test ! -e /app/.env
docker exec attendance-backend test -d /app/node_modules/.prisma
docker stop --time 15 attendance-backend
```

The readiness endpoint is `GET /api/health`. It is intentionally inexpensive;
Prisma establishes its database connection during application startup.
