import path from "node:path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { queryOne } from "./db/pool";
import { attachUser } from "./middleware/auth";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { originCheck } from "./middleware/originCheck";
import authRoutes from "./modules/auth/auth.routes";
import { usersRouter, sellerPublicRouter } from "./modules/users/users.routes";
import { publicProductRouter, sellerRouter } from "./modules/products/products.routes";
import {
  adminReferenceRouter,
  categoryRouter,
  locationRouter,
  marketRouter,
  unitRouter,
} from "./modules/reference/reference.routes";
import { adminMarketPricesRouter, marketPricesRouter } from "./modules/market-prices/marketPrices.routes";
import { conversationsRouter } from "./modules/messaging/messaging.routes";
import notificationsRouter from "./modules/notifications/notifications.routes";
import { adminReportsRouter, reportsRouter } from "./modules/reports/reports.routes";
import { adminAnnouncementsRouter, announcementsRouter } from "./modules/announcements/announcements.routes";
import { adminRouter } from "./modules/admin/admin.routes";
import uploadsRouter from "./modules/uploads/uploads.routes";

const app = express();

app.disable("x-powered-by");
if (env.isProduction) {
  app.set("trust proxy", 1);
}

const allowedOrigins = new Set(
  [env.frontendUrl, env.apiPublicUrl, "http://localhost:5173", "http://127.0.0.1:5173"].filter(Boolean),
);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: env.isProduction ? undefined : false,
  }),
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Accept", "Accept-Language"],
    maxAge: 600,
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(cookieParser());
app.use(originCheck);
app.use(attachUser);

app.use(
  "/uploads",
  express.static(env.uploadDir, {
    maxAge: "30d",
    fallthrough: true,
    index: false,
    setHeaders(res) {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Disposition", "inline");
    },
  }),
);

app.get("/api/health", async (_req, res) => {
  try {
    await queryOne("SELECT 1 AS ok");
    res.json({
      success: true,
      data: {
        status: "ok",
        database: "connected",
        environment: env.nodeEnv,
        uptimeSeconds: Math.round(process.uptime()),
      },
    });
  } catch {
    res.status(503).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Database is unavailable." },
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRouter);
app.use("/api/sellers", sellerPublicRouter);
app.use("/api/products", publicProductRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/markets", marketRouter);
app.use("/api/locations", locationRouter);
app.use("/api/units", unitRouter);
app.use("/api/market-prices", marketPricesRouter);
app.use("/api/conversations", conversationsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/announcements", announcementsRouter);
app.use("/api/seller", sellerRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/admin", adminReferenceRouter);
app.use("/api/admin/market-prices", adminMarketPricesRouter);
app.use("/api/admin/reports", adminReportsRouter);
app.use("/api/admin/announcements", adminAnnouncementsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
