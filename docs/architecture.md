# Architecture and execution flow

`Client → Express API → PostgreSQL + Redis/BullMQ → worker → PostgreSQL`

1. A validated, authenticated request creates a `Job` row in PostgreSQL with `PENDING` status.
2. The service adds a BullMQ item using the same application job ID and then changes status to `QUEUED`.
3. A separate worker takes eligible jobs from Redis according to BullMQ priority and delay rules.
4. The worker creates a `JobAttempt`, updates the job to `PROCESSING`, validates the payload, and invokes its processor.
5. Success writes `COMPLETED`; a thrown processor error writes `RETRYING` or `FAILED`, then is re-thrown so BullMQ controls exponential backoff.

PostgreSQL and Redis do not share a transaction. Therefore this project makes queue-add failure explicit and treats delivery as at-least-once. A production system can strengthen recovery further with an outbox table and relay process.

Authentication uses a bcrypt password hash and a signed JWT. Routes run authentication before ownership checks, and admin-only routes additionally require the `ADMIN` role.
