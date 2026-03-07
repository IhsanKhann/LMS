// routes/member.routes.js
import { Router } from "express";
import pool from "../config/db.js";
import { checkAuth, checkRole } from "../middleware/auth.middleware.js";

const router = Router();

// GET /api/members
router.get("/", checkAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT lm.member_id, lm.member_type, lm.membership_date, lm.status,
              COALESCE(s.name, f.name)   AS name,
              COALESCE(s.email, f.email) AS email,
              COALESCE(s.phone, f.phone) AS phone,
              d.department_name
       FROM Library_Members lm
       LEFT JOIN Students s ON lm.student_id = s.student_id
       LEFT JOIN Faculty f  ON lm.faculty_id = f.faculty_id
       LEFT JOIN Department d ON COALESCE(s.department_id, f.department_id) = d.department_id
       ORDER BY lm.created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// GET /api/members/:id
router.get("/:id", checkAuth, async (req, res, next) => {
  try {
    const [[member]] = await pool.query(
      `SELECT lm.*, COALESCE(s.name, f.name) AS name,
              COALESCE(s.email, f.email) AS email,
              d.department_name
       FROM Library_Members lm
       LEFT JOIN Students s ON lm.student_id = s.student_id
       LEFT JOIN Faculty f  ON lm.faculty_id = f.faculty_id
       LEFT JOIN Department d ON COALESCE(s.department_id, f.department_id) = d.department_id
       WHERE lm.member_id = ?`,
      [req.params.id]
    );
    if (!member) return res.status(404).json({ success: false, message: "Member not found" });
    res.json({ success: true, data: member });
  } catch (err) { next(err); }
});

export default router;

// ── Department routes ─────────────────────────────────────────────────────────
// routes/department.routes.js  (exported separately via server.js import alias)