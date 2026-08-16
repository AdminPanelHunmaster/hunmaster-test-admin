export class AdminBackendError extends Error {
  constructor(
    message: string,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AdminBackendError";
  }
}

export function toAdminBackendError(error: unknown, fallback: string): AdminBackendError {
  if (error instanceof AdminBackendError) return error;
  if (error instanceof Error && error.message) return new AdminBackendError(error.message, error);
  return new AdminBackendError(fallback, error);
}

export function getErrorMessage(
  error: unknown,
  fallback = "Не удалось выполнить действие.",
): string {
  return toAdminBackendError(error, fallback).message;
}
