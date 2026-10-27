import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/asyncHandler";
import { created, noContent, ok } from "../../utils/http";
import {
  createAnnouncement,
  deleteAnnouncement,
  listAllAnnouncements,
  listPublishedAnnouncements,
  getPublishedAnnouncement,
  updateAnnouncement,
} from "./announcements.service";

const idParams = z.object({ id: z.coerce.number().int().positive() });

const announcementBody = z.object({
  title: z.string().trim().min(3).max(200),
  body: z.string().trim().min(10).max(10000),
  imageUrl: z.string().trim().max(500).refine(
    (value) => value === "" || /^\/uploads\/[A-Za-z0-9._-]+$/.test(value) || /^https?:\/\/[^\s"'<>]+$/i.test(value),
    "Enter a valid image URL.",
  ).optional().nullable(),
  audience: z.enum(["all", "buyers", "sellers"]).default("all"),
  isPublished: z.boolean().default(false),
});

const audienceQuery = z.object({
  audience: z.enum(["all", "buyers", "sellers"]).optional(),
});

export const announcementsRouter = Router();
announcementsRouter.get(
  "/",
  validate(audienceQuery, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as { audience?: "all" | "buyers" | "sellers" };
    return ok(res, await listPublishedAnnouncements(query.audience));
  }),
);
announcementsRouter.get(
  "/:id",
  validate(idParams, "params"),
  asyncHandler(async (req, res) => ok(res, await getPublishedAnnouncement(Number(req.params.id)))),
);

export const adminAnnouncementsRouter = Router();
adminAnnouncementsRouter.use(requireAdmin);

adminAnnouncementsRouter.get(
  "/",
  asyncHandler(async (_req, res) => ok(res, await listAllAnnouncements())),
);

adminAnnouncementsRouter.post(
  "/",
  validate(announcementBody),
  asyncHandler(async (req, res) =>
    created(res, await createAnnouncement(req.body, req.user!.id, req.ip)),
  ),
);

adminAnnouncementsRouter.patch(
  "/:id",
  validate(idParams, "params"),
  validate(announcementBody.partial()),
  asyncHandler(async (req, res) =>
    ok(res, await updateAnnouncement(Number(req.params.id), req.body, req.user!.id, req.ip)),
  ),
);

adminAnnouncementsRouter.delete(
  "/:id",
  validate(idParams, "params"),
  asyncHandler(async (req, res) => {
    await deleteAnnouncement(Number(req.params.id), req.user!.id, req.ip);
    return noContent(res);
  }),
);
