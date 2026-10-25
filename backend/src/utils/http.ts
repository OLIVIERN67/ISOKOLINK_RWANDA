import type { Response } from "express";

export function ok<T>(res: Response, data: T, status = 200, meta?: Record<string, unknown>) {
  return res.status(status).json({ success: true, data, ...(meta ? { meta } : {}) });
}

export function created<T>(res: Response, data: T, meta?: Record<string, unknown>) {
  return ok(res, data, 201, meta);
}

export function noContent(res: Response) {
  return res.status(204).send();
}
