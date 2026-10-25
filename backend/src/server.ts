import fs from "node:fs";
import app from "./app";
import { env } from "./config/env";
import { cleanupExpiredSessions } from "./services/session.service";

async function start(): Promise<void> {
  fs.mkdirSync(env.uploadDir, { recursive: true });

  await cleanupExpiredSessions().catch((error) => {
    console.warn("[server] could not clean expired sessions:", error instanceof Error ? error.message : error);
  });
  const interval = setInterval(() => {
    cleanupExpiredSessions().catch(() => undefined);
  }, 60 * 60 * 1000);
  interval.unref();

  const server = app.listen(env.port, () => {
    console.log(`[server] ISOKOLINK RWANDA API listening on http://localhost:${env.port}`);
    console.log(`[server] environment: ${env.nodeEnv}`);
    console.log(`[server] allowed frontend origin: ${env.frontendUrl}`);
  });

  const shutdown = (signal: string) => {
    console.log(`[server] received ${signal}, shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch((error) => {
  console.error("[server] failed to start:", error);
  process.exit(1);
});
