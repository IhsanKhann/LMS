// controllers/auth.controller.js
import bcrypt from "bcryptjs";
import jwt    from "jsonwebtoken";
import pool   from "../config/db.js";

const generateTokens = (id, role) => {
  const accessToken = jwt.sign(
    { id, role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || "15m" }
  );
  const refreshToken = jwt.sign(
    { id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || "7d" }
  );
  return { accessToken, refreshToken };
};

// POST /api/auth/login
export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Username and password required" });
    }

    const [[librarian]] = await pool.query(
      "SELECT * FROM Librarians WHERE username = ?",
      [username]
    );

    if (!librarian) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, librarian.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const { accessToken, refreshToken } = generateTokens(librarian.librarian_id, librarian.role);

    // Refresh token → HttpOnly cookie (XSS safe)
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      success: true,
      data: {
        accessToken,
        librarian: {
          id:       librarian.librarian_id,
          name:     librarian.name,
          username: librarian.username,
          role:     librarian.role,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/refresh
export const refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ success: false, message: "No refresh token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const [[librarian]] = await pool.query(
      "SELECT librarian_id, role FROM Librarians WHERE librarian_id = ?",
      [decoded.id]
    );

    if (!librarian) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    const { accessToken } = generateTokens(librarian.librarian_id, librarian.role);
    res.json({ success: true, data: { accessToken } });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/logout
export const logout = (_req, res) => {
  res.clearCookie("refreshToken");
  res.json({ success: true, message: "Logged out" });
};