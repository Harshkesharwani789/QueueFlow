# QueueFlow

QueueFlow moves slow work out of HTTP requests. The API persists a job in PostgreSQL, publishes its ID to a BullMQ queue in Redis, and independent workers execute it later.

## Quick start

1. Copy `.env.example` to `.env` and replace `JWT_SECRET`.
2. Start PostgreSQL and Redis, then run `npm run prisma:migrate` and `npm run prisma:generate`.
3. In separate terminals run `npm run dev` and `npm run dev:worker`.

Docker users can run `docker compose up --build`; the image generates Prisma Client and builds TypeScript internally.

## Main endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Create an account and JWT |
| POST | `/api/auth/login` | Authenticate |
| GET | `/api/auth/me` | Current public user profile |
| POST | `/api/jobs` | Persist and enqueue a job |
| GET | `/api/jobs` | Paginated, filtered job list |
| GET | `/api/jobs/:id` | Job plus attempts and logs |
| POST | `/api/jobs/:id/retry` | Requeue a failed job |
| POST | `/api/jobs/:id/cancel` | Cancel a waiting/delayed job |
| DELETE | `/api/jobs/:id` | Delete a non-executing job |
| GET | `/api/queues`, `/api/workers`, `/api/metrics` | Admin-only queue/worker/metric views |
| GET | `/health` | API, PostgreSQL, and Redis health |

Example request:

```bash
curl -X POST http://localhost:3000/api/jobs \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Welcome","type":"email","payload":{"to":"student@example.com","subject":"Welcome","message":"Hello"},"priority":"HIGH"}'
```

## Important design choices

- PostgreSQL is the durable source of job history; Redis is the delivery mechanism.
- BullMQ priorities map `CRITICAL → 1`, `HIGH → 2`, `NORMAL → 3`, and `LOW → 4` because smaller values run first.
- BullMQ performs exponential retries; workers only record the corresponding database status. This avoids competing retry loops.
- Delivery is **at-least-once**, not exactly-once. Processors must remain idempotent for real external side effects.
- A queue submission failure marks the database job `FAILED` with a log instead of silently losing it.

## Verification

Run `npm run build`, `npm run lint`, and `npm test`. Docker was not executable in this environment, so the full PostgreSQL/Redis integration run still needs to be performed on a Docker-capable host.

Read [architecture.md](docs/architecture.md), [api.md](docs/api.md), [CODE_WALKTHROUGH.md](docs/CODE_WALKTHROUGH.md), and [VIVA_GUIDE.md](docs/VIVA_GUIDE.md) before a presentation.
