import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { ApiError } from "../utils/errors";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const allowedOrigins = new Set(
  [env.frontendUrl, env.apiPublicUrl]
    .flatMap((url) => {
      try {
        return [new URL(url).origin];
      } catch {
        return [];
      }
    })
    .concat(["http://localhost:5173", "http://127.0.0.1:5173"]),
);

/**
 * Defence-in-depth CSRF protection for cookie-authenticated requests.
 * SameSite=Lax is the primary control; this rejects obvious cross-site
 * mutating requests and spoofed origins.
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

  next();
}
