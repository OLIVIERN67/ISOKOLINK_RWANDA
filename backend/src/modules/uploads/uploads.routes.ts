import { Router } from "express";
import { requireAuth, requireSeller } from "../../middleware/auth";
import { imageUpload, persistImage } from "../../middleware/upload";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/errors";
import { ok } from "../../utils/http";

const router = Router();

router.post(
  "/product-image",
  requireAuth,
  requireSeller,
  imageUpload.single("image"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest("Select an image to upload.");
    const url = await persistImage(req.file);
    return ok(res, { url });
  }),
);

router.post(
  "/profile-image",
  requireAuth,
  imageUpload.single("image"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest("Select an image to upload.");
    const url = await persistImage(req.file);
    return ok(res, { url });
  }),
);

export default router;
