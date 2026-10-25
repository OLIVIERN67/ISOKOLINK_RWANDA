import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";
import { ApiError } from "../utils/errors";

type Source = "body" | "query" | "params";

export function validate(schema: ZodTypeAny, source: Source = "body") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      next(ApiError.validation("Please check the highlighted fields.", details));
      return;
    }
    if (source === "body") {
      req.body = result.data;
    } else if (source === "params") {
      req.params = result.data as Request["params"];
    } else {
      Object.defineProperty(req, "query", { value: result.data, writable: true, configurable: true });
    }
    next();
  };
}
