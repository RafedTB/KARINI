export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function parseApiErrorMessage(body: unknown): string {
  if (!body || typeof body !== "object") {
    return "Something went wrong. Please try again.";
  }
  const message = (body as { message?: string | string[] }).message;
  if (Array.isArray(message)) return message.join(", ");
  if (typeof message === "string" && message.length > 0) return message;
  return "Something went wrong. Please try again.";
}
