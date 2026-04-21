import dotenv from "dotenv";
dotenv.config(); // Call this FIRST

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

// Now DB_HOST and others are populated in process.env
import "./config/db.js";

// Routes
import authRoutes        from "./routes/auth.routes.js";
import bookRoutes        from "./routes/book.routes.js";
import memberRoutes      from "./routes/member.routes.js";
import transactionRoutes from "./routes/transaction.routes.js";
import departmentRoutes  from "./routes/department.routes.js";

import studentRoutes from "./routes/student.routes.js";
import facultyRoutes from "./routes/faculty.routes.js";

const app  = express();
const PORT = process.env.PORT || 5000;

// ── CORS (must come before routes) ───────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_ORIGIN, // e.g., http://localhost:5174
  "http://localhost:5175",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
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
app.use("/api/students", studentRoutes);
app.use("/api/faculty", facultyRoutes);

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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});