import type { RowDataPacket } from "mysql2/promise";
import { query, queryOne } from "../../db/pool";

export interface ProductRow extends RowDataPacket {
  id: number;
  name: string;
  description: string;
  price: string | number;
  currency: string;
  quantity: string | number;
  availability: string;
  approval_status: string;
  is_featured: number;
  is_archived: number;
  rejection_reason: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  category_id: number;
  category_name: string;
  category_slug: string;
  unit_id: number;
  unit_code: string;
  unit_label: string;
  unit_dimension: string;
  factor_to_base: string | number;
  location_id: number;
  district_name: string;
  province_name: string | null;
  market_id: number | null;
  market_name: string | null;
  seller_id: number;
  seller_account_status: string;
  seller_full_name: string;
  seller_business_name: string | null;
  seller_profile_image: string | null;
  seller_phone: string | null;
  seller_contact_visible: number | null;
  seller_description: string | null;
  seller_location_id: number | null;
  seller_district_name: string | null;
  seller_status: string | null;
  primary_image: string | null;
  image_count: number;
}

export const PRODUCT_SELECT = `
  SELECT p.id, p.name, p.description, p.price, p.currency, p.quantity,
         p.availability, p.approval_status, p.is_featured, p.is_archived, p.rejection_reason,
         p.submitted_at, p.approved_at, p.created_at, p.updated_at,
         p.category_id, c.name AS category_name, c.slug AS category_slug,
         p.unit_id, u.code AS unit_code, u.label AS unit_label, u.dimension AS unit_dimension,
         u.factor_to_base,
         p.location_id, l.name AS district_name, lp.name AS province_name,
         p.market_id, m.name AS market_name,
         p.seller_id, su.status AS seller_account_status, su.full_name AS seller_full_name,
         sp.business_name AS seller_business_name,
         sp.profile_image_url AS seller_profile_image, sp.contact_phone AS seller_phone,
         sp.public_contact_visibility AS seller_contact_visible, sp.description AS seller_description,
         sp.location_id AS seller_location_id, sl.name AS seller_district_name, sp.status AS seller_status,
         (SELECT pi.url FROM product_images pi WHERE pi.product_id = p.id
            ORDER BY pi.is_primary DESC, pi.sort_order ASC, pi.id ASC LIMIT 1) AS primary_image,
         (SELECT COUNT(*) FROM product_images pi2 WHERE pi2.product_id = p.id) AS image_count
  FROM products p
  JOIN categories c ON c.id = p.category_id
  JOIN units u ON u.id = p.unit_id
  JOIN locations l ON l.id = p.location_id
  LEFT JOIN locations lp ON lp.id = l.parent_id
  JOIN users su ON su.id = p.seller_id
  LEFT JOIN seller_profiles sp ON sp.user_id = p.seller_id
  LEFT JOIN locations sl ON sl.id = sp.location_id
  LEFT JOIN markets m ON m.id = p.market_id
`;

export function mapProduct(row: ProductRow) {
  return {
    id: Number(row.id),
    name: row.name,
    description: row.description,
    price: Number(row.price),
    currency: row.currency,
    quantity: Number(row.quantity),
    availability: row.availability,
    approvalStatus: row.approval_status,
    isFeatured: Boolean(row.is_featured),
    isArchived: Boolean(row.is_archived),
    rejectionReason: row.rejection_reason,
    submittedAt: row.submitted_at,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    category: { id: Number(row.category_id), name: row.category_name, slug: row.category_slug },
    unit: {
      id: Number(row.unit_id),
      code: row.unit_code,
      label: row.unit_label,
      dimension: row.unit_dimension,
      factorToBase: Number(row.factor_to_base),
    },
    location: {
      id: Number(row.location_id),
      district: row.district_name,
      province: row.province_name,
    },
    market: row.market_id ? { id: Number(row.market_id), name: row.market_name } : null,
    seller: {
      id: Number(row.seller_id),
      fullName: row.seller_full_name,
      businessName: row.seller_business_name,
      profileImageUrl: row.seller_profile_image,
      description: row.seller_description,
      phone: row.seller_contact_visible ? row.seller_phone : null,
      publicContactVisible: Boolean(row.seller_contact_visible),
      district: row.seller_district_name,
      status: row.seller_status,
    },
    primaryImage: row.primary_image,
    imageCount: Number(row.image_count),
  };
}

export async function findProductRowById(id: number): Promise<ProductRow | null> {
  return queryOne<ProductRow>(`${PRODUCT_SELECT} WHERE p.id = ? LIMIT 1`, [id]);
}

export async function findProductImages(productId: number) {
  const rows = await query<RowDataPacket[]>(
    `SELECT id, url, alt_text, is_primary, sort_order FROM product_images
     WHERE product_id = ? ORDER BY is_primary DESC, sort_order ASC, id ASC`,
    [productId],
  );
  return rows.map((row) => ({
    id: Number(row.id),
    url: String(row.url),
    altText: row.alt_text === null ? null : String(row.alt_text),
    isPrimary: Boolean(row.is_primary),
    sortOrder: Number(row.sort_order),
  }));
}

export function isSafeImageUrl(url: string): boolean {
  return /^\/uploads\/[A-Za-z0-9._-]+$/.test(url) || /^https?:\/\/[^\s"'<>]+$/i.test(url);
}

export const PRODUCT_SELECT_SAVED = PRODUCT_SELECT.replace(
  "FROM products p",
  "FROM products p JOIN saved_products sv ON sv.product_id = p.id",
);

export async function listSavedProductRows(userId: number, pageSize: number, offset: number) {
  const rows = await query<ProductRow[]>(
    `${PRODUCT_SELECT_SAVED} WHERE sv.user_id = ? AND p.is_archived = 0
     ORDER BY sv.created_at DESC LIMIT ? OFFSET ?`,
    [userId, pageSize, offset],
  );
  return rows;
}

export async function countSavedProducts(userId: number): Promise<number> {
  const row = await queryOne<RowDataPacket>(
    "SELECT COUNT(*) AS total FROM saved_products WHERE user_id = ?",
    [userId],
  );
  return Number(row?.total ?? 0);
}
