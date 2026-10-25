import type { RowDataPacket } from "mysql2/promise";
import { execute, query, queryOne } from "../../db/pool";
import { createNotification, notifyAdmins } from "../../services/notification.service";
import { writeAuditLog } from "../../utils/audit";
import { ApiError } from "../../utils/errors";
import { getPagination, paginationMeta } from "../../utils/pagination";

interface ReportInput {
  productId?: number | null;
  reportedUserId?: number | null;
  reason: string;
  details: string;
}

export async function createReport(reporterId: number, input: ReportInput) {
  let productName: string | null = null;
  let reportedUserId = input.reportedUserId ?? null;

  if (input.productId) {
    const product = await queryOne<RowDataPacket>(
      "SELECT id, name, seller_id FROM products WHERE id = ? AND is_archived = 0",
      [input.productId],
    );
    if (!product) throw ApiError.notFound("Product not found.");
    productName = String(product.name);
    reportedUserId = reportedUserId ?? Number(product.seller_id);
    if (Number(product.seller_id) === reporterId) {
      throw ApiError.badRequest("You cannot report your own product.");
    }
    const duplicate = await queryOne<RowDataPacket>(
      "SELECT id FROM product_reports WHERE reporter_id = ? AND product_id = ? AND status IN ('open','under_review')",
      [reporterId, input.productId],
    );
    if (duplicate) throw ApiError.conflict("You already have an open report for this product.");
  }

  if (reportedUserId) {
    if (reportedUserId === reporterId) throw ApiError.badRequest("You cannot report yourself.");
    const reported = await queryOne<RowDataPacket>("SELECT id FROM users WHERE id = ?", [reportedUserId]);
    if (!reported) throw ApiError.notFound("The reported user was not found.");
  }

  const result = await execute(
    `INSERT INTO product_reports (product_id, reported_user_id, reporter_id, reason, details)
     VALUES (?, ?, ?, ?, ?)`,
    [input.productId ?? null, reportedUserId, reporterId, input.reason, input.details],
  );

  await notifyAdmins({
    type: "report_created",
    title: "New marketplace report",
    body: `${input.reason}${productName ? ` — ${productName}` : ""}`,
    link: "/admin/reports",
  });
  await createNotification({
    userId: reporterId,
    type: "report_received",
    title: "Report submitted",
    body: "Our moderation team will review the report. Thank you for helping keep ISOKOLINK safe.",
    link: "/dashboard/reports",
  });
  await writeAuditLog({
    actorId: reporterId,
    action: "report.created",
    entityType: "product_report",
    entityId: result.insertId,
    metadata: { reason: input.reason, productId: input.productId ?? null },
  });

  return { id: result.insertId, message: "Report submitted for review." };
}

const REPORT_LIST_SELECT = `
  SELECT r.id, r.reason, r.details, r.status, r.resolution_note, r.created_at, r.updated_at,
         r.resolved_at, r.product_id, p.name AS product_name,
         r.reporter_id, reporter.full_name AS reporter_name, reporter.email AS reporter_email,
         r.reported_user_id, reported.full_name AS reported_user_name,
         r.resolved_by, resolver.full_name AS resolver_name
  FROM product_reports r
  LEFT JOIN products p ON p.id = r.product_id
  JOIN users reporter ON reporter.id = r.reporter_id
  LEFT JOIN users reported ON reported.id = r.reported_user_id
  LEFT JOIN users resolver ON resolver.id = r.resolved_by
`;

function mapReport(row: RowDataPacket) {
  return {
    id: Number(row.id),
    reason: String(row.reason),
    details: row.details === null ? null : String(row.details),
    status: String(row.status),
    resolutionNote: row.resolution_note === null ? null : String(row.resolution_note),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    resolvedAt: row.resolved_at === null ? null : String(row.resolved_at),
    product: row.product_id === null ? null : { id: Number(row.product_id), name: String(row.product_name) },
    reporter: {
      id: Number(row.reporter_id),
      name: String(row.reporter_name),
      email: String(row.reporter_email),
    },
    reportedUser:
      row.reported_user_id === null
        ? null
        : { id: Number(row.reported_user_id), name: String(row.reported_user_name) },
    resolvedBy: row.resolved_by === null ? null : { id: Number(row.resolved_by), name: String(row.resolver_name) },
  };
}

export async function listMyReports(userId: number) {
  const rows = await query<RowDataPacket[]>(
    `${REPORT_LIST_SELECT} WHERE r.reporter_id = ? ORDER BY r.created_at DESC LIMIT 50`,
    [userId],
  );
  return rows.map(mapReport);
}

export async function listReports(filters: {
  status: string;
  q?: string;
  page: number;
  pageSize: number;
}) {
  const pagination = getPagination({ page: filters.page, pageSize: filters.pageSize });
  const where: string[] = [];
  const params: unknown[] = [];
  if (filters.status !== "all") {
    where.push("r.status = ?");
    params.push(filters.status);
  }
  if (filters.q) {
    where.push("(r.reason LIKE ? OR r.details LIKE ? OR p.name LIKE ?)");
    const term = `%${filters.q}%`;
    params.push(term, term, term);
  }
  const whereSql = where.length > 0 ? where.join(" AND ") : "1=1";
  const countRow = await queryOne<RowDataPacket>(
    `SELECT COUNT(*) AS total FROM product_reports r LEFT JOIN products p ON p.id = r.product_id WHERE ${whereSql}`,
    params,
  );
  const rows = await query<RowDataPacket[]>(
    `${REPORT_LIST_SELECT} WHERE ${whereSql} ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
    [...params, pagination.pageSize, pagination.offset],
  );
  return { items: rows.map(mapReport), meta: paginationMeta(Number(countRow?.total ?? 0), pagination) };
}

export async function updateReport(
  id: number,
  input: { status: "under_review" | "resolved" | "dismissed"; resolutionNote?: string | null },
  adminId: number,
  ip?: string,
) {
  const report = await queryOne<RowDataPacket>(
    "SELECT id, reporter_id, reported_user_id, product_id, status FROM product_reports WHERE id = ?",
    [id],
  );
  if (!report) throw ApiError.notFound("Report not found.");

  const resolved = input.status === "resolved" || input.status === "dismissed";
  await execute(
    `UPDATE product_reports SET status = ?, resolution_note = ?, resolved_by = ?, resolved_at = ?
     WHERE id = ?`,
    [
      input.status,
      input.resolutionNote ?? null,
      resolved ? adminId : null,
      resolved ? new Date().toISOString().slice(0, 19).replace("T", " ") : null,
      id,
    ],
  );

  await createNotification({
    userId: Number(report.reporter_id),
    type: "report_update",
    title: "Your report was reviewed",
    body:
      input.status === "under_review"
        ? "Our team is reviewing your report."
        : `Your report was marked ${input.status}.${input.resolutionNote ? ` ${input.resolutionNote}` : ""}`,
    link: "/dashboard/reports",
  });

  await writeAuditLog({
    actorId: adminId,
    action: "report.status_changed",
    entityType: "product_report",
    entityId: id,
    metadata: { status: input.status, note: input.resolutionNote ?? null },
    ipAddress: ip,
  });

  return { id, status: input.status };
}
