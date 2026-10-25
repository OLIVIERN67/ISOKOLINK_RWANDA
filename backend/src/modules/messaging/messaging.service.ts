import type { RowDataPacket } from "mysql2/promise";
import { execute, query, queryOne, withTransaction } from "../../db/pool";
import { createNotification } from "../../services/notification.service";
import { ApiError } from "../../utils/errors";
import { getPagination, paginationMeta } from "../../utils/pagination";
import type { conversationListQuerySchema } from "./messaging.schemas";
import type { z } from "zod";

type ConversationQuery = z.infer<typeof conversationListQuerySchema>;

async function isParticipant(conversationId: number, userId: number): Promise<boolean> {
  const row = await queryOne<RowDataPacket>(
    "SELECT 1 AS ok FROM conversation_participants WHERE conversation_id = ? AND user_id = ?",
    [conversationId, userId],
  );
  return Boolean(row);
}

async function assertParticipant(conversationId: number, userId: number): Promise<void> {
  if (!(await isParticipant(conversationId, userId))) {
    throw ApiError.forbidden("You are not a participant in this conversation.");
  }
}

export async function startConversation(
  userId: number,
  isAdmin: boolean,
  input: { recipientId: number; productId?: number | null; subject?: string; message: string },
  senderName: string,
) {
  if (input.recipientId === userId) {
    throw ApiError.badRequest("You cannot start a conversation with yourself.");
  }

  const recipient = await queryOne<RowDataPacket>(
    `SELECT u.id, u.full_name, GROUP_CONCAT(r.name) AS roles
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     WHERE u.id = ? AND u.status = 'active'
     GROUP BY u.id`,
    [input.recipientId],
  );
  if (!recipient) throw ApiError.notFound("Recipient not found.");
  const recipientRoles = recipient.roles ? String(recipient.roles).split(",") : [];

  let product: { id: number; name: string; seller_id: number } | null = null;
  if (input.productId) {
    const row = await queryOne<RowDataPacket>(
      "SELECT id, name, seller_id FROM products WHERE id = ? AND is_archived = 0",
      [input.productId],
    );
    if (!row) throw ApiError.notFound("Product not found.");
    product = { id: Number(row.id), name: String(row.name), seller_id: Number(row.seller_id) };
    if (!isAdmin && product.seller_id !== input.recipientId) {
      throw ApiError.badRequest("The selected product does not belong to this seller.");
    }
  }

  if (!isAdmin && !recipientRoles.includes("seller")) {
    throw ApiError.badRequest("You can only contact registered sellers.");
  }
  if (!isAdmin && !recipientRoles.includes("admin") && !recipientRoles.includes("seller")) {
    throw ApiError.badRequest("You can only contact registered sellers.");
  }

  const existing = await queryOne<RowDataPacket>(
    `SELECT c.id FROM conversations c
     JOIN conversation_participants a ON a.conversation_id = c.id AND a.user_id = ?
     JOIN conversation_participants b ON b.conversation_id = c.id AND b.user_id = ?
     WHERE (c.product_id <=> ?) AND c.status <> 'archived'
     ORDER BY c.id ASC LIMIT 1`,
    [userId, input.recipientId, input.productId ?? null],
  );

  const conversationId = await withTransaction(async (connection) => {
    let id: number;
    if (existing) {
      id = Number(existing.id);
    } else {
      const subject =
        input.subject || (product ? `Inquiry about ${product.name}` : `Conversation with ${senderName}`);
      const [conversationResult] = await connection.execute(
        `INSERT INTO conversations (subject, product_id, created_by, last_message_at)
         VALUES (?, ?, ?, UTC_TIMESTAMP())`,
        [subject, input.productId ?? null, userId],
      );
      id = (conversationResult as { insertId: number }).insertId;
      await connection.execute(
        "INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)",
        [id, userId],
      );
      await connection.execute(
        "INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)",
        [id, input.recipientId],
      );
    }
    await connection.execute("INSERT INTO messages (conversation_id, sender_id, body) VALUES (?, ?, ?)", [
      id,
      userId,
      input.message,
    ]);
    await connection.execute("UPDATE conversations SET last_message_at = UTC_TIMESTAMP() WHERE id = ?", [id]);
    return id;
  });

  if (!existing) {
    await createNotification({
      userId: input.recipientId,
      type: "message",
      title: `New message from ${senderName}`,
      body: input.message.slice(0, 140),
      link: `/dashboard/conversations/${conversationId}`,
    });
  } else {
    await createNotification({
      userId: input.recipientId,
      type: "message",
      title: `New message from ${senderName}`,
      body: input.message.slice(0, 140),
      link: `/dashboard/conversations/${conversationId}`,
    });
  }

  return getConversation(userId, conversationId);
}

export async function listConversations(userId: number, filters: ConversationQuery) {
  const pagination = getPagination({ page: filters.page, pageSize: filters.pageSize });
  const search = filters.q ? `%${filters.q}%` : null;
  const where = ["cp.user_id = ?", "c.status <> 'archived'"];
  const params: unknown[] = [userId];
  if (search) {
    where.push(`(c.subject LIKE ? OR p.name LIKE ? OR EXISTS (
      SELECT 1 FROM conversation_participants cp3
      JOIN users u3 ON u3.id = cp3.user_id
      WHERE cp3.conversation_id = c.id AND cp3.user_id <> ? AND u3.full_name LIKE ?
    ))`);
    params.push(search, search, userId, search);
  }
  const whereSql = where.join(" AND ");

  const countRow = await queryOne<RowDataPacket>(
    `SELECT COUNT(*) AS total FROM conversations c
     JOIN conversation_participants cp ON cp.conversation_id = c.id
     LEFT JOIN products p ON p.id = c.product_id
     WHERE ${whereSql}`,
    params,
  );

  const rows = await query<RowDataPacket[]>(
    `SELECT c.id, c.subject, c.product_id, c.status, c.last_message_at, c.created_at,
            p.name AS product_name,
            (SELECT m.body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_message,
            (SELECT m.sender_id FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_sender_id,
            (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id <> ?
               AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)) AS unread_count,
            (SELECT u.id FROM conversation_participants cp2 JOIN users u ON u.id = cp2.user_id
               WHERE cp2.conversation_id = c.id AND cp2.user_id <> ? LIMIT 1) AS other_id,
            (SELECT u.full_name FROM conversation_participants cp2 JOIN users u ON u.id = cp2.user_id
               WHERE cp2.conversation_id = c.id AND cp2.user_id <> ? LIMIT 1) AS other_name,
            (SELECT sp.business_name FROM conversation_participants cp2
               JOIN seller_profiles sp ON sp.user_id = cp2.user_id
               WHERE cp2.conversation_id = c.id AND cp2.user_id <> ? LIMIT 1) AS other_business
     FROM conversations c
     JOIN conversation_participants cp ON cp.conversation_id = c.id
     LEFT JOIN products p ON p.id = c.product_id
     WHERE ${whereSql}
     ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
     LIMIT ? OFFSET ?`,
    [userId, userId, userId, userId, ...params, pagination.pageSize, pagination.offset],
  );

  return {
    items: rows.map((row) => ({
      id: Number(row.id),
      subject: row.subject === null ? null : String(row.subject),
      productId: row.product_id === null ? null : Number(row.product_id),
      productName: row.product_name === null ? null : String(row.product_name),
      status: String(row.status),
      lastMessageAt: row.last_message_at === null ? null : String(row.last_message_at),
      createdAt: String(row.created_at),
      lastMessage: row.last_message === null ? null : String(row.last_message),
      lastSenderId: row.last_sender_id === null ? null : Number(row.last_sender_id),
      unreadCount: Number(row.unread_count ?? 0),
      otherUser: {
        id: row.other_id === null ? null : Number(row.other_id),
        name: row.other_name === null ? "ISOKOLINK" : String(row.other_name),
        businessName: row.other_business === null ? null : String(row.other_business),
      },
    })),
    meta: paginationMeta(Number(countRow?.total ?? 0), pagination),
  };
}

export async function getConversation(userId: number, conversationId: number, before?: number, limit = 100) {
  await assertParticipant(conversationId, userId);

  const conversation = await queryOne<RowDataPacket>(
    `SELECT c.id, c.subject, c.status, c.product_id, c.created_at, c.last_message_at,
            p.name AS product_name, p.price AS product_price, p.currency AS product_currency
     FROM conversations c
     LEFT JOIN products p ON p.id = c.product_id
     WHERE c.id = ?`,
    [conversationId],
  );
  if (!conversation) throw ApiError.notFound("Conversation not found.");

  const participants = await query<RowDataPacket[]>(
    `SELECT u.id, u.full_name, u.status, sp.business_name, GROUP_CONCAT(DISTINCT r.name) AS roles
     FROM conversation_participants cp
     JOIN users u ON u.id = cp.user_id
     LEFT JOIN seller_profiles sp ON sp.user_id = u.id
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     WHERE cp.conversation_id = ?
     GROUP BY u.id, sp.business_name`,
    [conversationId],
  );

  const params: unknown[] = [conversationId];
  let beforeSql = "";
  if (before) {
    beforeSql = "AND m.id < ?";
    params.push(before);
  }
  params.push(limit);
  const messagesRaw = await query<RowDataPacket[]>(
    `SELECT m.id, m.sender_id, m.body, m.created_at, u.full_name AS sender_name, sp.business_name AS sender_business
     FROM messages m
     JOIN users u ON u.id = m.sender_id
     LEFT JOIN seller_profiles sp ON sp.user_id = u.id
     WHERE m.conversation_id = ? ${beforeSql}
     ORDER BY m.id DESC LIMIT ?`,
    params,
  );

  await execute(
    "UPDATE conversation_participants SET last_read_at = UTC_TIMESTAMP() WHERE conversation_id = ? AND user_id = ?",
    [conversationId, userId],
  );

  return {
    id: Number(conversation.id),
    subject: conversation.subject === null ? null : String(conversation.subject),
    status: String(conversation.status),
    productId: conversation.product_id === null ? null : Number(conversation.product_id),
    product: conversation.product_id
      ? {
          id: Number(conversation.product_id),
          name: String(conversation.product_name),
          price: Number(conversation.product_price),
          currency: String(conversation.product_currency),
        }
      : null,
    createdAt: String(conversation.created_at),
    lastMessageAt: conversation.last_message_at === null ? null : String(conversation.last_message_at),
    participants: participants.map((row) => ({
      id: Number(row.id),
      name: String(row.full_name),
      businessName: row.business_name === null ? null : String(row.business_name),
      roles: row.roles ? String(row.roles).split(",") : [],
      status: String(row.status),
    })),
    messages: messagesRaw
      .reverse()
      .map((row) => ({
        id: Number(row.id),
        senderId: Number(row.sender_id),
        senderName: String(row.sender_name),
        senderBusinessName: row.sender_business === null ? null : String(row.sender_business),
        body: String(row.body),
        createdAt: String(row.created_at),
        isMine: Number(row.sender_id) === userId,
      })),
  };
}

export async function sendMessage(userId: number, conversationId: number, body: string, senderName: string) {
  await assertParticipant(conversationId, userId);
  const conversation = await queryOne<RowDataPacket>(
    "SELECT id, status FROM conversations WHERE id = ?",
    [conversationId],
  );
  if (!conversation) throw ApiError.notFound("Conversation not found.");
  if (conversation.status === "archived") throw ApiError.badRequest("This conversation is archived.");

  const result = await execute(
    "INSERT INTO messages (conversation_id, sender_id, body) VALUES (?, ?, ?)",
    [conversationId, userId, body],
  );
  await execute("UPDATE conversations SET last_message_at = UTC_TIMESTAMP() WHERE id = ?", [conversationId]);
  await execute(
    "UPDATE conversation_participants SET last_read_at = UTC_TIMESTAMP() WHERE conversation_id = ? AND user_id = ?",
    [conversationId, userId],
  );

  const recipients = await query<RowDataPacket[]>(
    "SELECT user_id FROM conversation_participants WHERE conversation_id = ? AND user_id <> ?",
    [conversationId, userId],
  );
  await Promise.all(
    recipients.map((recipient) =>
      createNotification({
        userId: Number(recipient.user_id),
        type: "message",
        title: `New message from ${senderName}`,
        body: body.slice(0, 140),
        link: `/dashboard/conversations/${conversationId}`,
      }),
    ),
  );

  const row = await queryOne<RowDataPacket>(
    `SELECT m.id, m.sender_id, m.body, m.created_at, u.full_name AS sender_name
     FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.id = ?`,
    [result.insertId],
  );

  return {
    id: Number(row?.id ?? result.insertId),
    senderId: userId,
    senderName: row ? String(row.sender_name) : senderName,
    body,
    createdAt: row ? String(row.created_at) : new Date().toISOString(),
    isMine: true,
  };
}

export async function markConversationRead(userId: number, conversationId: number) {
  await assertParticipant(conversationId, userId);
  await execute(
    "UPDATE conversation_participants SET last_read_at = UTC_TIMESTAMP() WHERE conversation_id = ? AND user_id = ?",
    [conversationId, userId],
  );
  return { read: true };
}

export async function countUnreadConversations(userId: number) {
  const row = await queryOne<RowDataPacket>(
    `SELECT COUNT(DISTINCT m.conversation_id) AS count
     FROM messages m
     JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id AND cp.user_id = ?
     WHERE m.sender_id <> ? AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)`,
    [userId, userId],
  );
  return Number(row?.count ?? 0);
}
