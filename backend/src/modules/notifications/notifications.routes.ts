import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { execute, query, queryOne } from "../../db/pool";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/errors";
import { ok } from "../../utils/http";
import { getPagination, paginationMeta } from "../../utils/pagination";

const idParams = z.object({ id: z.coerce.number().int().positive() });
const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(60).default(20),
  unreadOnly: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => value === true || value === "true"),
});

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  validate(listQuery, "query"),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const queryParams = req.query as never as { page: number; pageSize: number; unreadOnly?: boolean };
    const pagination = getPagination({ page: queryParams.page, pageSize: queryParams.pageSize });
    const where = ["user_id = ?"];
    const params: unknown[] = [userId];
    if (queryParams.unreadOnly) where.push("is_read = 0");
    const whereSql = where.join(" AND ");

    const totalRow = await queryOne<{ total: number } & import("mysql2/promise").RowDataPacket>(
      `SELECT COUNT(*) AS total FROM notifications WHERE ${whereSql}`,
      params,
    );
    const rows = await query<import("mysql2/promise").RowDataPacket[]>(
      `SELECT id, type, title, body, link, is_read, created_at, read_at
       FROM notifications WHERE ${whereSql}
       ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
      [...params, pagination.pageSize, pagination.offset],
    );
    return ok(
      res,
      rows.map((row) => ({
        id: Number(row.id),
        type: String(row.type),
        title: String(row.title),
        body: row.body === null ? null : String(row.body),
        link: row.link === null ? null : String(row.link),
        isRead: Boolean(row.is_read),
        createdAt: String(row.created_at),
        readAt: row.read_at === null ? null : String(row.read_at),
      })),
      200,
      paginationMeta(Number(totalRow?.total ?? 0), pagination),
    );
  }),
);

router.get(
  "/unread-count",
  asyncHandler(async (req, res) => {
    const row = await queryOne<import("mysql2/promise").RowDataPacket>(
      "SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0",
      [req.user!.id],
    );
    return ok(res, { count: Number(row?.count ?? 0) });
  }),
);

router.post(
  "/:id/read",
  validate(idParams, "params"),
  asyncHandler(async (req, res) => {
    const result = await execute(
      "UPDATE notifications SET is_read = 1, read_at = UTC_TIMESTAMP() WHERE id = ? AND user_id = ?",
      [Number(req.params.id), req.user!.id],
    );
    if (result.affectedRows === 0) throw ApiError.notFound("Notification not found.");
    return ok(res, { read: true });
  }),
);

router.post(
  "/read-all",
  asyncHandler(async (req, res) => {
    await execute(
      "UPDATE notifications SET is_read = 1, read_at = UTC_TIMESTAMP() WHERE user_id = ? AND is_read = 0",
      [req.user!.id],
    );
    return ok(res, { read: true });
  }),
);

export default router;
