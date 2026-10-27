export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "BAD_REQUEST"
  | "INTERNAL_ERROR";

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;

  constructor(statusCode: number, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(message = "Invalid request", details?: unknown) {
    return new ApiError(400, "BAD_REQUEST", message, details);
  }

  static validation(message = "Validation failed", details?: unknown) {
    return new ApiError(422, "VALIDATION_ERROR", message, details);
  }

  static unauthorized(message = "Authentication required") {
    return new ApiError(401, "UNAUTHORIZED", message);
  }

  static forbidden(message = "You do not have permission to perform this action") {
    return new ApiError(403, "FORBIDDEN", message);
  }

  static notFound(message = "Resource not found") {
    return new ApiError(404, "NOT_FOUND", message);
  }

  static conflict(message = "Resource already exists") {
    return new ApiError(409, "CONFLICT", message);
  }

  static tooManyRequests(message = "Too many requests. Please try again later.") {
    return new ApiError(429, "RATE_LIMITED", message);
  }

  static internal(message = "Something went wrong") {
    return new ApiError(500, "INTERNAL_ERROR", message);
  }

  static unavailable(message = "The service is temporarily unavailable") {
    return new ApiError(503, "INTERNAL_ERROR", message);
  }
}
