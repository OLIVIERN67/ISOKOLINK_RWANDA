import type { PoolConnection } from "mysql2/promise";
import { execute } from "../db/pool";

interface AuditInput {
  actorId: number | null;
  action: string;
  entityType: string;
  entityId?: string | number | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

export async function writeAuditLog(input: AuditInput, connection?: PoolConnection): Promise<void> {
  const sql = `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata, ip_address)
               VALUES (?, ?, ?, ?, ?, ?)`;
  const params = [
    input.actorId,
    input.action,
    input.entityType,
    input.entityId === undefined || input.entityId === null ? null : String(input.entityId),
    input.metadata ? JSON.stringify(input.metadata) : null,
    input.ipAddress ?? null,
  ];

  if (connection) {
    await connection.execute(sql, params);
    return;
  }
  await execute(sql, params);
}
