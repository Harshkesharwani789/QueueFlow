// Unit tests do not contact infrastructure, but imports still validate environment variables.
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'this-is-a-test-secret-that-is-longer-than-thirty-two-characters';
process.env.CORS_ORIGIN = 'http://localhost:3000';
