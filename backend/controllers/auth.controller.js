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
    
    // 1. Try finding in Librarians first
    let [[user]] = await pool.query("SELECT * FROM Librarians WHERE username = ?", [username]);
    let role = user?.role || 'staff'; 
    let idField = 'librarian_id';

    // 2. If not found, try Faculty (HR/Staff)
    if (!user) {
      [[user]] = await pool.query("SELECT * FROM Faculty WHERE employee_no = ?", [username]);
      role = 'faculty';
      idField = 'faculty_id';
    }

    // 3. If still not found, try Students
    if (!user) {
      [[user]] = await pool.query("SELECT * FROM Students WHERE registration_no = ?", [username]);
      role = 'student';
      idField = 'student_id';
    }

    if (!user) return res.status(401).json({ success: false, message: "User not found" });

    // 4. Comparison with strict string conversion
    const dbHash = user.password.toString().trim();
    const isMatch = await bcrypt.compare(password, dbHash);

    if (!isMatch) {
      console.log(`❌ Match Failed for ${username}. Hash: ${dbHash}`);
      return res.status(401).json({ success: false, message: "Invalid password" });
    }

    // 5. Success - Generate Tokens
    const { accessToken, refreshToken } = generateTokens(user[idField], role);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, 
    });

    res.json({
      success: true,
      data: { accessToken, user: { id: user[idField], name: user.name, role } }
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