# Code walkthrough

Use this beside the source during a viva. Comments in the code explain individual decisions; this document explains how files join together.

| File/group | What it does | Key point to say |
| --- | --- | --- |
| `src/config/env.ts` | Parses environment variables with Zod at startup. | Configuration errors fail fast instead of causing a later security or connection bug. |
| `src/config/database.ts` | Creates the shared Prisma client. | One client means one managed database pool per process. |
| `src/config/redis.ts` | Creates the BullMQ-compatible Redis connection. | `maxRetriesPerRequest: null` is required by BullMQ's blocking commands. |
| `src/app.ts` | Builds Express middleware and mounts endpoints. | API construction is separate from `server.ts`, which lets Supertest import it without a real port. |
| `src/server.ts` | Opens the HTTP port and gracefully closes it. | Graceful shutdown stops accepting traffic before connection cleanup. |
| `src/worker.ts` | Starts a worker and refreshes heartbeat data. | Workers are deliberately a separate process from the API. |
| `auth.validation.ts` | Checks registration/login shapes. | Runtime validation protects the API; TypeScript alone cannot validate HTTP JSON. |
| `auth.service.ts` | Hashes passwords, authenticates, and signs JWTs. | It uses a Prisma `select` so password hashes never leave the service. |
| `authenticate.ts` | Verifies Bearer tokens and role access. | Authentication proves identity; authorization decides allowed actions. |
| `job.validation.ts` | Validates create/list/ID requests. | It constrains job types, retry count, and future schedule time. |
| `job.service.ts` | Contains job business rules and ownership checks. | Routes stay thin; service methods decide valid state transitions. |
| `queue.service.ts` | Maps priorities and adds BullMQ jobs. | Application and BullMQ jobs share the same ID for traceability. |
| `worker.manager.ts` | Mirrors worker lifecycle into attempts, logs, and statuses. | It re-throws processing failures, allowing BullMQ—not a second loop—to retry. |
| `processors.ts` | Implements safe example work for each supported type. | A production processor replaces simulated work with an email/report provider while preserving the same contract. |
| `metrics.routes.ts` | Calculates admin metrics from persisted job state. | PostgreSQL supplies durable business metrics; BullMQ supplies live queue counts. |
| `prisma/schema.prisma` | Defines models, enum states, relations, and indexes. | The compound attempt uniqueness prevents duplicate attempt numbers for a job. |

## Read this request end-to-end

For `POST /api/jobs`, read these files in order:

1. `src/app.ts` mounts the router at `/api/jobs`.
2. `src/modules/jobs/job.routes.ts` runs JWT authentication then Zod validation.
3. `src/modules/jobs/job.service.ts` creates the durable row and invokes `enqueue`.
4. `src/modules/queues/queue.service.ts` calculates delay, priority, and retry configuration for BullMQ.
5. `src/modules/workers/worker.manager.ts` receives the queued message later and writes execution history.

## Status vocabulary

- `PENDING`: database row exists but queue publication has not completed.
- `QUEUED`: Redis accepted the job (including delayed jobs).
- `PROCESSING`: a worker claimed it.
- `RETRYING`: an attempt failed and BullMQ has another try pending.
- `COMPLETED` / `FAILED` / `CANCELLED`: terminal state.

Never say a job is exactly-once: QueueFlow intentionally documents at-least-once delivery. The database history makes duplicates and failures observable, while idempotent real-world processors make a repeated attempt safe.
