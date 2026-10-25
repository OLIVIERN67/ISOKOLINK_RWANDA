import fs from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";
import { env } from "../config/env";

async function ensureDatabase(): Promise<void> {
  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    multipleStatements: false,
  });
  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${env.db.name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    console.log(`[migrate] database "${env.db.name}" is available`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[migrate] could not create database automatically (${message}). Continuing if it exists.`);
  } finally {
    await connection.end();
  }
}

async function run(): Promise<void> {
  await ensureDatabase();

  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.name,
    multipleStatements: true,
    charset: "utf8mb4",
    timezone: "Z",
  });

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name VARCHAR(255) NOT NULL PRIMARY KEY,
        applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    const [rows] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT name FROM schema_migrations ORDER BY name",
    );
    const applied = new Set(rows.map((row) => String(row.name)));

    const migrationsDir = path.resolve(process.cwd(), "migrations");
    const files = (await fs.readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`[migrate] skip ${file}`);
        continue;
      }
      const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
      console.log(`[migrate] applying ${file}`);
      await connection.query(sql);
      await connection.execute("INSERT INTO schema_migrations (name) VALUES (?)", [file]);
      console.log(`[migrate] applied ${file}`);
    }

    console.log("[migrate] done");
  } finally {
    await connection.end();
  }
}

run().catch((error) => {
  console.error("[migrate] failed:", error);
  process.exit(1);
});
