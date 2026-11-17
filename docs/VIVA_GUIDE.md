# QueueFlow viva guide

## Project explanation in 60 seconds

QueueFlow is a background-job platform. A client submits work such as an email or report through a REST API. The API validates the request, authenticates the caller, stores durable job metadata in PostgreSQL, and publishes the job ID to BullMQ in Redis. A separate worker process fetches eligible jobs, validates the payload again, executes a processor, and writes job attempts, logs, and final status back to PostgreSQL. This keeps HTTP requests fast and preserves audit history.

## Flow you can explain on the whiteboard

1. Registration hashes passwords with bcrypt; login signs a JWT containing user ID and role.
2. Middleware verifies the JWT. Job service also checks ownership, so a normal user cannot read or change somebody else's job.
3. `POST /api/jobs` validates and creates a database row, then publishes to BullMQ using the same ID.
4. Priority and optional delay are BullMQ options. Critical is numeric `1` because BullMQ's smaller value means higher priority.
5. The worker changes the record to `PROCESSING`, creates a `JobAttempt`, and executes a type-specific processor.
6. On success it writes `COMPLETED`; on failure it records the error and re-throws, so BullMQ applies exponential retry/backoff.

## Common technical questions with answers

**Why use PostgreSQL and Redis together?** PostgreSQL is durable relational storage for users, job history, logs, and authorization. Redis/BullMQ is optimized for fast queue operations, delayed jobs, and retries. Redis alone is not a suitable complete audit/history database.

**Why a separate worker process?** It prevents CPU- or I/O-heavy work from delaying HTTP responses and lets workers scale independently from API instances.

**What is the delivery guarantee?** At-least-once. A process can fail after a side effect but before acknowledging completion, so a job may execute again. Real processors should use idempotency keys or upserts. Exactly-once delivery is not claimed.

**How do retries work?** BullMQ owns retry counting and exponential backoff. The worker writes `RETRYING` for non-final failures and throws the error. Throwing lets BullMQ schedule the next attempt instead of maintaining a conflicting custom retry loop.

**How is priority implemented?** Business priorities map to BullMQ numeric values: Critical 1, High 2, Normal 3, Low 4. Lower numeric values win. With several active workers, strict global priority cannot be guaranteed because workers may already have claimed lower-priority jobs.

**How do delayed jobs work?** `scheduledAt` must be future. The service calculates `scheduledAt - now` and passes it as BullMQ's delay. It stays delayed until eligible and can be removed during cancellation.

**How do you prevent unauthorized access?** JWT middleware identifies the user; the job service checks `job.userId` against that identity. Administrative queue and metrics routes require the `ADMIN` role.

**Why hash passwords with bcrypt?** bcrypt is deliberately slow and salted, making stolen hashes far more expensive to brute-force. Only the hash is stored; API responses never include it.

**What happens if the database succeeds but Redis enqueue fails?** The code catches the queue failure, marks the durable job as `FAILED`, stores an error log, and returns 503. The user can retry it; it is never silently lost.

**What is the remaining distributed-systems weakness?** PostgreSQL and Redis cannot participate in one atomic transaction here. A production-strength next step is the transactional outbox pattern: write an outbox record with the job transaction, then a relay reliably publishes pending records.

**Why Zod when TypeScript exists?** TypeScript disappears at runtime and cannot validate untrusted JSON. Zod checks runtime input and also derives static types.

**How are database relations designed?** One User has many Jobs. One Job has many JobAttempts and JobLogs. Cascading deletion removes dependent history only if a non-processing job is explicitly deleted.

## Important limitations to state honestly

- Demonstration processors simulate email/notification/report work; they do not send real messages.
- This environment did not provide Docker, PostgreSQL, or Redis, so only build, lint, and isolated unit tests were executed here.
- Worker heartbeat endpoint and an outbox relay are sensible next production enhancements.
