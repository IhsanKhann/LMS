// middleware/auth.middleware.js
import jwt  from "jsonwebtoken";
import pool from "../config/db.js";

// ── checkAuth ─────────────────────────────────────────────────────────────────
// Verifies the JWT from Authorization header (Bearer token strategy).
// Attaches `req.librarian` for downstream use.
export const checkAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Verify librarian still exists in DB (handles deleted accounts)
    const [rows] = await pool.query(
      "SELECT librarian_id, name, username, role FROM Librarians WHERE librarian_id = ?",
      [decoded.id]
    );

    if (!rows.length) {
      return res.status(401).json({ success: false, message: "Token invalid — user not found" });
    }

    req.librarian = rows[0];
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
// Usage: router.delete("/books/:id", checkAuth, checkRole(["admin"]), controller)
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
// e.g. Only faculty can waive fines → checkMemberType(["faculty"])
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