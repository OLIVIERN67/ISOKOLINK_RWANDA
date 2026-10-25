import type { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";
import { ZodError } from "zod";
import { env } from "../config/env";
import { ApiError } from "../utils/errors";

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: `Route ${req.method} ${req.originalUrl} was not found.` },
  });
}

interface MysqlError extends Error {
  code?: string;
  errno?: number;
  sqlMessage?: string;
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      success: false,
      error: { code: error.code, message: error.message, details: error.details },
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(422).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed.",
        details: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })),
      },
    });
    return;
  }

  if (error instanceof MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE" ? "The uploaded image is too large." : "The image upload failed.";
    res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message } });
    return;
  }

  if (error instanceof SyntaxError && "body" in error) {
    res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "Malformed JSON body." } });
    return;
  }

  const mysqlError = error as MysqlError;
  if (mysqlError?.code === "ER_DUP_ENTRY") {
    res.status(409).json({
      success: false,
      error: { code: "CONFLICT", message: "That record already exists." },
    });
    return;
  }
  if (mysqlError?.code === "ER_ROW_IS_REFERENCED_2" || mysqlError?.code === "ER_ROW_IS_REFERENCED") {
    res.status(409).json({
      success: false,
      error: {
        code: "CONFLICT",
        message: "This record is referenced by other data and cannot be removed. Deactivate it instead.",
      },
    });
    return;
  }

  console.error(`[error] ${req.method} ${req.originalUrl}`, error);

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: env.isProduction ? "Something went wrong. Please try again later." : "Internal server error.",
      ...(env.isProduction ? {} : { details: error instanceof Error ? error.message : String(error) }),
    },
  });
}
