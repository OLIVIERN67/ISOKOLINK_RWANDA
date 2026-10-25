import { z } from "zod";

const optionalPhone = z
  .string()
  .trim()
  .max(30)
  .regex(/^[0-9+\-\s()]*$/, "Enter a valid phone number.")
  .optional()
  .nullable()
  .or(z.literal(""));

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(150).optional(),
  phone: optionalPhone,
  preferredLanguage: z.enum(["en", "rw", "fr"]).optional(),
  notificationEmailEnabled: z.boolean().optional(),
});

const safeImage = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) => value === "" || /^\/uploads\/[A-Za-z0-9._-]+$/.test(value) || /^https?:\/\/[^\s"'<>]+$/i.test(value),
    "Enter a valid image URL.",
  )
  .optional()
  .nullable();

export const sellerProfileSchema = z.object({
  businessName: z.string().trim().min(2, "Enter your business or display name.").max(150),
  description: z
    .string()
    .trim()
    .min(20, "Describe what you sell in at least 20 characters.")
    .max(2000),
  locationId: z.coerce.number().int().positive("Select your district."),
  marketId: z.coerce.number().int().positive().nullable().optional(),
  contactPhone: z
    .string()
    .trim()
    .min(7, "Enter a contact phone number.")
    .max(30)
    .regex(/^[0-9+\-\s()]+$/, "Enter a valid phone number."),
  preferredContact: z.enum(["message", "phone", "email"]).default("message"),
  publicContactVisibility: z.boolean().default(false),
  profileImageUrl: safeImage,
});

export const updateSellerProfileSchema = sellerProfileSchema.partial();

export type SellerProfileInput = z.infer<typeof sellerProfileSchema>;
