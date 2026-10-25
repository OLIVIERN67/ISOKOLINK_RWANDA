import { z } from "zod";

const id = (label: string) =>
  z.coerce.number({ invalid_type_error: `${label} is required.` }).int().positive(`${label} is required.`);

const imageUrl = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) => /^\/uploads\/[A-Za-z0-9._-]+$/.test(value) || /^https?:\/\/[^\s"'<>]+$/i.test(value),
    "Image URLs must be uploaded files or valid HTTP(S) URLs.",
  );

export const productCreateSchema = z.object({
  name: z.string().trim().min(2, "Enter a product name.").max(160),
  description: z
    .string()
    .trim()
    .min(20, "Describe the product in at least 20 characters.")
    .max(5000),
  categoryId: id("Category"),
  unitId: id("Unit"),
  price: z.coerce.number().positive("Price must be greater than zero.").max(999999999),
  currency: z.string().trim().length(3).default("RWF"),
  quantity: z.coerce.number().min(0, "Quantity cannot be negative.").max(999999999),
  locationId: id("Location"),
  marketId: z.coerce.number().int().positive().nullable().optional(),
  availability: z.enum(["available", "unavailable", "sold"]).default("available"),
  images: z.array(imageUrl).max(5, "You can attach up to 5 images.").default([]),
});

export const productUpdateSchema = productCreateSchema.partial().extend({
  images: z.array(imageUrl).max(5, "You can attach up to 5 images.").optional(),
});

export const availabilitySchema = z.object({
  availability: z.enum(["available", "unavailable", "sold"]),
  quantity: z.coerce.number().min(0).max(999999999).optional(),
});

export const productListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  category: z.string().trim().max(120).optional(),
  locationId: z.coerce.number().int().positive().optional(),
  marketId: z.coerce.number().int().positive().optional(),
  unitId: z.coerce.number().int().positive().optional(),
  sellerId: z.coerce.number().int().positive().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  availability: z.enum(["available", "unavailable", "sold"]).optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "featured"]).default("featured"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(60).default(12),
});

export const sellerProductQuerySchema = productListQuerySchema.extend({
  status: z
    .enum(["pending", "approved", "rejected", "requires_correction", "suspended", "all"])
    .default("all"),
  includeArchived: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => value === true || value === "true"),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductListQuery = z.infer<typeof productListQuerySchema>;
export type SellerProductQuery = z.infer<typeof sellerProductQuerySchema>;
