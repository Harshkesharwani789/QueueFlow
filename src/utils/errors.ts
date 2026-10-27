// Expected errors carry an HTTP status and are safe to return to API callers.
export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}
