import type { RowDataPacket } from "mysql2/promise";
import { execute, query, queryOne, withTransaction } from "../../db/pool";
import { createNotification } from "../../services/notification.service";
import { deleteUserSessions } from "../../services/session.service";
import { writeAuditLog } from "../../utils/audit";
import { ApiError } from "../../utils/errors";
import { getPagination, paginationMeta } from "../../utils/pagination";
import { STALE_AFTER_DAYS } from "../../utils/freshness";
import {
  findProductImages,
  findProductRowById,
  mapProduct,
  PRODUCT_SELECT,
  type ProductRow,
} from "../products/products.repository";
import { getProductApprovalHistory, notifySellerOfStatus } from "../products/products.service";
import { getSellerProfile } from "../users/users.service";
import type {
  adminProductQuerySchema,
  adminUserQuerySchema,
  auditLogQuerySchema,
} from "./admin.schemas";
import type { z } from "zod";

type AdminProductQuery = z.infer<typeof adminProductQuerySchema>;
type AdminUserQuery = z.infer<typeof adminUserQuerySchema>;
type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;

export async function listAdminProducts(filters: AdminProductQuery) {
  const pagination = getPagination({ page: filters.page, pageSize: filters.pageSize });
  const where: string[] = [];
  const params: unknown[] = [];
  if (filters.status !== "all") {
    where.push("p.approval_status = ?");
    params.push(filters.status);
  }
  if (!filters.includeArchived) where.push("p.is_archived = 0");
  if (filters.q) {
    where.push("(p.name LIKE ? OR p.description LIKE ? OR su.full_name LIKE ? OR sp.business_name LIKE ?)");
    const term = `%${filters.q}%`;
    params.push(term, term, term, term);
  }
  if (filters.sellerId) {
    where.push("p.seller_id = ?");
    params.push(filters.sellerId);
  }
  if (filters.categoryId) {
    where.push("p.category_id = ?");
    params.push(filters.categoryId);
  }
  const whereSql = where.length > 0 ? where.join(" AND ") : "1=1";
  const countRow = await queryOne<RowDataPacket>(
    `SELECT COUNT(*) AS total FROM products p
     JOIN users su ON su.id = p.seller_id
     LEFT JOIN seller_profiles sp ON sp.user_id = p.seller_id
     WHERE ${whereSql}`,
    params,
  );
  const rows = await query<ProductRow[]>(
    `${PRODUCT_SELECT} WHERE ${whereSql} ORDER BY
       FIELD(p.approval_status, 'pending', 'requires_correction', 'rejected', 'approved', 'suspended'),
       p.updated_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pagination.pageSize, pagination.offset],
  );
  return { items: rows.map(mapProduct), meta: paginationMeta(Number(countRow?.total ?? 0), pagination) };
}

export async function getAdminProduct(id: number) {
  const row = await findProductRowById(id);
  if (!row) throw ApiError.notFound("Product not found.");
  const images = await findProductImages(id);
  const history = await getProductApprovalHistory(id);
  return { ...mapProduct(row), images, approvalHistory: history };
}

async function moderationGuard(productId: number, adminId: number) {
  const row = await findProductRowById(productId);
  if (!row) throw ApiError.notFound("Product not found.");
  if (Number(row.seller_id) === adminId) {
    throw ApiError.forbidden("Administrators cannot moderate their own listings.");
  }
  if (row.is_archived) throw ApiError.badRequest("Archived listings cannot be moderated.");
  return row;
}

async function setApprovalStatus(
  productId: number,
  adminId: number,
  status: "approved" | "rejected" | "requires_correction" | "suspended",
  action: "approved" | "rejected" | "correction_requested" | "suspended" | "reinstated",
  reason: string | null,
  ip?: string,
) {
  const approved = status === "approved";
  await withTransaction(async (connection) => {
    await connection.execute(
      `UPDATE products SET approval_status = ?, approved_at = ?, approved_by = ?, rejection_reason = ?
       WHERE id = ?`,
      [
        status,
        approved ? new Date().toISOString().slice(0, 19).replace("T", " ") : null,
        approved ? adminId : null,
        approved ? null : reason,
        productId,
      ],
    );
    await connection.execute(
      "INSERT INTO product_approval_history (product_id, admin_id, action, reason) VALUES (?, ?, ?, ?)",
      [productId, adminId, action, reason],
    );
  });
  await writeAuditLog({
    actorId: adminId,
    action: `product.${action}`,
    entityType: "product",
    entityId: productId,
    metadata: { status, reason },
    ipAddress: ip,
  });
}

export async function approveProduct(productId: number, adminId: number, reason?: string | null, ip?: string) {
  const row = await moderationGuard(productId, adminId);
  await setApprovalStatus(productId, adminId, "approved", "approved", reason ?? null, ip);
  await notifySellerOfStatus(Number(row.seller_id), row.name, "approved", reason ?? null);
  return getAdminProduct(productId);
}

export async function rejectProduct(productId: number, adminId: number, reason: string, ip?: string) {
  const row = await moderationGuard(productId, adminId);
  await setApprovalStatus(productId, adminId, "rejected", "rejected", reason, ip);
  await notifySellerOfStatus(Number(row.seller_id), row.name, "rejected", reason);
  return getAdminProduct(productId);
}

export async function requestProductCorrection(
  productId: number,
  adminId: number,
  reason: string,
  ip?: string,
) {
  const row = await moderationGuard(productId, adminId);
  await setApprovalStatus(productId, adminId, "requires_correction", "correction_requested", reason, ip);
  await notifySellerOfStatus(Number(row.seller_id), row.name, "requires_correction", reason);
  return getAdminProduct(productId);
}

export async function suspendProduct(productId: number, adminId: number, reason: string, ip?: string) {
  const row = await moderationGuard(productId, adminId);
  await setApprovalStatus(productId, adminId, "suspended", "suspended", reason, ip);
  await notifySellerOfStatus(Number(row.seller_id), row.name, "suspended", reason);
  return getAdminProduct(productId);
}

export async function reinstateProduct(productId: number, adminId: number, reason?: string | null, ip?: string) {
  const row = await moderationGuard(productId, adminId);
  await setApprovalStatus(productId, adminId, "approved", "reinstated", reason ?? null, ip);
  await notifySellerOfStatus(Number(row.seller_id), row.name, "reinstated", reason ?? null);
  return getAdminProduct(productId);
}

export async function setProductFeatured(productId: number, adminId: number, isFeatured: boolean, ip?: string) {
  const product = await queryOne<RowDataPacket>(
    "SELECT id, approval_status, is_archived FROM products WHERE id = ?",
    [productId],
  );
  if (!product) throw ApiError.notFound("Product not found.");
  if (product.is_archived) throw ApiError.badRequest("Archived listings cannot be featured.");
  await execute("UPDATE products SET is_featured = ? WHERE id = ?", [isFeatured ? 1 : 0, productId]);
  await writeAuditLog({
    actorId: adminId,
    action: "product.featured",
    entityType: "product",
    entityId: productId,
    metadata: { isFeatured },
    ipAddress: ip,
  });
  return getAdminProduct(productId);
}

async function userRoles(userId: number): Promise<string[]> {
  const rows = await query<RowDataPacket[]>(
    `SELECT r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = ?`,
    [userId],
  );
  return rows.map((row) => String(row.name));
}

const USER_LIST_SELECT = `
  SELECT u.id, u.email, u.full_name, u.phone, u.status, u.is_email_verified,
         u.preferred_language, u.created_at, u.last_login_at,
         GROUP_CONCAT(DISTINCT r.name ORDER BY r.name) AS roles,
         sp.business_name, sp.status AS seller_status, sp.id AS seller_profile_id,
         (SELECT COUNT(*) FROM products p WHERE p.seller_id = u.id AND p.is_archived = 0) AS product_count,
         (SELECT COUNT(*) FROM product_reports pr WHERE pr.reported_user_id = u.id AND pr.status IN ('open','under_review')) AS open_reports
  FROM users u
  LEFT JOIN user_roles ur ON ur.user_id = u.id
  LEFT JOIN roles r ON r.id = ur.role_id
  LEFT JOIN seller_profiles sp ON sp.user_id = u.id
`;

function mapAdminUser(row: RowDataPacket) {
  return {
    id: Number(row.id),
    email: String(row.email),
    fullName: String(row.full_name),
    phone: row.phone === null ? null : String(row.phone),
    status: String(row.status),
    isEmailVerified: Boolean(row.is_email_verified),
    preferredLanguage: String(row.preferred_language),
    createdAt: String(row.created_at),
    lastLoginAt: row.last_login_at === null ? null : String(row.last_login_at),
    roles: row.roles ? String(row.roles).split(",") : [],
    businessName: row.business_name === null ? null : String(row.business_name),
    sellerStatus: row.seller_status === null ? null : String(row.seller_status),
    sellerProfileId: row.seller_profile_id === null ? null : Number(row.seller_profile_id),
    productCount: Number(row.product_count ?? 0),
    openReports: Number(row.open_reports ?? 0),
  };
}

export async function listAdminUsers(filters: AdminUserQuery) {
  const pagination = getPagination({ page: filters.page, pageSize: filters.pageSize });
  const where: string[] = [];
  const params: unknown[] = [];
  if (filters.status !== "all") {
    where.push("u.status = ?");
    params.push(filters.status);
  }
  if (filters.role !== "all") {
    where.push(
      "EXISTS (SELECT 1 FROM user_roles ur2 JOIN roles r2 ON r2.id = ur2.role_id WHERE ur2.user_id = u.id AND r2.name = ?)",
    );
    params.push(filters.role);
  }
  if (filters.q) {
    where.push("(u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR sp.business_name LIKE ?)");
    const term = `%${filters.q}%`;
    params.push(term, term, term, term);
  }
  const whereSql = where.length > 0 ? where.join(" AND ") : "1=1";
  const countRow = await queryOne<RowDataPacket>(
    `SELECT COUNT(*) AS total FROM users u LEFT JOIN seller_profiles sp ON sp.user_id = u.id WHERE ${whereSql}`,
    params,
  );
  const rows = await query<RowDataPacket[]>(
    `${USER_LIST_SELECT} WHERE ${whereSql} GROUP BY u.id, sp.id
     ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
    [...params, pagination.pageSize, pagination.offset],
  );
  return { items: rows.map(mapAdminUser), meta: paginationMeta(Number(countRow?.total ?? 0), pagination) };
}

export async function getAdminUser(userId: number) {
  const row = await queryOne<RowDataPacket>(
    `${USER_LIST_SELECT} WHERE u.id = ? GROUP BY u.id, sp.id`,
    [userId],
  );
  if (!row) throw ApiError.notFound("User not found.");
  const sellerProfile = await getSellerProfile(userId);
  const activity = await queryOne<RowDataPacket>(
    `SELECT
       (SELECT COUNT(*) FROM saved_products WHERE user_id = ?) AS saved_products,
       (SELECT COUNT(*) FROM conversation_participants WHERE user_id = ?) AS conversations,
       (SELECT COUNT(*) FROM product_reports WHERE reporter_id = ?) AS submitted_reports,
       (SELECT COUNT(*) FROM product_reports WHERE reported_user_id = ?) AS received_reports,
       (SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0) AS unread_notifications`,
    [userId, userId, userId, userId, userId],
  );
  const products = await query<RowDataPacket[]>(
    `SELECT id, name, price, currency, approval_status, availability, updated_at
     FROM products WHERE seller_id = ? AND is_archived = 0 ORDER BY updated_at DESC LIMIT 8`,
    [userId],
  );
  const reports = await query<RowDataPacket[]>(
    `SELECT id, reason, status, created_at FROM product_reports
     WHERE reported_user_id = ? ORDER BY created_at DESC LIMIT 8`,
    [userId],
  );
  return {
    ...mapAdminUser(row),
    sellerProfile,
    stats: {
      savedProducts: Number(activity?.saved_products ?? 0),
      conversations: Number(activity?.conversations ?? 0),
      submittedReports: Number(activity?.submitted_reports ?? 0),
      receivedReports: Number(activity?.received_reports ?? 0),
      unreadNotifications: Number(activity?.unread_notifications ?? 0),
    },
    recentProducts: products.map((product) => ({
      id: Number(product.id),
      name: String(product.name),
      price: Number(product.price),
      currency: String(product.currency),
      approvalStatus: String(product.approval_status),
      availability: String(product.availability),
      updatedAt: String(product.updated_at),
    })),
    recentReports: reports.map((report) => ({
      id: Number(report.id),
      reason: String(report.reason),
      status: String(report.status),
      createdAt: String(report.created_at),
    })),
  };
}

export async function suspendUser(
  userId: number,
  adminId: number,
  reason: string,
  ip?: string,
) {
  if (userId === adminId) throw ApiError.forbidden("You cannot suspend your own account.");
  const user = await queryOne<RowDataPacket>("SELECT id, full_name, status FROM users WHERE id = ?", [userId]);
  if (!user) throw ApiError.notFound("User not found.");
  const roles = await userRoles(userId);
  if (roles.includes("admin")) {
    throw ApiError.forbidden("Administrator accounts cannot be suspended from this screen.");
  }
  await execute("UPDATE users SET status = 'suspended' WHERE id = ?", [userId]);
  await deleteUserSessions(userId);
  await createNotification({
    userId,
    type: "account",
    title: "Account suspended",
    body: `Your account has been suspended. Reason: ${reason}`,
  });
  await writeAuditLog({
    actorId: adminId,
    action: "user.suspended",
    entityType: "user",
    entityId: userId,
    metadata: { reason },
    ipAddress: ip,
  });
  return getAdminUser(userId);
}

export async function reactivateUser(userId: number, adminId: number, ip?: string) {
  const user = await queryOne<RowDataPacket>("SELECT id, status FROM users WHERE id = ?", [userId]);
  if (!user) throw ApiError.notFound("User not found.");
  await execute("UPDATE users SET status = 'active' WHERE id = ?", [userId]);
  await createNotification({
    userId,
    type: "account",
    title: "Account reactivated",
    body: "Your account has been reactivated. You can sign in again.",
  });
  await writeAuditLog({
    actorId: adminId,
    action: "user.reactivated",
    entityType: "user",
    entityId: userId,
    ipAddress: ip,
  });
  return getAdminUser(userId);
}

export async function changeUserRole(
  userId: number,
  adminId: number,
  role: "admin" | "seller",
  action: "grant" | "revoke",
  ip?: string,
) {
  const user = await queryOne<RowDataPacket>("SELECT id FROM users WHERE id = ?", [userId]);
  if (!user) throw ApiError.notFound("User not found.");
  const roles = await userRoles(userId);

  if (action === "revoke" && role === "seller") {
    throw ApiError.badRequest(
      "Seller capability cannot be revoked while a seller profile exists. Suspend the seller account instead.",
    );
  }
  if (action === "grant" && role === "seller" && !roles.includes("seller")) {
    const profile = await queryOne<RowDataPacket>("SELECT id FROM seller_profiles WHERE user_id = ?", [userId]);
    if (!profile) throw ApiError.badRequest("The user must complete seller registration first.");
  }
  if (action === "revoke" && role === "admin") {
    if (userId === adminId) throw ApiError.forbidden("You cannot remove your own administrator role.");
    const adminCount = await queryOne<RowDataPacket>(
      `SELECT COUNT(DISTINCT ur.user_id) AS total FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE r.name = 'admin'`,
    );
    if (Number(adminCount?.total ?? 0) <= 1) {
      throw ApiError.badRequest("At least one administrator must remain.");
    }
  }

  const roleRow = await queryOne<RowDataPacket>("SELECT id FROM roles WHERE name = ?", [role]);
  if (!roleRow) throw ApiError.notFound("Role not found.");

  if (action === "grant") {
    await execute("INSERT IGNORE INTO user_roles (user_id, role_id, granted_by) VALUES (?, ?, ?)", [
      userId,
      roleRow.id,
      adminId,
    ]);
  } else {
    await execute("DELETE FROM user_roles WHERE user_id = ? AND role_id = ?", [userId, roleRow.id]);
    if (role === "admin") {
      await deleteUserSessions(userId);
    }
  }

  await writeAuditLog({
    actorId: adminId,
    action: `user.role_${action}`,
    entityType: "user",
    entityId: userId,
    metadata: { role },
    ipAddress: ip,
  });
  return getAdminUser(userId);
}

export async function listAuditLogs(filters: AuditLogQuery) {
  const pagination = getPagination({ page: filters.page, pageSize: filters.pageSize });
  const where: string[] = [];
  const params: unknown[] = [];
  if (filters.action) {
    where.push("a.action = ?");
    params.push(filters.action);
  }
  if (filters.entityType) {
    where.push("a.entity_type = ?");
    params.push(filters.entityType);
  }
  if (filters.actorId) {
    where.push("a.actor_id = ?");
    params.push(filters.actorId);
  }
  if (filters.from) {
    where.push("a.created_at >= ?");
    params.push(`${filters.from} 00:00:00`);
  }
  if (filters.to) {
    where.push("a.created_at <= ?");
    params.push(`${filters.to} 23:59:59`);
  }
  if (filters.q) {
    where.push("(a.action LIKE ? OR a.entity_type LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?)");
    const term = `%${filters.q}%`;
    params.push(term, term, term, term);
  }
  const whereSql = where.length > 0 ? where.join(" AND ") : "1=1";
  const countRow = await queryOne<RowDataPacket>(
    `SELECT COUNT(*) AS total FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id WHERE ${whereSql}`,
    params,
  );
  const rows = await query<RowDataPacket[]>(
    `SELECT a.id, a.action, a.entity_type, a.entity_id, a.metadata, a.ip_address, a.created_at,
            u.id AS actor_id, u.full_name AS actor_name, u.email AS actor_email
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a.actor_id
     WHERE ${whereSql}
     ORDER BY a.created_at DESC, a.id DESC LIMIT ? OFFSET ?`,
    [...params, pagination.pageSize, pagination.offset],
  );
  return {
    items: rows.map((row) => ({
      id: Number(row.id),
      action: String(row.action),
      entityType: String(row.entity_type),
      entityId: row.entity_id === null ? null : String(row.entity_id),
      metadata: row.metadata ?? null,
      ipAddress: row.ip_address === null ? null : String(row.ip_address),
      createdAt: String(row.created_at),
      actor:
        row.actor_id === null
          ? null
          : {
              id: Number(row.actor_id),
              name: row.actor_name === null ? null : String(row.actor_name),
              email: row.actor_email === null ? null : String(row.actor_email),
            },
    })),
    meta: paginationMeta(Number(countRow?.total ?? 0), pagination),
  };
}

function lastNDays(days: number): string[] {
  const result: string[] = [];
  const now = new Date();
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - index));
    result.push(date.toISOString().slice(0, 10));
  }
  return result;
}

export async function getDashboardStats() {
  const counts = await queryOne<RowDataPacket>(
    `SELECT
       (SELECT COUNT(*) FROM users) AS total_users,
       (SELECT COUNT(*) FROM users WHERE status = 'active') AS active_users,
       (SELECT COUNT(*) FROM users WHERE status = 'suspended') AS suspended_users,
       (SELECT COUNT(DISTINCT ur.user_id) FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE r.name = 'buyer') AS buyers,
       (SELECT COUNT(DISTINCT ur.user_id) FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE r.name = 'seller') AS sellers,
       (SELECT COUNT(*) FROM seller_profiles WHERE status = 'active') AS active_sellers,
       (SELECT COUNT(*) FROM products WHERE is_archived = 0) AS total_products,
       (SELECT COUNT(*) FROM products WHERE approval_status = 'pending' AND is_archived = 0) AS pending_products,
       (SELECT COUNT(*) FROM products WHERE approval_status = 'approved' AND is_archived = 0) AS approved_products,
       (SELECT COUNT(*) FROM products WHERE approval_status = 'rejected' AND is_archived = 0) AS rejected_products,
       (SELECT COUNT(*) FROM products WHERE approval_status = 'requires_correction' AND is_archived = 0) AS correction_products,
       (SELECT COUNT(*) FROM product_reports WHERE status = 'open') AS open_reports,
       (SELECT COUNT(*) FROM product_reports WHERE status = 'under_review') AS review_reports,
       (SELECT COUNT(*) FROM market_price_observations) AS price_observations,
       (SELECT COUNT(*) FROM market_price_observations WHERE observed_on < DATE_SUB(CURDATE(), INTERVAL ? DAY)) AS stale_observations,
       (SELECT COUNT(*) FROM conversations) AS conversations,
       (SELECT COUNT(*) FROM messages) AS messages,
       (SELECT COUNT(*) FROM announcements WHERE is_published = 1) AS announcements`,
    [STALE_AFTER_DAYS],
  );

  const recentUsers = await query<RowDataPacket[]>(
    `SELECT u.id, u.full_name, u.email, u.status, u.created_at,
            GROUP_CONCAT(DISTINCT r.name) AS roles
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     GROUP BY u.id ORDER BY u.created_at DESC LIMIT 6`,
  );

  const recentActivity = await query<RowDataPacket[]>(
    `SELECT a.id, a.action, a.entity_type, a.entity_id, a.created_at, u.full_name AS actor_name
     FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id
     ORDER BY a.created_at DESC, a.id DESC LIMIT 8`,
  );

  const statusRows = await query<RowDataPacket[]>(
    `SELECT approval_status AS status, COUNT(*) AS count FROM products
     WHERE is_archived = 0 GROUP BY approval_status`,
  );
  const statusMap: Record<string, number> = {};
  for (const row of statusRows) statusMap[String(row.status)] = Number(row.count);

  const categoryRows = await query<RowDataPacket[]>(
    `SELECT c.name, COUNT(p.id) AS count
     FROM categories c
     LEFT JOIN products p ON p.category_id = c.id AND p.approval_status = 'approved' AND p.is_archived = 0
     GROUP BY c.id, c.name ORDER BY count DESC LIMIT 8`,
  );

  const registrationRows = await query<RowDataPacket[]>(
    `SELECT DATE(created_at) AS day, COUNT(*) AS count FROM users
     WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
     GROUP BY DATE(created_at)`,
  );
  const productRows = await query<RowDataPacket[]>(
    `SELECT DATE(created_at) AS day, COUNT(*) AS count FROM products
     WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
     GROUP BY DATE(created_at)`,
  );
  const days = lastNDays(7);
  const registrationMap = new Map(registrationRows.map((row) => [String(row.day).slice(0, 10), Number(row.count)]));
  const productMap = new Map(productRows.map((row) => [String(row.day).slice(0, 10), Number(row.count)]));

  return {
    totals: {
      users: Number(counts?.total_users ?? 0),
      activeUsers: Number(counts?.active_users ?? 0),
      suspendedUsers: Number(counts?.suspended_users ?? 0),
      buyers: Number(counts?.buyers ?? 0),
      sellers: Number(counts?.sellers ?? 0),
      activeSellers: Number(counts?.active_sellers ?? 0),
      products: Number(counts?.total_products ?? 0),
      pendingProducts: Number(counts?.pending_products ?? 0),
      approvedProducts: Number(counts?.approved_products ?? 0),
      rejectedProducts: Number(counts?.rejected_products ?? 0),
      correctionProducts: Number(counts?.correction_products ?? 0),
      openReports: Number(counts?.open_reports ?? 0),
      reviewReports: Number(counts?.review_reports ?? 0),
      priceObservations: Number(counts?.price_observations ?? 0),
      staleObservations: Number(counts?.stale_observations ?? 0),
      conversations: Number(counts?.conversations ?? 0),
      messages: Number(counts?.messages ?? 0),
      announcements: Number(counts?.announcements ?? 0),
    },
    productStatus: statusMap,
    categories: categoryRows.map((row) => ({ name: String(row.name), count: Number(row.count) })),
    activityTrend: days.map((day) => ({
      date: day,
      registrations: registrationMap.get(day) ?? 0,
      products: productMap.get(day) ?? 0,
    })),
    recentUsers: recentUsers.map((row) => ({
      id: Number(row.id),
      fullName: String(row.full_name),
      email: String(row.email),
      status: String(row.status),
      createdAt: String(row.created_at),
      roles: row.roles ? String(row.roles).split(",") : [],
    })),
    recentActivity: recentActivity.map((row) => ({
      id: Number(row.id),
      action: String(row.action),
      entityType: String(row.entity_type),
      entityId: row.entity_id === null ? null : String(row.entity_id),
      createdAt: String(row.created_at),
      actorName: row.actor_name === null ? "System" : String(row.actor_name),
    })),
  };
}
