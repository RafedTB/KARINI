# KARINI

## Running with Docker

Requirements: Docker Desktop with Docker Compose.

```bash
cp .env.example .env
docker compose up --build
```

Stop the stack:

```bash
docker compose down
```

Remove the PostgreSQL volume and all local database data:

```bash
docker compose down -v
```

Application URLs:

- Frontend: http://localhost:3010
- Backend: http://localhost:3002
- Backend health: http://localhost:3002/health
- PostgreSQL: localhost:5432
