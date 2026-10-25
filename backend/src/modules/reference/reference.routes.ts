import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/asyncHandler";
import { created, ok } from "../../utils/http";
import {
  createCategory,
  createLocation,
  createMarket,
  createUnit,
  deleteCategory,
  deleteLocation,
  deleteMarket,
  listCategories,
  listLocations,
  listMarkets,
  listUnits,
  updateCategory,
  updateMarket,
  updateUnit,
} from "./reference.service";

const safeUrl = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) => value === "" || /^\/uploads\/[A-Za-z0-9._-]+$/.test(value) || /^https?:\/\/[^\s"'<>]+$/i.test(value),
    "Enter a valid image URL.",
  )
  .optional()
  .nullable();

const idParams = z.object({ id: z.coerce.number().int().positive() });

const categoryBody = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  imageUrl: safeUrl,
  isActive: z.boolean().optional(),
});

const marketBody = z.object({
  name: z.string().trim().min(2).max(120),
  locationId: z.coerce.number().int().positive(),
  address: z.string().trim().max(255).optional().nullable(),
  isActive: z.boolean().optional(),
});

const locationBody = z.object({
  name: z.string().trim().min(2).max(100),
  type: z.enum(["province", "district", "sector", "city"]),
  parentId: z.coerce.number().int().positive().nullable().optional(),
});

const unitBody = z.object({
  code: z.string().trim().min(1).max(20),
  label: z.string().trim().min(1).max(50),
  dimension: z.enum(["weight", "volume", "count", "bunch", "bag", "sack"]),
  factorToBase: z.coerce.number().positive(),
  isActive: z.boolean().optional(),
});

export const categoryRouter = Router();
categoryRouter.get(
  "/",
  asyncHandler(async (_req, res) => ok(res, await listCategories())),
);

export const marketRouter = Router();
marketRouter.get(
  "/",
  validate(z.object({ locationId: z.coerce.number().int().positive().optional() }), "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as { locationId?: number };
    return ok(res, await listMarkets(query.locationId));
  }),
);

export const locationRouter = Router();
locationRouter.get(
  "/",
  asyncHandler(async (_req, res) => ok(res, await listLocations())),
);

export const unitRouter = Router();
unitRouter.get(
  "/",
  asyncHandler(async (_req, res) => ok(res, await listUnits())),
);

export const adminReferenceRouter = Router();
adminReferenceRouter.use(requireAdmin);

adminReferenceRouter.get(
  "/categories",
  asyncHandler(async (_req, res) => ok(res, await listCategories(true))),
);
adminReferenceRouter.post(
  "/categories",
  validate(categoryBody),
  asyncHandler(async (req, res) => created(res, await createCategory(req.body, req.user!.id, req.ip))),
);
adminReferenceRouter.patch(
  "/categories/:id",
  validate(idParams, "params"),
  validate(categoryBody.partial()),
  asyncHandler(async (req, res) =>
    ok(res, await updateCategory(Number(req.params.id), req.body, req.user!.id, req.ip)),
  ),
);
adminReferenceRouter.delete(
  "/categories/:id",
  validate(idParams, "params"),
  asyncHandler(async (req, res) => ok(res, await deleteCategory(Number(req.params.id), req.user!.id, req.ip))),
);

adminReferenceRouter.get(
  "/markets",
  asyncHandler(async (_req, res) => ok(res, await listMarkets())),
);
adminReferenceRouter.post(
  "/markets",
  validate(marketBody),
  asyncHandler(async (req, res) => created(res, await createMarket(req.body, req.user!.id, req.ip))),
);
adminReferenceRouter.patch(
  "/markets/:id",
  validate(idParams, "params"),
  validate(marketBody.partial()),
  asyncHandler(async (req, res) =>
    ok(res, await updateMarket(Number(req.params.id), req.body, req.user!.id, req.ip)),
  ),
);
adminReferenceRouter.delete(
  "/markets/:id",
  validate(idParams, "params"),
  asyncHandler(async (req, res) => ok(res, await deleteMarket(Number(req.params.id), req.user!.id, req.ip))),
);

adminReferenceRouter.get(
  "/locations",
  asyncHandler(async (_req, res) => ok(res, await listLocations())),
);
adminReferenceRouter.post(
  "/locations",
  validate(locationBody),
  asyncHandler(async (req, res) => created(res, await createLocation(req.body, req.user!.id, req.ip))),
);
adminReferenceRouter.delete(
  "/locations/:id",
  validate(idParams, "params"),
  asyncHandler(async (req, res) => ok(res, await deleteLocation(Number(req.params.id), req.user!.id, req.ip))),
);

adminReferenceRouter.get(
  "/units",
  asyncHandler(async (_req, res) => ok(res, await listUnits(true))),
);
adminReferenceRouter.post(
  "/units",
  validate(unitBody),
  asyncHandler(async (req, res) => created(res, await createUnit(req.body, req.user!.id, req.ip))),
);
adminReferenceRouter.patch(
  "/units/:id",
  validate(idParams, "params"),
  validate(unitBody.partial().omit({ code: true })),
  asyncHandler(async (req, res) =>
    ok(res, await updateUnit(Number(req.params.id), req.body, req.user!.id, req.ip)),
  ),
);
