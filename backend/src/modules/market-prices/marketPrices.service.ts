import type { RowDataPacket } from "mysql2/promise";
import { execute, query, queryOne } from "../../db/pool";
import { writeAuditLog } from "../../utils/audit";
import { ApiError } from "../../utils/errors";
import { freshnessFor, STALE_AFTER_DAYS } from "../../utils/freshness";
import { getPagination, paginationMeta } from "../../utils/pagination";
import { baseUnitLabel, normalizePricePerBase, type UnitInfo } from "../../utils/units";
import type { CompareQuery, ObservationInput, ObservationListQuery } from "./marketPrices.schemas";

const OBSERVATION_SELECT = `
  SELECT o.id, o.product_name, o.price, o.currency, o.observed_on, o.source,
         o.verification_status, o.observed_by, o.notes, o.created_at, o.updated_at,
         o.category_id, c.name AS category_name, c.slug AS category_slug,
         o.market_id, m.name AS market_name,
         o.location_id, l.name AS district_name, p.name AS province_name,
         o.unit_id, u.code AS unit_code, u.label AS unit_label, u.dimension AS unit_dimension,
         u.factor_to_base
  FROM market_price_observations o
  JOIN categories c ON c.id = o.category_id
  JOIN units u ON u.id = o.unit_id
  JOIN locations l ON l.id = o.location_id
  LEFT JOIN locations p ON p.id = l.parent_id
  LEFT JOIN markets m ON m.id = o.market_id
`;

function mapObservation(row: RowDataPacket) {
  const freshness = freshnessFor(String(row.observed_on));
  const unit: UnitInfo = {
    id: Number(row.unit_id),
    code: String(row.unit_code),
    label: String(row.unit_label),
    dimension: String(row.unit_dimension),
    factor_to_base: Number(row.factor_to_base),
  };
  const normalized = normalizePricePerBase(Number(row.price), unit);
  return {
    id: Number(row.id),
    productName: String(row.product_name),
    price: Number(row.price),
    currency: String(row.currency),
    observedOn: String(row.observed_on).slice(0, 10),
    source: String(row.source),
    verificationStatus: String(row.verification_status),
    observedBy: row.observed_by === null ? null : String(row.observed_by),
    notes: row.notes === null ? null : String(row.notes),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    category: { id: Number(row.category_id), name: String(row.category_name), slug: String(row.category_slug) },
    market: row.market_id === null ? null : { id: Number(row.market_id), name: String(row.market_name) },
    location: {
      id: Number(row.location_id),
      district: String(row.district_name),
      province: row.province_name === null ? null : String(row.province_name),
    },
    unit: {
      id: unit.id,
      code: unit.code,
      label: unit.label,
      dimension: unit.dimension,
      factorToBase: unit.factor_to_base,
    },
    normalizedPrice: normalized === null ? null : { value: Number(normalized.toFixed(2)), per: baseUnitLabel(unit.dimension) },
    freshness: freshness.freshness,
    daysOld: freshness.daysOld,
    isStale: freshness.isStale,
    isVerified: row.verification_status === "verified",
    sourceType: "market_observation" as const,
  };
}

function buildFilters(filters: ObservationListQuery | CompareQuery): { where: string; params: unknown[] } {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filters.q) {
    where.push("o.product_name LIKE ?");
    params.push(`%${filters.q}%`);
  }
  if (filters.categoryId) {
    where.push("o.category_id = ?");
    params.push(filters.categoryId);
  }
  if (filters.marketId) {
    where.push("o.market_id = ?");
    params.push(filters.marketId);
  }
  if (filters.locationId) {
    where.push("(o.location_id = ? OR l.parent_id = ?)");
    params.push(filters.locationId, filters.locationId);
  }
  if (filters.unitId) {
    where.push("o.unit_id = ?");
    params.push(filters.unitId);
  }
  if ("verificationStatus" in filters && filters.verificationStatus) {
    where.push("o.verification_status = ?");
    params.push(filters.verificationStatus);
  }
  if ("from" in filters && filters.from) {
    where.push("o.observed_on >= ?");
    params.push(filters.from);
  }
  if ("to" in filters && filters.to) {
    where.push("o.observed_on <= ?");
    params.push(filters.to);
  }
  return { where: where.length > 0 ? where.join(" AND ") : "1=1", params };
}

function sortClause(sort: ObservationListQuery["sort"]): string {
  if (sort === "price_asc") return "o.price ASC, o.observed_on DESC";
  if (sort === "price_desc") return "o.price DESC, o.observed_on DESC";
  return "o.observed_on DESC, o.id DESC";
}

export async function listObservations(filters: ObservationListQuery) {
  const pagination = getPagination({ page: filters.page, pageSize: filters.pageSize });
  const { where, params } = buildFilters(filters);
  const countRow = await queryOne<RowDataPacket>(
    `SELECT COUNT(*) AS total FROM market_price_observations o
     JOIN locations l ON l.id = o.location_id WHERE ${where}`,
    params,
  );
  const rows = await query<RowDataPacket[]>(
    `${OBSERVATION_SELECT} WHERE ${where} ORDER BY ${sortClause(filters.sort)} LIMIT ? OFFSET ?`,
    [...params, pagination.pageSize, pagination.offset],
  );
  return {
    items: rows.map(mapObservation),
    meta: paginationMeta(Number(countRow?.total ?? 0), pagination),
  };
}

interface AdvertisedRow extends RowDataPacket {
  id: number;
  name: string;
  price: string | number;
  currency: string;
  updated_at: string;
  seller_id: number;
  seller_full_name: string;
  seller_business_name: string | null;
  district_name: string;
  market_name: string | null;
  unit_id: number;
  unit_code: string;
  unit_label: string;
  unit_dimension: string;
  factor_to_base: string | number;
}

export async function comparePrices(filters: CompareQuery) {
  const { where, params } = buildFilters(filters);
  const observationsRaw = await query<RowDataPacket[]>(
    `${OBSERVATION_SELECT} WHERE ${where} ORDER BY o.product_name ASC, o.price ASC LIMIT 300`,
    params,
  );
  const observations = observationsRaw.map(mapObservation);

  const advertisedWhere = [
    "p.approval_status = 'approved'",
    "p.is_archived = 0",
    "p.availability = 'available'",
    "su.status = 'active'",
    "p.name LIKE ?",
  ];
  const advertisedParams: unknown[] = [`%${filters.q}%`];
  if (filters.categoryId) {
    advertisedWhere.push("p.category_id = ?");
    advertisedParams.push(filters.categoryId);
  }
  if (filters.locationId) {
    advertisedWhere.push("(p.location_id = ? OR pl.parent_id = ?)");
    advertisedParams.push(filters.locationId, filters.locationId);
  }
  if (filters.marketId) {
    advertisedWhere.push("p.market_id = ?");
    advertisedParams.push(filters.marketId);
  }
  if (filters.unitId) {
    advertisedWhere.push("p.unit_id = ?");
    advertisedParams.push(filters.unitId);
  }

  const advertisedRaw = await query<AdvertisedRow[]>(
    `SELECT p.id, p.name, p.price, p.currency, p.updated_at,
            p.seller_id, su.full_name AS seller_full_name, sp.business_name AS seller_business_name,
            l.name AS district_name, m.name AS market_name,
            p.unit_id, u.code AS unit_code, u.label AS unit_label, u.dimension AS unit_dimension,
            u.factor_to_base
     FROM products p
     JOIN users su ON su.id = p.seller_id
     JOIN units u ON u.id = p.unit_id
     JOIN locations l ON l.id = p.location_id
     LEFT JOIN locations pl ON pl.id = l.parent_id
     LEFT JOIN seller_profiles sp ON sp.user_id = p.seller_id
     LEFT JOIN markets m ON m.id = p.market_id
     WHERE ${advertisedWhere.join(" AND ")}
     ORDER BY p.name ASC, p.price ASC
     LIMIT 200`,
    advertisedParams,
  );

  const advertised = advertisedRaw.map((row) => {
    const unit: UnitInfo = {
      id: Number(row.unit_id),
      code: String(row.unit_code),
      label: String(row.unit_label),
      dimension: String(row.unit_dimension),
      factor_to_base: Number(row.factor_to_base),
    };
    const normalized = normalizePricePerBase(Number(row.price), unit);
    return {
      id: Number(row.id),
      name: String(row.name),
      price: Number(row.price),
      currency: String(row.currency),
      updatedAt: String(row.updated_at),
      seller: {
        id: Number(row.seller_id),
        name: String(row.seller_full_name),
        businessName: row.seller_business_name === null ? null : String(row.seller_business_name),
      },
      location: { district: String(row.district_name) },
      market: row.market_name === null ? null : { name: String(row.market_name) },
      unit: {
        id: unit.id,
        code: unit.code,
        label: unit.label,
        dimension: unit.dimension,
        factorToBase: unit.factor_to_base,
      },
      normalizedPrice:
        normalized === null ? null : { value: Number(normalized.toFixed(2)), per: baseUnitLabel(unit.dimension) },
      sourceType: "seller_advertised" as const,
    };
  });

  interface Group {
    productName: string;
    dimension: string;
    unitCode: string;
    sampleCount: number;
    verifiedFreshCount: number;
    staleCount: number;
    unverifiedCount: number;
    minPrice: number | null;
    maxPrice: number | null;
    averagePrice: number | null;
    normalizedMin: number | null;
    normalizedMax: number | null;
    normalizedUnit: string | null;
    insufficientData: boolean;
  }

  const groups = new Map<string, Group>();
  for (const observation of observations) {
    const key = `${observation.productName.toLowerCase()}|${observation.unit.dimension}|${observation.unit.code}`;
    const group: Group =
      groups.get(key) ??
      {
        productName: observation.productName,
        dimension: observation.unit.dimension,
        unitCode: observation.unit.code,
        sampleCount: 0,
        verifiedFreshCount: 0,
        staleCount: 0,
        unverifiedCount: 0,
        minPrice: null,
        maxPrice: null,
        averagePrice: null,
        normalizedMin: null,
        normalizedMax: null,
        normalizedUnit: null,
        insufficientData: true,
      };
    group.sampleCount += 1;
    if (observation.isStale) group.staleCount += 1;
    if (!observation.isVerified) group.unverifiedCount += 1;
    const usable = observation.isVerified && !observation.isStale;
    if (usable) {
      group.verifiedFreshCount += 1;
      group.minPrice = group.minPrice === null ? observation.price : Math.min(group.minPrice, observation.price);
      group.maxPrice = group.maxPrice === null ? observation.price : Math.max(group.maxPrice, observation.price);
      if (observation.normalizedPrice) {
        group.normalizedMin =
          group.normalizedMin === null
            ? observation.normalizedPrice.value
            : Math.min(group.normalizedMin, observation.normalizedPrice.value);
        group.normalizedMax =
          group.normalizedMax === null
            ? observation.normalizedPrice.value
            : Math.max(group.normalizedMax, observation.normalizedPrice.value);
        group.normalizedUnit = observation.normalizedPrice.per;
      }
    }
    groups.set(key, group);
  }
  for (const group of groups.values()) {
    if (group.verifiedFreshCount > 0 && group.minPrice !== null && group.maxPrice !== null) {
      group.averagePrice = Number(((group.minPrice + group.maxPrice) / 2).toFixed(2));
    }
    group.insufficientData = group.verifiedFreshCount === 0;
  }

  return {
    query: { q: filters.q, categoryId: filters.categoryId ?? null, locationId: filters.locationId ?? null },
    observations,
    advertised,
    summary: Array.from(groups.values()),
    meta: {
      staleThresholdDays: STALE_AFTER_DAYS,
      observationCount: observations.length,
      advertisedCount: advertised.length,
      disclaimer:
        "Seller-advertised prices and independently collected market observations are shown separately. Ranges are based only on verified, recent observations matching your filters and do not represent every market in Rwanda. Always confirm the price and unit with the seller or market before buying.",
    },
  };
}

async function validateObservationRefs(input: {
  categoryId?: number;
  unitId?: number;
  locationId?: number;
  marketId?: number | null;
}): Promise<void> {
  if (input.categoryId !== undefined) {
    const category = await queryOne<RowDataPacket>("SELECT id FROM categories WHERE id = ?", [input.categoryId]);
    if (!category) throw ApiError.badRequest("Select a valid category.");
  }
  if (input.unitId !== undefined) {
    const unit = await queryOne<RowDataPacket>("SELECT id FROM units WHERE id = ?", [input.unitId]);
    if (!unit) throw ApiError.badRequest("Select a valid unit.");
  }
  if (input.locationId !== undefined) {
    const location = await queryOne<RowDataPacket>(
      "SELECT id FROM locations WHERE id = ? AND type = 'district'",
      [input.locationId],
    );
    if (!location) throw ApiError.badRequest("Select a valid district.");
  }
  if (input.marketId) {
    const market = await queryOne<RowDataPacket>("SELECT id, location_id FROM markets WHERE id = ?", [
      input.marketId,
    ]);
    if (!market) throw ApiError.badRequest("Select a valid market.");
    if (input.locationId !== undefined && Number(market.location_id) !== input.locationId) {
      throw ApiError.badRequest("The selected market is not in the selected district.");
    }
  }
}

export async function findObservation(id: number) {
  const row = await queryOne<RowDataPacket>(`${OBSERVATION_SELECT} WHERE o.id = ?`, [id]);
  if (!row) throw ApiError.notFound("Price observation not found.");
  return mapObservation(row);
}

export async function createObservation(input: ObservationInput, actorId: number, ip?: string) {
  await validateObservationRefs(input);
  const result = await execute(
    `INSERT INTO market_price_observations
      (product_name, category_id, market_id, location_id, unit_id, price, currency, observed_on,
       source, verification_status, observed_by, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.productName,
      input.categoryId,
      input.marketId ?? null,
      input.locationId,
      input.unitId,
      input.price,
      input.currency.toUpperCase(),
      input.observedOn,
      input.source,
      input.verificationStatus,
      input.observedBy ?? null,
      input.notes ?? null,
      actorId,
    ],
  );
  await writeAuditLog({
    actorId,
    action: "market_price.created",
    entityType: "market_price_observation",
    entityId: result.insertId,
    metadata: { productName: input.productName, price: input.price, unitId: input.unitId },
    ipAddress: ip,
  });
  return findObservation(result.insertId);
}

export async function updateObservation(
  id: number,
  input: Partial<ObservationInput>,
  actorId: number,
  ip?: string,
) {
  await findObservation(id);
  await validateObservationRefs(input);
  const mapping: Record<string, string> = {
    productName: "product_name",
    categoryId: "category_id",
    marketId: "market_id",
    locationId: "location_id",
    unitId: "unit_id",
    price: "price",
    currency: "currency",
    observedOn: "observed_on",
    source: "source",
    verificationStatus: "verification_status",
    observedBy: "observed_by",
    notes: "notes",
  };
  const updates: string[] = [];
  const params: unknown[] = [];
  for (const [key, column] of Object.entries(mapping)) {
    const value = input[key as keyof ObservationInput];
    if (value !== undefined) {
      updates.push(`${column} = ?`);
      params.push(key === "currency" && typeof value === "string" ? value.toUpperCase() : value);
    }
  }
  if (updates.length === 0) throw ApiError.badRequest("Nothing to update.");
  params.push(id);
  await execute(`UPDATE market_price_observations SET ${updates.join(", ")} WHERE id = ?`, params);
  await writeAuditLog({
    actorId,
    action: "market_price.updated",
    entityType: "market_price_observation",
    entityId: id,
    metadata: input,
    ipAddress: ip,
  });
  return findObservation(id);
}

export async function deleteObservation(id: number, actorId: number, ip?: string) {
  await findObservation(id);
  await execute("DELETE FROM market_price_observations WHERE id = ?", [id]);
  await writeAuditLog({
    actorId,
    action: "market_price.deleted",
    entityType: "market_price_observation",
    entityId: id,
    ipAddress: ip,
  });
  return { deleted: true };
}
