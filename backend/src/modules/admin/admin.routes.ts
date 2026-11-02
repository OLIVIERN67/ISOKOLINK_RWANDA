import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/asyncHandler";
import { ok } from "../../utils/http";
import {
  approveProduct,
  changeUserRole,
  getAdminConversation,
  getAdminProduct,
  getAdminUser,
  getDashboardStats,
  listAdminConversations,
  listAdminProducts,
  listAdminUsers,
  listAuditLogs,
  reactivateUser,
  rejectProduct,
  reinstateProduct,
  requestProductCorrection,
  resetUserPassword,
  setProductFeatured,
  suspendProduct,
  suspendUser,
} from "./admin.service";
import {
  adminConversationAccessSchema,
  adminConversationQuerySchema,
  adminPasswordResetSchema,
  adminProductQuerySchema,
  adminUserQuerySchema,
  approveSchema,
  auditLogQuerySchema,
  featureSchema,
  moderationReasonSchema,
  roleChangeSchema,
  suspendUserSchema,
} from "./admin.schemas";

const idParams = z.object({ id: z.coerce.number().int().positive() });

export const adminRouter = Router();
adminRouter.use(requireAdmin);

adminRouter.get(
  "/stats",
  asyncHandler(async (_req, res) => ok(res, await getDashboardStats())),
);

adminRouter.get(
  "/conversations",
  validate(adminConversationQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const result = await listAdminConversations(req.query as never);
    return ok(res, result.items, 200, result.meta);
  }),
);

adminRouter.get(
  "/conversations/:id",
  validate(idParams, "params"),
  validate(adminConversationAccessSchema, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as never as { before?: number; limit: number; reason: string };
    return ok(
      res,
      await getAdminConversation(
        Number(req.params.id),
        req.user!.id,
        query,
        req.ip,
      ),
    );
  }),
);

adminRouter.get(
  "/products",
  validate(adminProductQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const result = await listAdminProducts(req.query as never);
    return ok(res, result.items, 200, result.meta);
  }),
);

adminRouter.get(
  "/products/:id",
  validate(idParams, "params"),
  asyncHandler(async (req, res) => ok(res, await getAdminProduct(Number(req.params.id)))),
);

adminRouter.post(
  "/products/:id/approve",
  validate(idParams, "params"),
  validate(approveSchema),
  asyncHandler(async (req, res) =>
    ok(
      res,
      await approveProduct(Number(req.params.id), req.user!.id, req.body.reason ?? null, req.ip),
    ),
  ),
);

adminRouter.post(
  "/products/:id/reject",
  validate(idParams, "params"),
  validate(moderationReasonSchema),
  asyncHandler(async (req, res) =>
    ok(res, await rejectProduct(Number(req.params.id), req.user!.id, req.body.reason, req.ip)),
  ),
);

adminRouter.post(
  "/products/:id/request-correction",
  validate(idParams, "params"),
  validate(moderationReasonSchema),
  asyncHandler(async (req, res) =>
    ok(
      res,
      await requestProductCorrection(Number(req.params.id), req.user!.id, req.body.reason, req.ip),
    ),
  ),
);

adminRouter.post(
  "/products/:id/suspend",
  validate(idParams, "params"),
  validate(moderationReasonSchema),
  asyncHandler(async (req, res) =>
    ok(res, await suspendProduct(Number(req.params.id), req.user!.id, req.body.reason, req.ip)),
  ),
);

adminRouter.post(
  "/products/:id/reinstate",
  validate(idParams, "params"),
  validate(approveSchema),
  asyncHandler(async (req, res) =>
    ok(
      res,
      await reinstateProduct(Number(req.params.id), req.user!.id, req.body.reason ?? null, req.ip),
    ),
  ),
);

adminRouter.patch(
  "/products/:id/feature",
  validate(idParams, "params"),
  validate(featureSchema),
  asyncHandler(async (req, res) =>
    ok(res, await setProductFeatured(Number(req.params.id), req.user!.id, req.body.isFeatured, req.ip)),
  ),
);

adminRouter.get(
  "/users",
  validate(adminUserQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const result = await listAdminUsers(req.query as never);
    return ok(res, result.items, 200, result.meta);
  }),
);

adminRouter.get(
  "/users/:id",
  validate(idParams, "params"),
  asyncHandler(async (req, res) => ok(res, await getAdminUser(Number(req.params.id)))),
);

adminRouter.post(
  "/users/:id/suspend",
  validate(idParams, "params"),
  validate(suspendUserSchema),
  asyncHandler(async (req, res) =>
    ok(res, await suspendUser(Number(req.params.id), req.user!.id, req.body.reason, req.ip)),
  ),
);

adminRouter.post(
  "/users/:id/reactivate",
  validate(idParams, "params"),
  asyncHandler(async (req, res) =>
    ok(res, await reactivateUser(Number(req.params.id), req.user!.id, req.ip)),
  ),
);

adminRouter.post(
  "/users/:id/roles",
  validate(idParams, "params"),
  validate(roleChangeSchema),
  asyncHandler(async (req, res) =>
    ok(
      res,
      await changeUserRole(
        Number(req.params.id),
        req.user!.id,
        req.body.role,
        req.body.action,
        req.ip,
      ),
    ),
  ),
);

adminRouter.post(
  "/users/:id/reset-password",
  validate(idParams, "params"),
  validate(adminPasswordResetSchema),
  asyncHandler(async (req, res) =>
    ok(
      res,
      await resetUserPassword(
        Number(req.params.id),
        req.user!.id,
        req.body.newPassword,
        req.ip,
      ),
    ),
  ),
);

adminRouter.get(
  "/audit-logs",
  validate(auditLogQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const result = await listAuditLogs(req.query as never);
    return ok(res, result.items, 200, result.meta);
  }),
);
