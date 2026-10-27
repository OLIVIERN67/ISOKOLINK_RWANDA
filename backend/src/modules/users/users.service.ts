import type { RowDataPacket } from "mysql2/promise";
import { execute, queryOne, withTransaction } from "../../db/pool";
import { createNotification } from "../../services/notification.service";
import { writeAuditLog } from "../../utils/audit";
import { ApiError } from "../../utils/errors";
import { getPagination, paginationMeta } from "../../utils/pagination";
import { countSavedProducts, listSavedProductRows, mapProduct } from "../products/products.repository";
import type { SellerProfileInput } from "./users.schemas";

export async function getSellerProfile(userId: number) {
  const row = await queryOne<RowDataPacket>(
    `SELECT sp.id, sp.business_name, sp.description, sp.location_id, sp.market_id, sp.contact_phone,
            sp.contact_email, sp.preferred_contact, sp.public_contact_visibility,
            sp.profile_image_url, sp.status, sp.created_at, sp.updated_at,
            l.name AS district_name, p.name AS province_name, m.name AS market_name
     FROM seller_profiles sp
     LEFT JOIN locations l ON l.id = sp.location_id
     LEFT JOIN locations p ON p.id = l.parent_id
     LEFT JOIN markets m ON m.id = sp.market_id
     WHERE sp.user_id = ?`,
    [userId],
  );
  if (!row) return null;
  return {
    id: Number(row.id),
    userId,
    businessName: String(row.business_name),
    description: row.description === null ? null : String(row.description),
    locationId: row.location_id === null ? null : Number(row.location_id),
    district: row.district_name === null ? null : String(row.district_name),
    province: row.province_name === null ? null : String(row.province_name),
    marketId: row.market_id === null ? null : Number(row.market_id),
    market: row.market_name === null ? null : String(row.market_name),
    contactPhone: row.contact_phone === null ? null : String(row.contact_phone),
    contactEmail: row.contact_email === null ? null : String(row.contact_email),
    preferredContact: String(row.preferred_contact),
    publicContactVisibility: Boolean(row.public_contact_visibility),
    profileImageUrl: row.profile_image_url === null ? null : String(row.profile_image_url),
    status: String(row.status),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function getMyProfile(userId: number) {
  const row = await queryOne<RowDataPacket>(
    `SELECT u.id, u.email, u.full_name, u.phone, u.status, u.is_email_verified,
            u.preferred_language, u.notification_email_enabled, u.last_login_at, u.created_at,
            GROUP_CONCAT(DISTINCT r.name ORDER BY r.name) AS roles
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     WHERE u.id = ? GROUP BY u.id`,
    [userId],
  );
  if (!row) throw ApiError.notFound("Account not found.");
  const sellerProfile = await getSellerProfile(userId);
  return {
    id: Number(row.id),
    email: String(row.email),
    fullName: String(row.full_name),
    phone: row.phone === null ? null : String(row.phone),
    status: String(row.status),
    isEmailVerified: Boolean(row.is_email_verified),
    preferredLanguage: String(row.preferred_language),
    notificationEmailEnabled: Boolean(row.notification_email_enabled),
    lastLoginAt: row.last_login_at === null ? null : String(row.last_login_at),
    createdAt: String(row.created_at),
    roles: row.roles ? String(row.roles).split(",") : [],
    sellerProfile,
  };
}

export async function updateMyProfile(
  userId: number,
  input: {
    fullName?: string;
    phone?: string | null;
    preferredLanguage?: string;
    notificationEmailEnabled?: boolean;
  },
) {
  const updates: string[] = [];
  const params: unknown[] = [];
  if (input.fullName !== undefined) {
    updates.push("full_name = ?");
    params.push(input.fullName);
  }
  if (input.phone !== undefined) {
    updates.push("phone = ?");
    params.push(input.phone || null);
  }
  if (input.preferredLanguage !== undefined) {
    updates.push("preferred_language = ?");
    params.push(input.preferredLanguage);
  }
  if (input.notificationEmailEnabled !== undefined) {
    updates.push("notification_email_enabled = ?");
    params.push(input.notificationEmailEnabled ? 1 : 0);
  }
  if (updates.length === 0) throw ApiError.badRequest("Nothing to update.");
  params.push(userId);
  await execute(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, params);
  return getMyProfile(userId);
}

export async function becomeSeller(userId: number, emailVerified: boolean, input: SellerProfileInput, ip?: string) {
  if (!emailVerified) {
    throw ApiError.forbidden("Verify your email address before registering as a seller.");
  }
  const existing = await queryOne<RowDataPacket>("SELECT id FROM seller_profiles WHERE user_id = ?", [userId]);
  if (existing) throw ApiError.conflict("You already have a seller profile.");

  const location = await queryOne<RowDataPacket>(
    "SELECT id FROM locations WHERE id = ? AND type = 'district'",
    [input.locationId],
  );
  if (!location) throw ApiError.badRequest("Select a valid district.");
  if (input.marketId) {
    const market = await queryOne<RowDataPacket>(
      "SELECT id FROM markets WHERE id = ? AND location_id = ?",
      [input.marketId, input.locationId],
    );
    if (!market) throw ApiError.badRequest("Select a market in your district.");
  }
  const sellerRole = await queryOne<RowDataPacket>("SELECT id FROM roles WHERE name = 'seller'");
  if (!sellerRole) throw ApiError.internal("Seller role is not configured.");

  await withTransaction(async (connection) => {
    await connection.execute(
      `INSERT INTO seller_profiles
        (user_id, business_name, description, location_id, market_id, contact_phone,
         preferred_contact, public_contact_visibility, profile_image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        input.businessName,
        input.description,
        input.locationId,
        input.marketId ?? null,
        input.contactPhone,
        input.preferredContact,
        input.publicContactVisibility ? 1 : 0,
        input.profileImageUrl || null,
      ],
    );
    await connection.execute("INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)", [
      userId,
      sellerRole.id,
    ]);
    await connection.execute(
      `INSERT INTO notifications (user_id, type, title, body, link)
       VALUES (?, 'account', 'Seller account activated', 'You can now submit food listings for approval.', '/seller/products/new')`,
      [userId],
    );
  });

  await writeAuditLog({
    actorId: userId,
    action: "seller.registered",
    entityType: "seller_profile",
    entityId: userId,
    ipAddress: ip,
  });
  await createNotification({
    userId,
    type: "account",
    title: "Welcome, seller",
    body: "Your first listing will be reviewed by an administrator before it becomes public.",
    link: "/seller/products/new",
  });

  return getSellerProfile(userId);
}

export async function updateSellerProfile(userId: number, input: Partial<SellerProfileInput>, ip?: string) {
  const existing = await queryOne<RowDataPacket>("SELECT id FROM seller_profiles WHERE user_id = ?", [userId]);
  if (!existing) throw ApiError.notFound("Seller profile not found.");

  if (input.locationId !== undefined || input.marketId !== undefined) {
    const locationId = input.locationId;
    if (locationId !== undefined) {
      const location = await queryOne<RowDataPacket>(
        "SELECT id FROM locations WHERE id = ? AND type = 'district'",
        [locationId],
      );
      if (!location) throw ApiError.badRequest("Select a valid district.");
    }
    if (input.marketId) {
      const market = await queryOne<RowDataPacket>("SELECT id, location_id FROM markets WHERE id = ?", [
        input.marketId,
      ]);
      if (!market) throw ApiError.badRequest("Select a valid market.");
      if (locationId !== undefined && Number(market.location_id) !== locationId) {
        throw ApiError.badRequest("Select a market in your district.");
      }
    }
  }

  const updates: string[] = [];
  const params: unknown[] = [];
  const mapping: Record<string, string> = {
    businessName: "business_name",
    description: "description",
    locationId: "location_id",
    marketId: "market_id",
    contactPhone: "contact_phone",
    preferredContact: "preferred_contact",
    publicContactVisibility: "public_contact_visibility",
    profileImageUrl: "profile_image_url",
  };
  for (const [key, column] of Object.entries(mapping)) {
    const value = input[key as keyof SellerProfileInput];
    if (value !== undefined) {
      updates.push(`${column} = ?`);
      params.push(
        key === "publicContactVisibility"
          ? value
            ? 1
            : 0
          : key === "profileImageUrl"
            ? value || null
            : value,
      );
    }
  }
  if (updates.length === 0) throw ApiError.badRequest("Nothing to update.");
  params.push(userId);
  await execute(`UPDATE seller_profiles SET ${updates.join(", ")} WHERE user_id = ?`, params);
  await writeAuditLog({
    actorId: userId,
    action: "seller.profile_updated",
    entityType: "seller_profile",
    entityId: userId,
    ipAddress: ip,
  });
  return getSellerProfile(userId);
}

export async function getPublicSeller(userId: number) {
  const row = await queryOne<RowDataPacket>(
    `SELECT u.id, u.full_name, u.created_at, sp.id AS profile_id, sp.business_name, sp.description,
            sp.contact_phone, sp.public_contact_visibility, sp.preferred_contact, sp.profile_image_url,
            sp.status AS seller_status, l.name AS district_name, p.name AS province_name, m.name AS market_name
     FROM users u
     LEFT JOIN seller_profiles sp ON sp.user_id = u.id
     LEFT JOIN locations l ON l.id = sp.location_id
     LEFT JOIN locations p ON p.id = l.parent_id
     LEFT JOIN markets m ON m.id = sp.market_id
     WHERE u.id = ? AND u.status = 'active' AND sp.status = 'active'`,
    [userId],
  );
  if (!row || !row.profile_id) throw ApiError.notFound("Seller not found.");
  const count = await queryOne<RowDataPacket>(
    "SELECT COUNT(*) AS total FROM products WHERE seller_id = ? AND approval_status = 'approved' AND is_archived = 0 AND availability = 'available'",
    [userId],
  );
  return {
    id: Number(row.id),
    fullName: String(row.full_name),
    businessName: row.business_name === null ? String(row.full_name) : String(row.business_name),
    description: row.description === null ? null : String(row.description),
    profileImageUrl: row.profile_image_url === null ? null : String(row.profile_image_url),
    phone: row.public_contact_visibility ? (row.contact_phone === null ? null : String(row.contact_phone)) : null,
    publicContactVisible: Boolean(row.public_contact_visibility),
    preferredContact: String(row.preferred_contact),
    district: row.district_name === null ? null : String(row.district_name),
    province: row.province_name === null ? null : String(row.province_name),
    market: row.market_name === null ? null : String(row.market_name),
    memberSince: String(row.created_at),
    activeListings: Number(count?.total ?? 0),
    status: String(row.seller_status),
  };
}

export async function getBuyerStats(userId: number) {
  const counts = await queryOne<RowDataPacket>(
    `SELECT
       (SELECT COUNT(*) FROM saved_products WHERE user_id = ?) AS saved_products,
       (SELECT COUNT(*) FROM conversation_participants WHERE user_id = ?) AS conversations,
       (SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0) AS unread_notifications,
       (SELECT COUNT(*) FROM messages m
          JOIN conversations c ON c.id = m.conversation_id
          JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = ?
          WHERE m.sender_id <> ? AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)) AS unread_messages`,
    [userId, userId, userId, userId, userId],
  );
  return {
    savedProducts: Number(counts?.saved_products ?? 0),
    conversations: Number(counts?.conversations ?? 0),
    unreadNotifications: Number(counts?.unread_notifications ?? 0),
    unreadMessages: Number(counts?.unread_messages ?? 0),
  };
}

export async function getSavedProducts(userId: number, page: number, pageSize: number) {
  const pagination = getPagination({ page, pageSize });
  const rows = await listSavedProductRows(userId, pagination.pageSize, pagination.offset);
  const total = await countSavedProducts(userId);
  return { items: rows.map(mapProduct), meta: paginationMeta(total, pagination) };
}

export async function saveProduct(userId: number, productId: number) {
  const product = await queryOne<RowDataPacket>(
    "SELECT id FROM products WHERE id = ? AND approval_status = 'approved' AND is_archived = 0",
    [productId],
  );
  if (!product) throw ApiError.notFound("Product not found.");
  await execute("INSERT IGNORE INTO saved_products (user_id, product_id) VALUES (?, ?)", [userId, productId]);
  return { saved: true };
}

export async function unsaveProduct(userId: number, productId: number) {
  await execute("DELETE FROM saved_products WHERE user_id = ? AND product_id = ?", [userId, productId]);
  return { saved: false };
}
