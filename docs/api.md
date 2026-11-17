# API usage

All API responses use `{ "success": true, "data": ... }`; failures use `{ "success": false, "error": "..." }`.

Register with `POST /api/auth/register` using `{ "name", "email", "password" }`. Login accepts `{ "email", "password" }`. Use the returned token as `Authorization: Bearer <token>`.

`POST /api/jobs` accepts a name, one of `email|report|notification|default`, object payload, optional priority, `maxAttempts` (1–10), and a future `scheduledAt` timestamp. Lists support `page`, `limit`, `status`, `priority`, and `type`. Users only see their own jobs; admins see all jobs.

Admins can fetch BullMQ counts from `GET /api/queues`, registered worker heartbeats from `GET /api/workers`, and application metrics from `GET /api/metrics`.

Swagger UI is available at `/api-docs`; expand its `paths` section as endpoints evolve.
