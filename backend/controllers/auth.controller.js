// controllers/auth.controller.js
// ─────────────────────────────────────────────────────────────────────────────
// BUG FIXES applied here:
//
//  1. Buffer issue  — mysql2 can return password columns as Buffer objects on
//     some Node/OS combos. We always call  .toString("utf8").trim()  before
//     passing to bcrypt.compare().
//
//  2. Hidden characters — Windows line-endings (\r\n) can sneak into hashes
//     when rows are inserted via copy-paste in Workbench. .trim() removes them.
//
//  3. Multi-role login — Tries Librarians → Faculty → Students in order.
//     Each table uses a different username field.
//
//  4. Refresh token — now correctly re-issues tokens for ALL roles, not just
//     Librarians (the original code only queried Librarians on refresh).
// ─────────────────────────────────────────────────────────────────────────────
import bcrypt from "bcryptjs";
import jwt    from "jsonwebtoken";
import pool   from "../config/db.js";

// ── Token factory ─────────────────────────────────────────────────────────────
const generateTokens = (id, role) => {
  const accessToken = jwt.sign(
    { id, role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || "15m" }
  );
  const refreshToken = jwt.sign(
    { id, role },                          // include role so refresh works for all roles
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || "7d" }
  );
  return { accessToken, refreshToken };
};

// ── POST /api/auth/login ──────────────────────────────────────────────────────
export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Username and password are required" });
    }

    let user    = null;
    let role    = null;
    let idField = null;

    // 1. Librarians (admin / staff)
    {
      const [[row]] = await pool.query(
        "SELECT * FROM Librarians WHERE username = ?",
        [username.trim()]
      );
      if (row) { user = row; role = row.role; idField = "librarian_id"; }
    }

    // 2. Faculty
    if (!user) {
      const [[row]] = await pool.query(
        "SELECT * FROM Faculty WHERE employee_no = ?",
        [username.trim()]
      );
      if (row) { user = row; role = "faculty"; idField = "faculty_id"; }
    }

    // 3. Students
    if (!user) {
      const [[row]] = await pool.query(
        "SELECT * FROM Students WHERE registration_no = ?",
        [username.trim()]
      );
      if (row) { user = row; role = "student"; idField = "student_id"; }
    }

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid username or password" });
    }

    // ── CORE FIX: always convert to plain UTF-8 string and trim whitespace ──
    // mysql2 may return password as a Buffer; Windows Workbench inserts may
    // contain \r; both cause bcrypt.compare() to silently return false.
    const dbHash = Buffer.isBuffer(user.password)
      ? user.password.toString("utf8").trim()
      : String(user.password).trim();

    const isMatch = await bcrypt.compare(password, dbHash);

    if (!isMatch) {
      console.warn(`[Auth] ❌ Password mismatch for "${username}" (role: ${role})`);
      return res.status(401).json({ success: false, message: "Invalid username or password" });
    }

    const { accessToken, refreshToken } = generateTokens(user[idField], role);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge:   7 * 24 * 60 * 60 * 1000,
    });

    console.log(`[Auth] ✅ Login success: "${username}" (role: ${role})`);

    res.json({
      success: true,
      data: {
        accessToken,
        user: {
          id:   user[idField],
          name: user.name,
          role,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/refresh ────────────────────────────────────────────────────
export const refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ success: false, message: "No refresh token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const { id, role } = decoded;

    // Re-verify the user still exists, using the role stored in the token
    let user = null;
    if (role === "admin" || role === "staff") {
      const [[row]] = await pool.query(
        "SELECT librarian_id AS uid, role FROM Librarians WHERE librarian_id = ?", [id]
      );
      user = row;
    } else if (role === "faculty") {
      const [[row]] = await pool.query(
        "SELECT faculty_id AS uid FROM Faculty WHERE faculty_id = ?", [id]
      );
      user = row ? { ...row, role } : null;
    } else if (role === "student") {
      const [[row]] = await pool.query(
        "SELECT student_id AS uid FROM Students WHERE student_id = ?", [id]
      );
      user = row ? { ...row, role } : null;
    }

    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    const { accessToken } = generateTokens(user.uid, user.role || role);
    res.json({ success: true, data: { accessToken } });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Refresh token expired — please log in again" });
    }
    next(err);
  }
};

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
export const logout = (_req, res) => {
  res.clearCookie("refreshToken");
  res.json({ success: true, message: "Logged out" });
};