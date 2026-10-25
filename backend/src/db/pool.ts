import mysql, {
  type Pool,
  type PoolConnection,
  type ResultSetHeader,
  type RowDataPacket,
} from "mysql2/promise";
import { env } from "../config/env";

export const pool: Pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  waitForConnections: true,
  connectionLimit: env.db.connectionLimit,
  queueLimit: 0,
  charset: "utf8mb4",
  timezone: "Z",
  dateStrings: true,
  supportBigNumbers: true,
  bigNumberStrings: false,
});

export async function query<T extends RowDataPacket[]>(
  sql: string,
  params: unknown[] = [],
): Promise<T> {
  const [rows] = await pool.query<T>(sql, params);
  return rows;
}

export async function queryOne<T extends RowDataPacket>(
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T[]>(sql, params);
  return rows[0] ?? null;
}

export async function execute(sql: string, params: any[] = []): Promise<ResultSetHeader> {
  const [result] = await pool.execute<ResultSetHeader>(sql, params);
  return result;
}

export async function withTransaction<T>(
  fn: (connection: PoolConnection) => Promise<T>,
): Promise<T> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await fn(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export function toIso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const normalized = value.includes("T") ? value : value.replace(" ", "T");
    return normalized.endsWith("Z") ? normalized : `${normalized}Z`;
  }
  return null;
}
