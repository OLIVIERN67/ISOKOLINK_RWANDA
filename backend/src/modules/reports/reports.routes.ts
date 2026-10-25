import { Router } from "express";
import { z } from "zod";
import { requireAdmin, requireAuth } from "../../middleware/auth";
import { writeLimiter } from "../../middleware/rateLimit";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/asyncHandler";
import { created, ok } from "../../utils/http";
import { createReport, listMyReports, listReports, updateReport } from "./reports.service";
import { reportCreateSchema, reportListQuerySchema, reportUpdateSchema } from "./reports.schemas";

const idParams = z.object({ id: z.coerce.number().int().positive() });

export const reportsRouter = Router();
reportsRouter.use(requireAuth);

reportsRouter.post(
  "/",
  writeLimiter,
  validate(reportCreateSchema),
  asyncHandler(async (req, res) => created(res, await createReport(req.user!.id, req.body))),
);

reportsRouter.get(
  "/mine",
  asyncHandler(async (req, res) => ok(res, await listMyReports(req.user!.id))),
);

export const adminReportsRouter = Router();
adminReportsRouter.use(requireAdmin);

adminReportsRouter.get(
  "/",
  validate(reportListQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const result = await listReports(req.query as never);
    return ok(res, result.items, 200, result.meta);
  }),
);

adminReportsRouter.patch(
  "/:id",
  validate(idParams, "params"),
  validate(reportUpdateSchema),
  asyncHandler(async (req, res) =>
    ok(res, await updateReport(Number(req.params.id), req.body, req.user!.id, req.ip)),
  ),
);
