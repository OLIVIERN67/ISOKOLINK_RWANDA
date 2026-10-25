import rateLimit from "express-rate-limit";

const message = {
  success: false,
  error: { code: "RATE_LIMITED", message: "Too many requests. Please wait a moment and try again." },
};

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message,
});

export const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message,
});

export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message,
});

export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message,
});

export const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message,
});
