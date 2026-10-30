import type { NextFunction, Request, Response } from "express";
import { allowedOrigins } from "../config/origins";
import { ApiError } from "../utils/errors";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Origin allow-list protection for cookie-authenticated requests. It rejects
 * mutating requests from origins other than the configured frontend/API and
 * blocks cross-site requests that omit an Origin header.
 */
export function originCheck(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const origin = req.get("origin");
  if (origin) {
    if (!allowedOrigins.has(origin)) {
      next(ApiError.forbidden("Request origin is not allowed."));
      return;
    }
    next();
    return;
  }

  if (req.get("sec-fetch-site") === "cross-site") {
    next(ApiError.forbidden("Cross-site requests are not allowed."));
    return;
  }

  // Some same-origin requests or server-to-server calls may omit Origin.
  // CORS already restricts browser origins; we only block when there is an
  // explicit cross-site signal or a disallowed origin.
  next();
}
