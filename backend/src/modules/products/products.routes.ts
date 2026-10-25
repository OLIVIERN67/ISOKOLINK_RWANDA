import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireSeller } from "../../middleware/auth";
import { writeLimiter } from "../../middleware/rateLimit";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/asyncHandler";
import { created, noContent, ok } from "../../utils/http";
import {
  archiveProduct,
  createProduct,
  getOwnerProduct,
  getProductApprovalHistory,
  getPublicProduct,
  getSellerStats,
  listPublicProducts,
  listSellerProducts,
  setProductAvailability,
  updateProduct,
} from "./products.service";
import {
  availabilitySchema,
  productCreateSchema,
  productListQuerySchema,
  productUpdateSchema,
  sellerProductQuerySchema,
} from "./products.schemas";

const idParams = z.object({ id: z.coerce.number().int().positive() });

export const publicProductRouter = Router();

publicProductRouter.get(
  "/",
  validate(productListQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const result = await listPublicProducts(req.query as never);
    return ok(res, result.items, 200, result.meta);
  }),
);

publicProductRouter.get(
  "/:id",
  validate(idParams, "params"),
  asyncHandler(async (req, res) => {
    const product = await getPublicProduct(Number(req.params.id), req.user?.id);
    return ok(res, product);
  }),
);

publicProductRouter.get(
  "/:id/approval-history",
  requireAuth,
  validate(idParams, "params"),
  asyncHandler(async (req, res) => {
    const product = await getOwnerProduct(req.user!.id, Number(req.params.id));
    if (!product) return ok(res, []);
    return ok(res, await getProductApprovalHistory(Number(req.params.id)));
  }),
);

export const sellerRouter = Router();

sellerRouter.use(requireAuth, requireSeller);

sellerRouter.get(
  "/products",
  validate(sellerProductQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const result = await listSellerProducts(req.user!.id, req.query as never);
    return ok(res, result.items, 200, result.meta);
  }),
);

sellerRouter.post(
  "/products",
  writeLimiter,
  validate(productCreateSchema),
  asyncHandler(async (req, res) => created(res, await createProduct(req.user!.id, req.body, req.ip))),
);

sellerRouter.get(
  "/products/:id",
  validate(idParams, "params"),
  asyncHandler(async (req, res) => ok(res, await getOwnerProduct(req.user!.id, Number(req.params.id)))),
);

sellerRouter.patch(
  "/products/:id",
  writeLimiter,
  validate(idParams, "params"),
  validate(productUpdateSchema),
  asyncHandler(async (req, res) => {
    const product = await updateProduct(req.user!.id, Number(req.params.id), req.body, req.ip);
    return ok(res, product);
  }),
);

sellerRouter.patch(
  "/products/:id/availability",
  validate(idParams, "params"),
  validate(availabilitySchema),
  asyncHandler(async (req, res) => {
    const product = await setProductAvailability(
      req.user!.id,
      Number(req.params.id),
      req.body.availability,
      req.body.quantity,
    );
    return ok(res, product);
  }),
);

sellerRouter.delete(
  "/products/:id",
  validate(idParams, "params"),
  asyncHandler(async (req, res) => {
    await archiveProduct(req.user!.id, Number(req.params.id), req.ip);
    return noContent(res);
  }),
);

sellerRouter.get(
  "/stats",
  asyncHandler(async (req, res) => ok(res, await getSellerStats(req.user!.id))),
);
