import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  authLimiter,
  passwordResetLimiter,
  registrationLimiter,
} from "../../middleware/rateLimit";
import { validate } from "../../middleware/validate";
import { changePassword } from "./auth.service";
import {
  changePasswordHandler,
  forgotPassword,
  login,
  logout,
  me,
  register,
  resendVerification,
  resetPasswordHandler,
  verifyEmail,
} from "./auth.controller";
import {
  forgotPasswordSchema,
  loginSchema,
  passwordSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "./auth.schemas";

const router = Router();

router.post("/register", registrationLimiter, validate(registerSchema), asyncHandler(register));
router.post("/login", authLimiter, validate(loginSchema), asyncHandler(login));
router.post("/logout", asyncHandler(logout));
router.get("/me", requireAuth, asyncHandler(me));
router.post("/verify-email", authLimiter, validate(verifyEmailSchema), asyncHandler(verifyEmail));
router.post("/resend-verification", requireAuth, passwordResetLimiter, asyncHandler(resendVerification));
router.post(
  "/forgot-password",
  passwordResetLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(forgotPassword),
);
router.post(
  "/reset-password",
  passwordResetLimiter,
  validate(resetPasswordSchema),
  asyncHandler(resetPasswordHandler),
);
router.post(
  "/change-password",
  requireAuth,
  authLimiter,
  validate(
    z.object({
      currentPassword: z.string().min(1),
      newPassword: passwordSchema,
    }),
  ),
  asyncHandler(changePasswordHandler),
);

export { changePassword };
export default router;
