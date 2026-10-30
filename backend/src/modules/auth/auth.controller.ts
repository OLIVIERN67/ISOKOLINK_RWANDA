import type { Request, Response } from "express";
import {
  createSession,
  clearSessionCookie,
  deleteSession,
  getSessionUser,
  setSessionCookie,
} from "../../services/session.service";
import { writeAuditLog } from "../../utils/audit";
import { ApiError } from "../../utils/errors";
import { created, ok } from "../../utils/http";
import {
  authenticate,
  changePassword,
  markLogin,
  registerUser,
  requestPasswordReset,
  resetPassword,
} from "./auth.service";

export async function register(req: Request, res: Response) {
  const result = await registerUser(req.body, req.ip);
  const token = await createSession(result.userId, req);
  setSessionCookie(res, token);
  const session = await getSessionUser(token);
  return created(res, {
    user: session?.user,
    message: "Account created. Welcome to ISOKOLINK RWANDA.",
  });
}

export async function login(req: Request, res: Response) {
  const userId = await authenticate(req.body);
  const token = await createSession(userId, req);
  setSessionCookie(res, token);
  await markLogin(userId);
  const session = await getSessionUser(token);
  return ok(res, { user: session?.user });
}

export async function logout(req: Request, res: Response) {
  if (req.sessionHash) {
    await deleteSession(req.sessionHash);
  }
  clearSessionCookie(res);
  if (req.user) {
    await writeAuditLog({
      actorId: req.user.id,
      action: "user.logged_out",
      entityType: "session",
      entityId: null,
      ipAddress: req.ip,
    });
  }
  return ok(res, { message: "Signed out." });
}

export async function me(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  return ok(res, { user: req.user });
}

export async function forgotPassword(req: Request, res: Response) {
  await requestPasswordReset(String(req.body.email));
  return ok(res, {
    message: "If an account exists for that email address, a reset link has been sent.",
  });
}

export async function resetPasswordHandler(req: Request, res: Response) {
  await resetPassword(String(req.body.token), String(req.body.password), req.ip);
  clearSessionCookie(res);
  return ok(res, { message: "Your password has been reset. You can now sign in." });
}

export async function changePasswordHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  await changePassword(req.user.id, String(req.body.currentPassword), String(req.body.newPassword), req.sessionHash);
  return ok(res, { message: "Password updated. Other sessions have been signed out." });
}
