import { z } from "zod";

export const reportCreateSchema = z
  .object({
    productId: z.coerce.number().int().positive().nullable().optional(),
    reportedUserId: z.coerce.number().int().positive().nullable().optional(),
    reason: z.enum([
      "Misleading price",
      "Suspicious listing",
      "Potential scam",
      "Inappropriate content",
      "Incorrect product information",
      "Other",
    ]),
    details: z.string().trim().min(10, "Describe the problem in at least 10 characters.").max(2000),
  })
  .refine((value) => Boolean(value.productId) || Boolean(value.reportedUserId), {
    message: "Select a product or a user to report.",
    path: ["productId"],
  });

export const reportUpdateSchema = z
  .object({
    status: z.enum(["under_review", "resolved", "dismissed"]),
    resolutionNote: z.string().trim().max(2000).optional().nullable(),
  })
  .refine((value) => value.status === "under_review" || (value.resolutionNote?.length ?? 0) >= 5, {
    message: "Add a short resolution note.",
    path: ["resolutionNote"],
  });

export const reportListQuerySchema = z.object({
  status: z.enum(["open", "under_review", "resolved", "dismissed", "all"]).default("all"),
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(60).default(20),
});
