// server.js
import express      from "express";
import cors         from "cors";
import cookieParser from "cookie-parser";
import dotenv       from "dotenv";
import "./config/db.js"; // establish pool on startup

// Routes
import authRoutes        from "./routes/auth.routes.js";
import bookRoutes        from "./routes/book.routes.js";
import memberRoutes      from "./routes/member.routes.js";
import transactionRoutes from "./routes/transaction.routes.js";
import departmentRoutes  from "./routes/department.routes.js";

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 5000;

// ── CORS (must come before routes) ───────────────────────────────────────────
app.use(
  cors({
    origin:      process.env.CLIENT_ORIGIN || "http://localhost:5174",
    credentials: true,                      // allow HttpOnly cookies + Auth header
    methods:     ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ── Body / Cookie parsers ─────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString() })
);

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/auth",         authRoutes);
app.use("/api/books",        bookRoutes);
app.use("/api/members",      memberRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/departments",  departmentRoutes);

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  console.error(`[ERROR ${status}]`, err.message);
  res.status(status).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);