import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password is too long.")
  .regex(/[a-z]/, "Password must include a lowercase letter.")
  .regex(/[A-Z]/, "Password must include an uppercase letter.")
  .regex(/[0-9]/, "Password must include a number.");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.")
  .max(255);

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(150),
  email: emailSchema,
  password: passwordSchema,
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[0-9+\-\s()]*$/, "Enter a valid phone number.")
    .optional()
    .or(z.literal("")),
  preferredLanguage: z.enum(["en", "rw", "fr"]).default("en"),
  accountType: z.enum(["buyer", "seller"]).default("buyer"),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the terms and privacy policy." }),
  }),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password.").max(128),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
  token: z.string().min(10, "Reset token is required."),
  password: passwordSchema,
});

export const verifyEmailSchema = z.union([
  z.object({
    email: emailSchema,
    otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit verification code."),
  }),
  z.object({
    token: z.string().min(10, "Verification token is required."),
  }),
]);

export const resendVerificationSchema = z.object({ email: emailSchema });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
