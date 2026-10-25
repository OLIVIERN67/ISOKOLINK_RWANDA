import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { messageLimiter } from "../../middleware/rateLimit";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/asyncHandler";
import { created, ok } from "../../utils/http";
import {
  countUnreadConversations,
  getConversation,
  listConversations,
  markConversationRead,
  sendMessage,
  startConversation,
} from "./messaging.service";
import {
  conversationListQuerySchema,
  messageListQuerySchema,
  sendMessageSchema,
  startConversationSchema,
} from "./messaging.schemas";

const idParams = z.object({ id: z.coerce.number().int().positive() });

export const conversationsRouter = Router();
conversationsRouter.use(requireAuth);

conversationsRouter.get(
  "/",
  validate(conversationListQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const result = await listConversations(req.user!.id, req.query as never);
    return ok(res, result.items, 200, result.meta);
  }),
);

conversationsRouter.get(
  "/unread-count",
  asyncHandler(async (req, res) => ok(res, { count: await countUnreadConversations(req.user!.id) })),
);

conversationsRouter.post(
  "/",
  messageLimiter,
  validate(startConversationSchema),
  asyncHandler(async (req, res) => {
    const senderName = req.user!.sellerBusinessName || req.user!.fullName;
    const conversation = await startConversation(
      req.user!.id,
      req.user!.roles.includes("admin"),
      req.body,
      senderName,
    );
    return created(res, conversation);
  }),
);

conversationsRouter.get(
  "/:id",
  validate(idParams, "params"),
  validate(messageListQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as never as { before?: number; limit: number };
    return ok(res, await getConversation(req.user!.id, Number(req.params.id), query.before, query.limit));
  }),
);

conversationsRouter.post(
  "/:id/messages",
  messageLimiter,
  validate(idParams, "params"),
  validate(sendMessageSchema),
  asyncHandler(async (req, res) => {
    const senderName = req.user!.sellerBusinessName || req.user!.fullName;
    const message = await sendMessage(req.user!.id, Number(req.params.id), req.body.body, senderName);
    return created(res, message);
  }),
);

conversationsRouter.post(
  "/:id/read",
  validate(idParams, "params"),
  asyncHandler(async (req, res) =>
    ok(res, await markConversationRead(req.user!.id, Number(req.params.id))),
  ),
);
