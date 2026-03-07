// routes/department.routes.js
import { Router } from "express";
import pool from "../config/db.js";
import { checkAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", checkAuth, async (_req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT * FROM Department ORDER BY department_name");
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

export default router;