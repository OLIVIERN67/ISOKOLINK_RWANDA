import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { getSessionUser } from "../services/session.service";
import { ApiError } from "../utils/errors";

export async function attachUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.[env.sessionCookieName];
    if (typeof token === "string" && token.length > 0) {
      const session = await getSessionUser(token);
      if (session && session.user.status === "active") {
        req.user = session.user;
        req.sessionHash = session.sessionHash;
      }
    }
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(ApiError.unauthorized());
    return;
  }
  if (req.user.status !== "active") {
    next(ApiError.forbidden("This account is not active."));
    return;
  }
  next();
}

export function hasRole(req: Request, role: string): boolean {
  return Boolean(req.user?.roles.includes(role));
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(ApiError.unauthorized());
      return;
    }
    if (req.user.status !== "active") {
      next(ApiError.forbidden("This account is not active."));
      return;
    }
    if (!roles.some((role) => req.user?.roles.includes(role))) {
      next(ApiError.forbidden());
      return;
    }
    next();
  };
}

export const requireAdmin = requireRole("admin");

export function requireSeller(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(ApiError.unauthorized());
    return;
  }
  if (req.user.status !== "active") {
    next(ApiError.forbidden("This account is not active."));
    return;
  }
  if (!req.user.roles.includes("seller") || !req.user.sellerProfileId) {
    next(ApiError.forbidden("Complete your seller registration to access this feature."));
    return;
  }
  if (req.user.sellerStatus === "suspended") {
    next(ApiError.forbidden("Your seller profile is suspended. Contact support."));
    return;
  }
  next();
}
