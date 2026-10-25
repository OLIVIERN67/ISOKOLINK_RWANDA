import { z } from "zod";

export const startConversationSchema = z.object({
  recipientId: z.coerce.number().int().positive("Select a recipient."),
  productId: z.coerce.number().int().positive().nullable().optional(),
  subject: z.string().trim().max(200).optional(),
  message: z.string().trim().min(1, "Write a message.").max(5000),
});

export const sendMessageSchema = z.object({
  body: z.string().trim().min(1, "Write a message.").max(5000),
});

export const conversationListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(60).default(20),
});

export const messageListQuerySchema = z.object({
  before: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});
