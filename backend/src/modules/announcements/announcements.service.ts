import type { RowDataPacket } from "mysql2/promise";
import { execute, query, queryOne } from "../../db/pool";
import { writeAuditLog } from "../../utils/audit";
import { ApiError } from "../../utils/errors";

function mapAnnouncement(row: RowDataPacket) {
  return {
    id: Number(row.id),
    title: String(row.title),
    body: String(row.body),
    audience: String(row.audience),
    isPublished: Boolean(row.is_published),
    publishedAt: row.published_at === null ? null : String(row.published_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    createdBy: row.created_by === null ? null : { id: Number(row.created_by), name: String(row.author_name ?? "") },
  };
}

const SELECT = `
  SELECT a.id, a.title, a.body, a.audience, a.is_published, a.published_at, a.created_at, a.updated_at,
         a.created_by, u.full_name AS author_name
  FROM announcements a
  LEFT JOIN users u ON u.id = a.created_by
`;

export async function listPublishedAnnouncements(audience?: "all" | "buyers" | "sellers") {
  const params: unknown[] = [];
  let audienceSql = "";
  if (audience) {
    audienceSql = "AND (a.audience = 'all' OR a.audience = ?)";
    params.push(audience);
  }
  const rows = await query<RowDataPacket[]>(
    `${SELECT} WHERE a.is_published = 1 AND a.published_at <= UTC_TIMESTAMP() ${audienceSql}
     ORDER BY a.published_at DESC LIMIT 20`,
    params,
  );
  return rows.map(mapAnnouncement);
}

export async function listAllAnnouncements() {
  const rows = await query<RowDataPacket[]>(`${SELECT} ORDER BY a.created_at DESC LIMIT 100`);
  return rows.map(mapAnnouncement);
}

export async function createAnnouncement(
  input: { title: string; body: string; audience: "all" | "buyers" | "sellers"; isPublished?: boolean },
  adminId: number,
  ip?: string,
) {
  const publishedAt = input.isPublished ? new Date().toISOString().slice(0, 19).replace("T", " ") : null;
  const result = await execute(
    `INSERT INTO announcements (title, body, audience, is_published, published_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [input.title, input.body, input.audience, input.isPublished ? 1 : 0, publishedAt, adminId],
  );
  await writeAuditLog({
    actorId: adminId,
    action: "announcement.created",
    entityType: "announcement",
    entityId: result.insertId,
    metadata: { title: input.title },
    ipAddress: ip,
  });
  const row = await queryOne<RowDataPacket>(`${SELECT} WHERE a.id = ?`, [result.insertId]);
  if (!row) throw ApiError.internal("Failed to load announcement.");
  return mapAnnouncement(row);
}

export async function updateAnnouncement(
  id: number,
  input: {
    title?: string;
    body?: string;
    audience?: "all" | "buyers" | "sellers";
    isPublished?: boolean;
  },
  adminId: number,
  ip?: string,
) {
  const existing = await queryOne<RowDataPacket>(
    "SELECT id, is_published, published_at FROM announcements WHERE id = ?",
    [id],
  );
  if (!existing) throw ApiError.notFound("Announcement not found.");

  const updates: string[] = [];
  const params: unknown[] = [];
  if (input.title !== undefined) {
    updates.push("title = ?");
    params.push(input.title);
  }
  if (input.body !== undefined) {
    updates.push("body = ?");
    params.push(input.body);
  }
  if (input.audience !== undefined) {
    updates.push("audience = ?");
    params.push(input.audience);
  }
  if (input.isPublished !== undefined) {
    updates.push("is_published = ?");
    params.push(input.isPublished ? 1 : 0);
    if (input.isPublished && !existing.published_at) {
      updates.push("published_at = UTC_TIMESTAMP()");
    }
  }
  if (updates.length === 0) throw ApiError.badRequest("Nothing to update.");
  params.push(id);
  await execute(`UPDATE announcements SET ${updates.join(", ")} WHERE id = ?`, params);
  await writeAuditLog({
    actorId: adminId,
    action: "announcement.updated",
    entityType: "announcement",
    entityId: id,
    metadata: input,
    ipAddress: ip,
  });
  const row = await queryOne<RowDataPacket>(`${SELECT} WHERE a.id = ?`, [id]);
  if (!row) throw ApiError.internal("Failed to load announcement.");
  return mapAnnouncement(row);
}

export async function deleteAnnouncement(id: number, adminId: number, ip?: string) {
  const existing = await queryOne<RowDataPacket>("SELECT id FROM announcements WHERE id = ?", [id]);
  if (!existing) throw ApiError.notFound("Announcement not found.");
  await execute("DELETE FROM announcements WHERE id = ?", [id]);
  await writeAuditLog({
    actorId: adminId,
    action: "announcement.deleted",
    entityType: "announcement",
    entityId: id,
    ipAddress: ip,
  });
  return { deleted: true };
}
