import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import multer from "multer";
import { env } from "../config/env";
import { ApiError } from "../utils/errors";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadBytes, files: 5 },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED.has(file.mimetype)) {
      callback(ApiError.badRequest("Only JPEG, PNG and WebP images are allowed."));
      return;
    }
    callback(null, true);
  },
});

function detectImage(buffer: Buffer): { extension: string; mime: string } | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { extension: "jpg", mime: "image/jpeg" };
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { extension: "png", mime: "image/png" };
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { extension: "webp", mime: "image/webp" };
  }
  return null;
}

/**
 * Validates image bytes (not just the client-supplied MIME type), generates a
 * random server-side filename and writes it to the upload directory.
 */
export async function persistImage(file: Express.Multer.File): Promise<string> {
  const detected = detectImage(file.buffer);
  if (!detected) {
    throw ApiError.badRequest("The uploaded file is not a valid JPEG, PNG or WebP image.");
  }

  await fs.mkdir(env.uploadDir, { recursive: true });
  const filename = `${Date.now()}-${crypto.randomBytes(12).toString("hex")}.${detected.extension}`;
  const destination = path.join(env.uploadDir, filename);
  await fs.writeFile(destination, file.buffer, { flag: "wx" });
  return `/uploads/${filename}`;
}
