import { z } from "zod";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the YYYY-MM-DD date format.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.getTime() <= Date.now();
  }, "Observation date cannot be in the future.");

export const observationListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  marketId: z.coerce.number().int().positive().optional(),
  locationId: z.coerce.number().int().positive().optional(),
  unitId: z.coerce.number().int().positive().optional(),
  verificationStatus: z.enum(["verified", "unverified"]).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sort: z.enum(["newest", "price_asc", "price_desc"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const compareQuerySchema = z.object({
  q: z.string().trim().min(2, "Enter a product name to compare prices.").max(120),
  categoryId: z.coerce.number().int().positive().optional(),
  locationId: z.coerce.number().int().positive().optional(),
  unitId: z.coerce.number().int().positive().optional(),
  marketId: z.coerce.number().int().positive().optional(),
});

export const observationCreateSchema = z.object({
  productName: z.string().trim().min(2).max(160),
  categoryId: z.coerce.number().int().positive(),
  marketId: z.coerce.number().int().positive().nullable().optional(),
  locationId: z.coerce.number().int().positive(),
  unitId: z.coerce.number().int().positive(),
  price: z.coerce.number().positive().max(999999999),
  currency: z.string().trim().length(3).default("RWF"),
  observedOn: dateString,
  source: z.string().trim().min(2).max(160),
  verificationStatus: z.enum(["verified", "unverified"]).default("unverified"),
  observedBy: z.string().trim().max(160).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const observationUpdateSchema = observationCreateSchema.partial();

export type ObservationListQuery = z.infer<typeof observationListQuerySchema>;
export type CompareQuery = z.infer<typeof compareQuerySchema>;
export type ObservationInput = z.infer<typeof observationCreateSchema>;
