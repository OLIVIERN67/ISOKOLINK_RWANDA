import { z } from "zod";

export const adminProductQuerySchema = z.object({
  status: z
    .enum(["pending", "approved", "rejected", "requires_correction", "suspended", "all"])
    .default("pending"),
  q: z.string().trim().max(120).optional(),
  sellerId: z.coerce.number().int().positive().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  includeArchived: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => value === true || value === "true"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(60).default(20),
});

export const moderationReasonSchema = z.object({
  reason: z.string().trim().min(5, "Give the seller a clear reason.").max(2000),
});

export const approveSchema = z.object({
  reason: z.string().trim().max(2000).optional().nullable(),
});

export const featureSchema = z.object({
  isFeatured: z.boolean(),
});

export const adminUserQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: z.enum(["active", "suspended", "deactivated", "all"]).default("all"),
  role: z.enum(["buyer", "seller", "admin", "all"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(60).default(20),
});

export const suspendUserSchema = z.object({
  reason: z.string().trim().min(5, "Provide a reason for suspending the account.").max(2000),
});

export const roleChangeSchema = z.object({
  role: z.enum(["admin", "seller"]),
  action: z.enum(["grant", "revoke"]),
});

export const auditLogQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  action: z.string().trim().max(100).optional(),
  entityType: z.string().trim().max(60).optional(),
  actorId: z.coerce.number().int().positive().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
});
