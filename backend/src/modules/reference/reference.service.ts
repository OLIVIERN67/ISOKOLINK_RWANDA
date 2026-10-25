import type { RowDataPacket } from "mysql2/promise";
import { execute, query, queryOne } from "../../db/pool";
import { writeAuditLog } from "../../utils/audit";
import { ApiError } from "../../utils/errors";
import { slugify } from "../../utils/slug";

export async function listCategories(includeInactive = false) {
  const rows = await query<RowDataPacket[]>(
    `SELECT c.id, c.name, c.slug, c.description, c.image_url, c.is_active,
            (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_archived = 0) AS product_count
     FROM categories c
     ${includeInactive ? "" : "WHERE c.is_active = 1"}
     ORDER BY c.name ASC`,
  );
  return rows.map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    slug: String(row.slug),
    description: row.description === null ? null : String(row.description),
    imageUrl: row.image_url === null ? null : String(row.image_url),
    isActive: Boolean(row.is_active),
    productCount: Number(row.product_count),
  }));
}

export async function listLocations(includeInactive = true) {
  const rows = await query<RowDataPacket[]>(
    "SELECT id, name, type, parent_id FROM locations ORDER BY type ASC, name ASC",
  );
  const provinces = rows
    .filter((row) => row.type === "province")
    .map((province) => ({
      id: Number(province.id),
      name: String(province.name),
      type: String(province.type),
      districts: rows
        .filter((row) => Number(row.parent_id) === Number(province.id))
        .map((district) => ({ id: Number(district.id), name: String(district.name) })),
    }));
  return {
    provinces,
    districts: rows
      .filter((row) => row.type === "district")
      .map((row) => {
        const parent = rows.find((candidate) => Number(candidate.id) === Number(row.parent_id));
        return {
          id: Number(row.id),
          name: String(row.name),
          provinceId: row.parent_id === null ? null : Number(row.parent_id),
          province: parent ? String(parent.name) : null,
        };
      }),
    total: provinces.length + rows.filter((row) => row.type === "district").length,
    includeInactive,
  };
}

export async function listMarkets(locationId?: number) {
  const params: unknown[] = [];
  let where = "";
  if (locationId) {
    where = "WHERE m.location_id = ?";
    params.push(locationId);
  }
  const rows = await query<RowDataPacket[]>(
    `SELECT m.id, m.name, m.address, m.is_active, m.location_id,
            l.name AS district_name, p.name AS province_name
     FROM markets m
     JOIN locations l ON l.id = m.location_id
     LEFT JOIN locations p ON p.id = l.parent_id
     ${where}
     ORDER BY m.name ASC`,
    params,
  );
  return rows.map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    address: row.address === null ? null : String(row.address),
    isActive: Boolean(row.is_active),
    locationId: Number(row.location_id),
    district: String(row.district_name),
    province: row.province_name === null ? null : String(row.province_name),
  }));
}

export async function listUnits(includeInactive = false) {
  const rows = await query<RowDataPacket[]>(
    `SELECT id, code, label, dimension, factor_to_base, is_active FROM units
     ${includeInactive ? "" : "WHERE is_active = 1"} ORDER BY dimension ASC, label ASC`,
  );
  return rows.map((row) => ({
    id: Number(row.id),
    code: String(row.code),
    label: String(row.label),
    dimension: String(row.dimension),
    factorToBase: Number(row.factor_to_base),
    isActive: Boolean(row.is_active),
  }));
}

export async function createCategory(
  input: { name: string; slug?: string; description?: string; imageUrl?: string; isActive?: boolean },
  actorId: number,
  ip?: string,
) {
  const slug = slugify(input.slug || input.name);
  if (!slug) throw ApiError.badRequest("Enter a valid category name.");
  const result = await execute(
    "INSERT INTO categories (name, slug, description, image_url, is_active) VALUES (?, ?, ?, ?, ?)",
    [input.name, slug, input.description ?? null, input.imageUrl ?? null, input.isActive === false ? 0 : 1],
  );
  await writeAuditLog({
    actorId,
    action: "category.created",
    entityType: "category",
    entityId: result.insertId,
    metadata: { name: input.name },
    ipAddress: ip,
  });
  return findCategory(result.insertId);
}

export async function findCategory(id: number) {
  const row = await queryOne<RowDataPacket>("SELECT * FROM categories WHERE id = ?", [id]);
  if (!row) throw ApiError.notFound("Category not found.");
  return {
    id: Number(row.id),
    name: String(row.name),
    slug: String(row.slug),
    description: row.description === null ? null : String(row.description),
    imageUrl: row.image_url === null ? null : String(row.image_url),
    isActive: Boolean(row.is_active),
  };
}

export async function updateCategory(
  id: number,
  input: { name?: string; slug?: string; description?: string | null; imageUrl?: string | null; isActive?: boolean },
  actorId: number,
  ip?: string,
) {
  await findCategory(id);
  const updates: string[] = [];
  const params: unknown[] = [];
  if (input.name !== undefined) {
    updates.push("name = ?");
    params.push(input.name);
    if (input.slug === undefined) {
      updates.push("slug = ?");
      params.push(slugify(input.name));
    }
  }
  if (input.slug !== undefined) {
    updates.push("slug = ?");
    params.push(slugify(input.slug));
  }
  if (input.description !== undefined) {
    updates.push("description = ?");
    params.push(input.description);
  }
  if (input.imageUrl !== undefined) {
    updates.push("image_url = ?");
    params.push(input.imageUrl);
  }
  if (input.isActive !== undefined) {
    updates.push("is_active = ?");
    params.push(input.isActive ? 1 : 0);
  }
  if (updates.length === 0) throw ApiError.badRequest("Nothing to update.");
  params.push(id);
  await execute(`UPDATE categories SET ${updates.join(", ")} WHERE id = ?`, params);
  await writeAuditLog({
    actorId,
    action: "category.updated",
    entityType: "category",
    entityId: id,
    metadata: input,
    ipAddress: ip,
  });
  return findCategory(id);
}

export async function deleteCategory(id: number, actorId: number, ip?: string) {
  await findCategory(id);
  const usage = await queryOne<RowDataPacket>(
    `SELECT
       (SELECT COUNT(*) FROM products WHERE category_id = ?) AS products,
       (SELECT COUNT(*) FROM market_price_observations WHERE category_id = ?) AS observations`,
    [id, id],
  );
  if (Number(usage?.products ?? 0) > 0 || Number(usage?.observations ?? 0) > 0) {
    await execute("UPDATE categories SET is_active = 0 WHERE id = ?", [id]);
    await writeAuditLog({
      actorId,
      action: "category.deactivated",
      entityType: "category",
      entityId: id,
      metadata: { reason: "Referenced by historical records" },
      ipAddress: ip,
    });
    return { deleted: false, deactivated: true };
  }
  await execute("DELETE FROM categories WHERE id = ?", [id]);
  await writeAuditLog({
    actorId,
    action: "category.deleted",
    entityType: "category",
    entityId: id,
    ipAddress: ip,
  });
  return { deleted: true, deactivated: false };
}

export async function createMarket(
  input: { name: string; locationId: number; address?: string; isActive?: boolean },
  actorId: number,
  ip?: string,
) {
  const location = await queryOne<RowDataPacket>(
    "SELECT id FROM locations WHERE id = ? AND type = 'district'",
    [input.locationId],
  );
  if (!location) throw ApiError.badRequest("Select a valid district.");
  const result = await execute(
    "INSERT INTO markets (name, location_id, address, is_active) VALUES (?, ?, ?, ?)",
    [input.name, input.locationId, input.address ?? null, input.isActive === false ? 0 : 1],
  );
  await writeAuditLog({
    actorId,
    action: "market.created",
    entityType: "market",
    entityId: result.insertId,
    metadata: { name: input.name },
    ipAddress: ip,
  });
  return findMarket(result.insertId);
}

export async function findMarket(id: number) {
  const row = await queryOne<RowDataPacket>(
    `SELECT m.id, m.name, m.address, m.is_active, m.location_id, l.name AS district_name
     FROM markets m JOIN locations l ON l.id = m.location_id WHERE m.id = ?`,
    [id],
  );
  if (!row) throw ApiError.notFound("Market not found.");
  return {
    id: Number(row.id),
    name: String(row.name),
    address: row.address === null ? null : String(row.address),
    isActive: Boolean(row.is_active),
    locationId: Number(row.location_id),
    district: String(row.district_name),
  };
}

export async function updateMarket(
  id: number,
  input: { name?: string; locationId?: number; address?: string | null; isActive?: boolean },
  actorId: number,
  ip?: string,
) {
  await findMarket(id);
  if (input.locationId !== undefined) {
    const location = await queryOne<RowDataPacket>(
      "SELECT id FROM locations WHERE id = ? AND type = 'district'",
      [input.locationId],
    );
    if (!location) throw ApiError.badRequest("Select a valid district.");
  }
  const updates: string[] = [];
  const params: unknown[] = [];
  if (input.name !== undefined) {
    updates.push("name = ?");
    params.push(input.name);
  }
  if (input.locationId !== undefined) {
    updates.push("location_id = ?");
    params.push(input.locationId);
  }
  if (input.address !== undefined) {
    updates.push("address = ?");
    params.push(input.address);
  }
  if (input.isActive !== undefined) {
    updates.push("is_active = ?");
    params.push(input.isActive ? 1 : 0);
  }
  if (updates.length === 0) throw ApiError.badRequest("Nothing to update.");
  params.push(id);
  await execute(`UPDATE markets SET ${updates.join(", ")} WHERE id = ?`, params);
  await writeAuditLog({
    actorId,
    action: "market.updated",
    entityType: "market",
    entityId: id,
    metadata: input,
    ipAddress: ip,
  });
  return findMarket(id);
}

export async function deleteMarket(id: number, actorId: number, ip?: string) {
  await findMarket(id);
  const usage = await queryOne<RowDataPacket>(
    `SELECT
       (SELECT COUNT(*) FROM products WHERE market_id = ?) AS products,
       (SELECT COUNT(*) FROM market_price_observations WHERE market_id = ?) AS observations,
       (SELECT COUNT(*) FROM seller_profiles WHERE market_id = ?) AS sellers`,
    [id, id, id],
  );
  const referenced =
    Number(usage?.products ?? 0) + Number(usage?.observations ?? 0) + Number(usage?.sellers ?? 0) > 0;
  if (referenced) {
    await execute("UPDATE markets SET is_active = 0 WHERE id = ?", [id]);
    await writeAuditLog({
      actorId,
      action: "market.deactivated",
      entityType: "market",
      entityId: id,
      metadata: { reason: "Referenced by historical records" },
      ipAddress: ip,
    });
    return { deleted: false, deactivated: true };
  }
  await execute("DELETE FROM markets WHERE id = ?", [id]);
  await writeAuditLog({
    actorId,
    action: "market.deleted",
    entityType: "market",
    entityId: id,
    ipAddress: ip,
  });
  return { deleted: true, deactivated: false };
}

export async function createLocation(
  input: { name: string; type: "province" | "district" | "sector" | "city"; parentId?: number | null },
  actorId: number,
  ip?: string,
) {
  if (input.type === "district" && !input.parentId) {
    throw ApiError.badRequest("A district must belong to a province.");
  }
  if (input.parentId) {
    const parent = await queryOne<RowDataPacket>("SELECT id FROM locations WHERE id = ?", [input.parentId]);
    if (!parent) throw ApiError.badRequest("Parent location not found.");
  }
  const result = await execute("INSERT INTO locations (name, type, parent_id) VALUES (?, ?, ?)", [
    input.name,
    input.type,
    input.parentId ?? null,
  ]);
  await writeAuditLog({
    actorId,
    action: "location.created",
    entityType: "location",
    entityId: result.insertId,
    metadata: { name: input.name, type: input.type },
    ipAddress: ip,
  });
  return { id: result.insertId, name: input.name, type: input.type, parentId: input.parentId ?? null };
}

export async function deleteLocation(id: number, actorId: number, ip?: string) {
  const location = await queryOne<RowDataPacket>("SELECT id, name FROM locations WHERE id = ?", [id]);
  if (!location) throw ApiError.notFound("Location not found.");
  const usage = await queryOne<RowDataPacket>(
    `SELECT
       (SELECT COUNT(*) FROM products WHERE location_id = ?) AS products,
       (SELECT COUNT(*) FROM markets WHERE location_id = ?) AS markets,
       (SELECT COUNT(*) FROM seller_profiles WHERE location_id = ?) AS sellers,
       (SELECT COUNT(*) FROM market_price_observations WHERE location_id = ?) AS observations,
       (SELECT COUNT(*) FROM locations WHERE parent_id = ?) AS children`,
    [id, id, id, id, id],
  );
  const referenced =
    Number(usage?.products ?? 0) +
      Number(usage?.markets ?? 0) +
      Number(usage?.sellers ?? 0) +
      Number(usage?.observations ?? 0) +
      Number(usage?.children ?? 0) >
    0;
  if (referenced) {
    throw ApiError.conflict("This location is in use and cannot be deleted.");
  }
  await execute("DELETE FROM locations WHERE id = ?", [id]);
  await writeAuditLog({
    actorId,
    action: "location.deleted",
    entityType: "location",
    entityId: id,
    ipAddress: ip,
  });
  return { deleted: true };
}

export async function createUnit(
  input: { code: string; label: string; dimension: string; factorToBase: number; isActive?: boolean },
  actorId: number,
  ip?: string,
) {
  const result = await execute(
    "INSERT INTO units (code, label, dimension, factor_to_base, is_active) VALUES (?, ?, ?, ?, ?)",
    [input.code.toLowerCase(), input.label, input.dimension, input.factorToBase, input.isActive === false ? 0 : 1],
  );
  await writeAuditLog({
    actorId,
    action: "unit.created",
    entityType: "unit",
    entityId: result.insertId,
    metadata: { code: input.code },
    ipAddress: ip,
  });
  return { id: result.insertId, ...input };
}

export async function updateUnit(
  id: number,
  input: { label?: string; dimension?: string; factorToBase?: number; isActive?: boolean },
  actorId: number,
  ip?: string,
) {
  const unit = await queryOne<RowDataPacket>("SELECT id FROM units WHERE id = ?", [id]);
  if (!unit) throw ApiError.notFound("Unit not found.");
  const updates: string[] = [];
  const params: unknown[] = [];
  if (input.label !== undefined) {
    updates.push("label = ?");
    params.push(input.label);
  }
  if (input.dimension !== undefined) {
    updates.push("dimension = ?");
    params.push(input.dimension);
  }
  if (input.factorToBase !== undefined) {
    updates.push("factor_to_base = ?");
    params.push(input.factorToBase);
  }
  if (input.isActive !== undefined) {
    updates.push("is_active = ?");
    params.push(input.isActive ? 1 : 0);
  }
  if (updates.length === 0) throw ApiError.badRequest("Nothing to update.");
  params.push(id);
  await execute(`UPDATE units SET ${updates.join(", ")} WHERE id = ?`, params);
  await writeAuditLog({
    actorId,
    action: "unit.updated",
    entityType: "unit",
    entityId: id,
    metadata: input,
    ipAddress: ip,
  });
  return { id };
}
