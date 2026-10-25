import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/asyncHandler";
import { created, ok } from "../../utils/http";
import {
  comparePrices,
  createObservation,
  deleteObservation,
  findObservation,
  listObservations,
  updateObservation,
} from "./marketPrices.service";
import {
  compareQuerySchema,
  observationCreateSchema,
  observationListQuerySchema,
  observationUpdateSchema,
} from "./marketPrices.schemas";

const idParams = z.object({ id: z.coerce.number().int().positive() });

export const marketPricesRouter = Router();

marketPricesRouter.get(
  "/",
  validate(observationListQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const result = await listObservations(req.query as never);
    return ok(res, result.items, 200, result.meta);
  }),
);

marketPricesRouter.get(
  "/compare",
  validate(compareQuerySchema, "query"),
  asyncHandler(async (req, res) => ok(res, await comparePrices(req.query as never))),
);

marketPricesRouter.get(
  "/:id",
  validate(idParams, "params"),
  asyncHandler(async (req, res) => ok(res, await findObservation(Number(req.params.id)))),
);

export const adminMarketPricesRouter = Router();
adminMarketPricesRouter.use(requireAdmin);

adminMarketPricesRouter.post(
  "/",
  validate(observationCreateSchema),
  asyncHandler(async (req, res) =>
    created(res, await createObservation(req.body, req.user!.id, req.ip)),
  ),
);

adminMarketPricesRouter.patch(
  "/:id",
  validate(idParams, "params"),
  validate(observationUpdateSchema),
  asyncHandler(async (req, res) =>
    ok(res, await updateObservation(Number(req.params.id), req.body, req.user!.id, req.ip)),
  ),
);

adminMarketPricesRouter.delete(
  "/:id",
  validate(idParams, "params"),
  asyncHandler(async (req, res) =>
    ok(res, await deleteObservation(Number(req.params.id), req.user!.id, req.ip)),
  ),
);
