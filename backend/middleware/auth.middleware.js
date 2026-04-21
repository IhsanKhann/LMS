// middleware/auth.middleware.js
import jwt  from "jsonwebtoken";
import pool from "../config/db.js";

// ── checkAuth ─────────────────────────────────────────────────────────────────
// Verifies the JWT from the Authorization header (Bearer strategy).
// Attaches req.librarian = { librarian_id, name, username, role } for
// downstream controllers.
//
// Set BYPASS_AUTH=true in .env to skip JWT checks during local development.
// Never enable BYPASS_AUTH in production.
export const checkAuth = async (req, res, next) => {
  // ── Dev bypass (set BYPASS_AUTH=true in .env, never in production) ─────────
  if (process.env.BYPASS_AUTH === "true") {
    req.librarian = {
      librarian_id: 1,
      name:         "Dev Admin",
      username:     "dev",
      role:         "admin",
    };
    return next();
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const token   = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const { id, role } = decoded;

    // Re-verify the user still exists in the relevant table
    let user = null;

    if (role === "admin" || role === "staff") {
      const [[row]] = await pool.query(
        "SELECT librarian_id, name, username, role FROM Librarians WHERE librarian_id = ?",
        [id]
      );
      user = row;
    } else if (role === "faculty") {
      const [[row]] = await pool.query(
        "SELECT faculty_id AS librarian_id, name, employee_no AS username FROM Faculty WHERE faculty_id = ?",
        [id]
      );
      if (row) user = { ...row, role: "faculty" };
    } else if (role === "student") {
      const [[row]] = await pool.query(
        "SELECT student_id AS librarian_id, name, registration_no AS username FROM Students WHERE student_id = ?",
        [id]
      );
      if (row) user = { ...row, role: "student" };
    }

    if (!user) {
      return res.status(401).json({ success: false, message: "Token invalid — user not found" });
    }

    req.librarian = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Token expired" });
    }
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

// ── checkRole ─────────────────────────────────────────────────────────────────
// Factory: accepts an array of allowed roles, returns middleware.
// Usage: router.delete("/books/:id", checkAuth, checkRole(["admin"]), handler)
export const checkRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.librarian) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }
    if (!allowedRoles.includes(req.librarian.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${allowedRoles.join(", ")}`,
      });
    }
    next();
  };
};

// ── checkMemberType ───────────────────────────────────────────────────────────
// Validates that a library member is of a specific type before an operation.
export const checkMemberType = (allowedTypes = []) => {
  return async (req, res, next) => {
    const memberId = req.params.memberId || req.body.member_id;
    if (!memberId) return next();

    const [rows] = await pool.query(
      "SELECT member_type FROM Library_Members WHERE member_id = ?",
      [memberId]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }
    if (!allowedTypes.includes(rows[0].member_type)) {
      return res.status(403).json({
        success: false,
        message: `Operation not permitted for member type: ${rows[0].member_type}`,
      });
    }

    req.memberType = rows[0].member_type;
    next();
  };
};