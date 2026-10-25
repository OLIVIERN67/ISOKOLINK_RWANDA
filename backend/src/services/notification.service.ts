import type { PoolConnection } from "mysql2/promise";
import { execute } from "../db/pool";

export interface NotificationInput {
  userId: number;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
}

export async function createNotification(
  input: NotificationInput,
  connection?: PoolConnection,
): Promise<void> {
  const sql = `INSERT INTO notifications (user_id, type, title, body, link)
               VALUES (?, ?, ?, ?, ?)`;
  const params = [input.userId, input.type, input.title, input.body ?? null, input.link ?? null];
  if (connection) {
    await connection.execute(sql, params);
    return;
  }
  await execute(sql, params);
}

export async function notifyAdmins(
  input: Omit<NotificationInput, "userId">,
  connection?: PoolConnection,
): Promise<void> {
  const sql = `INSERT INTO notifications (user_id, type, title, body, link)
               SELECT ur.user_id, ?, ?, ?, ?
               FROM user_roles ur
               JOIN roles r ON r.id = ur.role_id
               WHERE r.name = 'admin'`;
  const params = [input.type, input.title, input.body ?? null, input.link ?? null];
  if (connection) {
    await connection.execute(sql, params);
    return;
  }
  await execute(sql, params);
}
