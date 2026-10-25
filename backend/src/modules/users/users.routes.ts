import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireSeller } from "../../middleware/auth";
import { writeLimiter } from "../../middleware/rateLimit";
import { validate } from "../../middleware/validate";
import { execute } from "../../db/pool";
import { clearSessionCookie, deleteUserSessions } from "../../services/session.service";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/errors";
import { created, ok } from "../../utils/http";
import {
  becomeSeller,
  getBuyerStats,
  getMyProfile,
  getPublicSeller,
  getSavedProducts,
  getSellerProfile,
  saveProduct,
  unsaveProduct,
  updateMyProfile,
  updateSellerProfile,
} from "./users.service";
import { sellerProfileSchema, updateProfileSchema, updateSellerProfileSchema } from "./users.schemas";

const productIdParams = z.object({ productId: z.coerce.number().int().positive() });
const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(60).default(12),
});

export const usersRouter = Router();
usersRouter.use(requireAuth);

usersRouter.get(
  "/me",
  asyncHandler(async (req, res) => ok(res, await getMyProfile(req.user!.id))),
);

usersRouter.patch(
  "/me",
  validate(updateProfileSchema),
  asyncHandler(async (req, res) => ok(res, await updateMyProfile(req.user!.id, req.body))),
);

usersRouter.get(
  "/me/stats",
  asyncHandler(async (req, res) => ok(res, await getBuyerStats(req.user!.id))),
);

usersRouter.get(
  "/me/saved-products",
  validate(pageQuery, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as never as { page: number; pageSize: number };
    const result = await getSavedProducts(req.user!.id, query.page, query.pageSize);
    return ok(res, result.items, 200, result.meta);
  }),
);

usersRouter.post(
  "/me/saved-products/:productId",
  validate(productIdParams, "params"),
  asyncHandler(async (req, res) => created(res, await saveProduct(req.user!.id, Number(req.params.productId)))),
);

usersRouter.delete(
  "/me/saved-products/:productId",
  validate(productIdParams, "params"),
  asyncHandler(async (req, res) => ok(res, await unsaveProduct(req.user!.id, Number(req.params.productId)))),
);

usersRouter.post(
  "/me/become-seller",
  writeLimiter,
  validate(sellerProfileSchema),
  asyncHandler(async (req, res) => {
    const profile = await becomeSeller(req.user!.id, req.user!.isEmailVerified, req.body, req.ip);
    return created(res, profile);
  }),
);

usersRouter.get(
  "/me/seller-profile",
  requireSeller,
  asyncHandler(async (req, res) => ok(res, await getSellerProfile(req.user!.id))),
);

usersRouter.patch(
  "/me/seller-profile",
  requireSeller,
  validate(updateSellerProfileSchema),
  asyncHandler(async (req, res) =>
    ok(res, await updateSellerProfile(req.user!.id, req.body, req.ip)),
  ),
);

usersRouter.post(
  "/me/deactivate",
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    if (req.user!.roles.includes("admin")) {
      throw ApiError.forbidden("Administrator accounts cannot be deactivated from this screen.");
    }
    await execute("UPDATE users SET status = 'deactivated' WHERE id = ?", [userId]);
    await deleteUserSessions(userId);
    clearSessionCookie(res);
    return ok(res, { message: "Your account has been deactivated." });
  }),
);

usersRouter.get(
  "/:id/public",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) throw ApiError.badRequest("Invalid seller id.");
    return ok(res, await getPublicSeller(id));
  }),
);

export const sellerPublicRouter = Router();
sellerPublicRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) throw ApiError.badRequest("Invalid seller id.");
    return ok(res, await getPublicSeller(id));
  }),
);
