import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { execute, query, queryOne, withTransaction } from "../../db/pool";
import { notifyAdmins, createNotification } from "../../services/notification.service";
import { writeAuditLog } from "../../utils/audit";
import { ApiError } from "../../utils/errors";
import { getPagination, paginationMeta } from "../../utils/pagination";
import {
  findProductImages,
  findProductRowById,
  mapProduct,
  PRODUCT_SELECT,
  type ProductRow,
} from "./products.repository";
import type { ProductCreateInput, ProductListQuery, SellerProductQuery } from "./products.schemas";

type PublicFilters = Pick<
  ProductListQuery,
  | "q"
  | "categoryId"
  | "category"
  | "locationId"
  | "marketId"
  | "unitId"
  | "sellerId"
  | "minPrice"
  | "maxPrice"
  | "sort"
  | "page"
  | "pageSize"
>;

function addPublicFilters(where: string[], params: unknown[], filters: PublicFilters): void {
  if (filters.q) {
    where.push("(p.name LIKE ? OR p.description LIKE ? OR c.name LIKE ?)");
    const term = `%${filters.q}%`;
    params.push(term, term, term);
  }
  if (filters.categoryId) {
    where.push("p.category_id = ?");
    params.push(filters.categoryId);
  }
  if (filters.category) {
    where.push("c.slug = ?");
    params.push(filters.category);
  }
  if (filters.locationId) {
    where.push("(p.location_id = ? OR l.parent_id = ?)");
    params.push(filters.locationId, filters.locationId);
  }
  if (filters.marketId) {
    where.push("p.market_id = ?");
    params.push(filters.marketId);
  }
  if (filters.unitId) {
    where.push("p.unit_id = ?");
    params.push(filters.unitId);
  }
  if (filters.sellerId) {
    where.push("p.seller_id = ?");
    params.push(filters.sellerId);
  }
  if (filters.minPrice !== undefined) {
    where.push("p.price >= ?");
    params.push(filters.minPrice);
  }
  if (filters.maxPrice !== undefined) {
    where.push("p.price <= ?");
    params.push(filters.maxPrice);
  }
}

function sortClause(sort: PublicFilters["sort"]): string {
  switch (sort) {
    case "price_asc":
      return "p.price ASC, p.updated_at DESC";
    case "price_desc":
      return "p.price DESC, p.updated_at DESC";
    case "newest":
      return "p.updated_at DESC";
    default:
      return "p.is_featured DESC, p.updated_at DESC";
  }
}

export async function listPublicProducts(filters: PublicFilters) {
  const pagination = getPagination({ page: filters.page, pageSize: filters.pageSize });
  const where = [
    "p.approval_status = 'approved'",
    "p.is_archived = 0",
    "p.availability = 'available'",
    "su.status = 'active'",
    "(sp.status IS NULL OR sp.status = 'active')",
  ];
  const params: unknown[] = [];
  addPublicFilters(where, params, filters);

  const whereSql = where.join(" AND ");
  const countRow = await queryOne<RowDataPacket>(
    `SELECT COUNT(*) AS total FROM products p
     JOIN categories c ON c.id = p.category_id
     JOIN locations l ON l.id = p.location_id
     JOIN users su ON su.id = p.seller_id
     LEFT JOIN seller_profiles sp ON sp.user_id = p.seller_id
     WHERE ${whereSql}`,
    params,
  );

  const rows = await query<ProductRow[]>(
    `${PRODUCT_SELECT} WHERE ${whereSql} ORDER BY ${sortClause(filters.sort)} LIMIT ? OFFSET ?`,
    [...params, pagination.pageSize, pagination.offset],
  );

  return {
    items: rows.map(mapProduct),
    meta: paginationMeta(Number(countRow?.total ?? 0), pagination),
  };
}

export async function getPublicProduct(id: number, viewerId?: number) {
  const row = await findProductRowById(id);
  if (!row) throw ApiError.notFound("Product not found.");
  const isOwner = viewerId !== undefined && Number(row.seller_id) === viewerId;
  const isPublic = row.approval_status === "approved" && !row.is_archived;
  if (!isPublic && !isOwner) {
    throw ApiError.notFound("Product not found.");
  }
  const images = await findProductImages(id);
  let isSaved = false;
  if (viewerId) {
    const saved = await queryOne<RowDataPacket>(
      "SELECT 1 AS saved FROM saved_products WHERE user_id = ? AND product_id = ?",
      [viewerId, id],
    );
    isSaved = Boolean(saved);
  }
  return { ...mapProduct(row), images, isSaved };
}

async function validateReferences(input: {
  categoryId?: number;
  unitId?: number;
  locationId?: number;
  marketId?: number | null;
}): Promise<void> {
  if (input.categoryId !== undefined) {
    const category = await queryOne<RowDataPacket>(
      "SELECT id FROM categories WHERE id = ? AND is_active = 1",
      [input.categoryId],
    );
    if (!category) throw ApiError.badRequest("The selected category is not available.");
  }
  if (input.unitId !== undefined) {
    const unit = await queryOne<RowDataPacket>("SELECT id FROM units WHERE id = ? AND is_active = 1", [input.unitId]);
    if (!unit) throw ApiError.badRequest("The selected unit is not available.");
  }
  if (input.locationId !== undefined) {
    const location = await queryOne<RowDataPacket>(
      "SELECT id FROM locations WHERE id = ? AND type = 'district'",
      [input.locationId],
    );
    if (!location) throw ApiError.badRequest("Select a valid district.");
  }
  if (input.marketId) {
    const market = await queryOne<RowDataPacket>(
      "SELECT id, location_id FROM markets WHERE id = ? AND is_active = 1",
      [input.marketId],
    );
    if (!market) throw ApiError.badRequest("The selected market is not available.");
    if (input.locationId !== undefined && Number(market.location_id) !== input.locationId) {
      throw ApiError.badRequest("The selected market is not in the selected district.");
    }
  }
}

async function replaceImages(
  connection: PoolConnection,
  productId: number,
  images: string[],
  productName: string,
): Promise<void> {
  await connection.execute("DELETE FROM product_images WHERE product_id = ?", [productId]);
  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];
    if (!image) continue;
    await connection.execute(
      "INSERT INTO product_images (product_id, url, alt_text, is_primary, sort_order) VALUES (?, ?, ?, ?, ?)",
      [productId, image, productName, index === 0 ? 1 : 0, index],
    );
  }
}

export async function createProduct(sellerId: number, input: ProductCreateInput, ip?: string) {
  await validateReferences(input);
  const productId = await withTransaction(async (connection) => {
    const [result] = await connection.execute(
      `INSERT INTO products
        (seller_id, category_id, unit_id, name, description, price, currency, quantity,
         location_id, market_id, availability, approval_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        sellerId,
        input.categoryId,
        input.unitId,
        input.name,
        input.description,
        input.price,
        input.currency.toUpperCase(),
        input.quantity,
        input.locationId,
        input.marketId ?? null,
        input.availability,
      ],
    );
    const insertId = (result as { insertId: number }).insertId;
    await replaceImages(connection, insertId, input.images, input.name);
    await connection.execute(
      "INSERT INTO product_approval_history (product_id, admin_id, action, reason) VALUES (?, ?, 'submitted', NULL)",
      [insertId, sellerId],
    );
    return insertId;
  });

  await notifyAdmins({
    type: "product_pending",
    title: "New listing awaiting review",
    body: `${input.name} was submitted for approval.`,
    link: `/admin/products?status=pending`,
  });
  await writeAuditLog({
    actorId: sellerId,
    action: "product.submitted",
    entityType: "product",
    entityId: productId,
    ipAddress: ip,
  });

  const row = await findProductRowById(productId);
  return row ? mapProduct(row) : null;
}

export async function getOwnerProduct(sellerId: number, productId: number) {
  const row = await findProductRowById(productId);
  if (!row) throw ApiError.notFound("Product not found.");
  if (Number(row.seller_id) !== sellerId) {
    throw ApiError.forbidden("You can only manage your own listings.");
  }
  const images = await findProductImages(productId);
  return { ...mapProduct(row), images };
}

const SUBSTANTIAL_FIELDS = [
  "name",
  "description",
  "categoryId",
  "unitId",
  "price",
  "quantity",
  "locationId",
  "marketId",
] as const;

export async function updateProduct(
  sellerId: number,
  productId: number,
  input: Partial<ProductCreateInput>,
  ip?: string,
) {
  const row = await findProductRowById(productId);
  if (!row) throw ApiError.notFound("Product not found.");
  if (Number(row.seller_id) !== sellerId) {
    throw ApiError.forbidden("You can only manage your own listings.");
  }
  if (row.is_archived) throw ApiError.badRequest("Archived listings cannot be edited.");

  await validateReferences(input);

  const currentImages = await findProductImages(productId);
  const imagesChanged =
    input.images !== undefined &&
    JSON.stringify(input.images) !== JSON.stringify(currentImages.map((image) => image.url));

  const substantial =
    imagesChanged ||
    SUBSTANTIAL_FIELDS.some((field) => {
      if (input[field] === undefined) return false;
      if (field === "price") return Number(input.price) !== Number(row.price);
      if (field === "quantity") return Number(input.quantity) !== Number(row.quantity);
      if (field === "categoryId") return Number(input.categoryId) !== Number(row.category_id);
      if (field === "unitId") return Number(input.unitId) !== Number(row.unit_id);
      if (field === "locationId") return Number(input.locationId) !== Number(row.location_id);
      if (field === "marketId") return (input.marketId ?? null) !== (row.market_id ?? null);
      return String(input[field]) !== String(row[field as keyof ProductRow] ?? "");
    });

  const requiresReview = substantial && row.approval_status === "approved";
  const nextStatus =
    row.approval_status === "approved" && !substantial
      ? "approved"
      : requiresReview
        ? "pending"
        : ["rejected", "requires_correction"].includes(row.approval_status) && substantial
          ? "pending"
          : row.approval_status;

  await withTransaction(async (connection) => {
    const updates: string[] = [];
    const params: any[] = [];
    const mapping: Record<string, string> = {
      name: "name",
      description: "description",
      categoryId: "category_id",
      unitId: "unit_id",
      price: "price",
      currency: "currency",
      quantity: "quantity",
      locationId: "location_id",
      marketId: "market_id",
      availability: "availability",
    };
    for (const [key, column] of Object.entries(mapping)) {
      const value = input[key as keyof ProductCreateInput];
      if (value !== undefined) {
        updates.push(`${column} = ?`);
        params.push(key === "currency" ? String(value).toUpperCase() : (value ?? null));
      }
    }
    if (nextStatus !== row.approval_status) {
      updates.push("approval_status = ?");
      params.push(nextStatus);
      updates.push("rejection_reason = NULL");
      updates.push("approved_at = NULL");
      updates.push("approved_by = NULL");
      updates.push("submitted_at = UTC_TIMESTAMP()");
    }
    if (updates.length > 0) {
      params.push(productId);
      await connection.execute(`UPDATE products SET ${updates.join(", ")} WHERE id = ?`, params);
    }
    if (input.images !== undefined) {
      await replaceImages(connection, productId, input.images, input.name ?? row.name);
    }
    if (substantial) {
      await connection.execute(
        "INSERT INTO product_approval_history (product_id, admin_id, action, reason) VALUES (?, ?, 'seller_edited', ?)",
        [productId, sellerId, requiresReview ? "Substantial edit requires renewed approval." : "Listing updated."],
      );
    }
  });

  if (requiresReview) {
    await notifyAdmins({
      type: "product_pending",
      title: "Listing edited and needs re-approval",
      body: `${row.name} was edited by the seller and requires review.`,
      link: "/admin/products?status=pending",
    });
  }
  await writeAuditLog({
    actorId: sellerId,
    action: "product.updated",
    entityType: "product",
    entityId: productId,
    metadata: { requiresReview },
    ipAddress: ip,
  });

  return getOwnerProduct(sellerId, productId);
}

export async function setProductAvailability(
  sellerId: number,
  productId: number,
  availability: "available" | "unavailable" | "sold",
  quantity?: number,
) {
  const row = await findProductRowById(productId);
  if (!row) throw ApiError.notFound("Product not found.");
  if (Number(row.seller_id) !== sellerId) throw ApiError.forbidden("You can only manage your own listings.");
  if (quantity === undefined) {
    await execute("UPDATE products SET availability = ? WHERE id = ?", [availability, productId]);
  } else {
    await execute("UPDATE products SET availability = ?, quantity = ? WHERE id = ?", [
      availability,
      quantity,
      productId,
    ]);
  }
  return getOwnerProduct(sellerId, productId);
}

export async function archiveProduct(sellerId: number, productId: number, ip?: string) {
  const row = await findProductRowById(productId);
  if (!row) throw ApiError.notFound("Product not found.");
  if (Number(row.seller_id) !== sellerId) throw ApiError.forbidden("You can only manage your own listings.");
  await execute("UPDATE products SET is_archived = 1, availability = 'unavailable' WHERE id = ?", [productId]);
  await writeAuditLog({
    actorId: sellerId,
    action: "product.archived",
    entityType: "product",
    entityId: productId,
    ipAddress: ip,
  });
}

export async function listSellerProducts(sellerId: number, filters: SellerProductQuery) {
  const pagination = getPagination({ page: filters.page, pageSize: filters.pageSize });
  const where = ["p.seller_id = ?"];
  const params: unknown[] = [sellerId];
  if (!filters.includeArchived) where.push("p.is_archived = 0");
  if (filters.status !== "all") {
    where.push("p.approval_status = ?");
    params.push(filters.status);
  }
  if (filters.q) {
    where.push("(p.name LIKE ? OR p.description LIKE ?)");
    params.push(`%${filters.q}%`, `%${filters.q}%`);
  }
  if (filters.categoryId) {
    where.push("p.category_id = ?");
    params.push(filters.categoryId);
  }
  const whereSql = where.join(" AND ");
  const countRow = await queryOne<RowDataPacket>(
    `SELECT COUNT(*) AS total FROM products p WHERE ${whereSql}`,
    params,
  );
  const rows = await query<ProductRow[]>(
    `${PRODUCT_SELECT} WHERE ${whereSql} ORDER BY p.updated_at DESC LIMIT ? OFFSET ?`,
    [...params, pagination.pageSize, pagination.offset],
  );
  return {
    items: rows.map(mapProduct),
    meta: paginationMeta(Number(countRow?.total ?? 0), pagination),
  };
}

export async function getSellerStats(sellerId: number) {
  const rows = await query<RowDataPacket[]>(
    `SELECT approval_status, availability, COUNT(*) AS count
     FROM products WHERE seller_id = ? AND is_archived = 0
     GROUP BY approval_status, availability`,
    [sellerId],
  );
  const counts: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    requiresCorrection: number;
    suspended: number;
    sold: number;
    unavailable: number;
  } = {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    requiresCorrection: 0,
    suspended: 0,
    sold: 0,
    unavailable: 0,
  };
  for (const row of rows) {
    const count = Number(row.count);
    counts.total += count;
    const status = String(row.approval_status);
    if (status === "pending") counts.pending += count;
    else if (status === "approved") counts.approved += count;
    else if (status === "rejected") counts.rejected += count;
    else if (status === "requires_correction") counts.requiresCorrection += count;
    else if (status === "suspended") counts.suspended += count;
    if (row.availability === "sold") counts.sold += count;
    if (row.availability === "unavailable") counts.unavailable += count;
  }

  const recent = await query<ProductRow[]>(
    `${PRODUCT_SELECT} WHERE p.seller_id = ? AND p.is_archived = 0 ORDER BY p.updated_at DESC LIMIT 5`,
    [sellerId],
  );
  const unreadMessages = await queryOne<RowDataPacket>(
    `SELECT COUNT(*) AS count FROM messages m
     JOIN conversations c ON c.id = m.conversation_id
     JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = ?
     WHERE m.sender_id <> ? AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)`,
    [sellerId, sellerId],
  );
  const recentMessages = await query<RowDataPacket[]>(
    `SELECT c.id AS conversation_id, m.body, m.created_at, u.full_name AS sender_name,
            p.name AS product_name,
            CASE WHEN cp.last_read_at IS NULL OR m.created_at > cp.last_read_at THEN 1 ELSE 0 END AS is_unread
     FROM conversations c
     JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = ?
     JOIN messages m ON m.id = (
       SELECT incoming.id FROM messages incoming
       WHERE incoming.conversation_id = c.id AND incoming.sender_id <> ?
       ORDER BY incoming.id DESC LIMIT 1
     )
     JOIN users u ON u.id = m.sender_id
     LEFT JOIN products p ON p.id = c.product_id
     WHERE c.status <> 'archived'
     ORDER BY m.created_at DESC, m.id DESC
     LIMIT 5`,
    [sellerId, sellerId],
  );

  return {
    counts,
    recentProducts: recent.map(mapProduct),
    unreadMessages: Number(unreadMessages?.count ?? 0),
    recentMessages: recentMessages.map((row) => ({
      conversationId: Number(row.conversation_id),
      preview: String(row.body),
      sentAt: String(row.created_at),
      senderName: String(row.sender_name),
      productName: row.product_name === null ? null : String(row.product_name),
      isUnread: Boolean(row.is_unread),
    })),
  };
}

export async function getProductApprovalHistory(productId: number) {
  const rows = await query<RowDataPacket[]>(
    `SELECT h.id, h.action, h.reason, h.created_at, u.full_name AS admin_name
     FROM product_approval_history h
     LEFT JOIN users u ON u.id = h.admin_id
     WHERE h.product_id = ? ORDER BY h.created_at DESC, h.id DESC`,
    [productId],
  );
  return rows.map((row) => ({
    id: Number(row.id),
    action: String(row.action),
    reason: row.reason === null ? null : String(row.reason),
    adminName: row.admin_name === null ? null : String(row.admin_name),
    createdAt: String(row.created_at),
  }));
}

export async function notifySellerOfStatus(
  sellerId: number,
  productName: string,
  status: "approved" | "rejected" | "requires_correction" | "suspended" | "reinstated",
  reason?: string | null,
): Promise<void> {
  const titles: Record<string, string> = {
    approved: "Your listing was approved",
    rejected: "Your listing was rejected",
    requires_correction: "Your listing needs changes",
    suspended: "Your listing was suspended",
    reinstated: "Your listing was reinstated",
  };
  await createNotification({
    userId: sellerId,
    type: `product_${status}`,
    title: titles[status] ?? "Listing status changed",
    body: reason ? `${productName}: ${reason}` : `${productName} status changed to ${status}.`,
    link: "/seller/products",
  });
}
