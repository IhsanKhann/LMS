// controllers/auth.controller.js
// ─────────────────────────────────────────────────────────────────────────────
//  PRD §3 — Authentication & User Management
//
//  Changes vs original:
//  - Added POST /api/auth/register  (unified for student | faculty | admin)
//  - Added GET  /api/auth/me        (own profile)
//  - Added PUT  /api/auth/me        (update own profile)
//  - Added PUT  /api/auth/me/password (change password)
//  - Login accepts email OR username/registration_no/employee_no
//  - Buffer + hidden-char fix for bcrypt (original was correct; kept)
//  - Refresh now works for all three roles (original fix; kept)
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
    { id, role },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || "7d" }
  );
  return { accessToken, refreshToken };
};

// Helper — always get a clean bcrypt hash string from the DB row
const getHash = (raw) =>
  Buffer.isBuffer(raw) ? raw.toString("utf8").trim() : String(raw).trim();

// ── POST /api/auth/register ───────────────────────────────────────────────────
// PRD §3.1  — unified registration for student | faculty | admin
// Body: { name, email, password, role, studentId?, employeeId?, department_id?, designation?, ... }
export const register = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const {
      name, email, password, role,
      // student fields
      registration_no, department_id, academic_year, gender, date_of_birth, address,
      // faculty fields
      employee_no, designation, qualification, specialization, office_location,
      // shared optional
      phone, profile_bio, joining_date,
    } = req.body;

    // ── Validation (PRD §3.4) ─────────────────────────────────────────────
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "name, email, password, and role are required",
      });
    }
    if (!["student", "faculty", "admin"].includes(role)) {
      return res.status(400).json({ success: false, message: "role must be student | faculty | admin" });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
    }

    const hash = await bcrypt.hash(password, 10);
    const cleanEmail = email.trim().toLowerCase();

    if (role === "admin" || role === "staff") {
      // Admin/staff go into Librarians table
      const username = req.body.username || cleanEmail;
      const [result] = await conn.query(
        "INSERT INTO Librarians (name, username, password, role) VALUES (?, ?, ?, ?)",
        [name.trim(), username, hash, role]
      );
      await conn.commit();
      return res.status(201).json({
        success: true,
        message: "Admin/staff account created",
        data: { librarian_id: result.insertId, role },
      });
    }

    if (role === "student") {
      if (!registration_no || !department_id) {
        return res.status(400).json({
          success: false,
          message: "registration_no and department_id are required for students",
        });
      }
      const [[dept]] = await conn.query(
        "SELECT department_id FROM Department WHERE department_id = ?",
        [department_id]
      );
      if (!dept) {
        return res.status(400).json({ success: false, message: "Invalid department_id" });
      }

      const [result] = await conn.query(
        `INSERT INTO Students
           (name, registration_no, email, password, phone, department_id,
            academic_year, gender, date_of_birth, address, profile_bio, is_registered)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          name.trim(), registration_no.trim(), cleanEmail, hash,
          phone || null, department_id, academic_year || null,
          gender || null, date_of_birth || null, address || null, profile_bio || null,
        ]
      );
      const student_id = result.insertId;

      await conn.query(
        "INSERT INTO Library_Members (member_type, student_id, membership_date) VALUES ('student', ?, CURRENT_DATE)",
        [student_id]
      );

      await conn.commit();
      return res.status(201).json({
        success: true,
        message: "Student registered successfully",
        data: { student_id, role },
      });
    }

    if (role === "faculty") {
      if (!employee_no || !department_id) {
        return res.status(400).json({
          success: false,
          message: "employee_no and department_id are required for faculty",
        });
      }
      const [[dept]] = await conn.query(
        "SELECT department_id FROM Department WHERE department_id = ?",
        [department_id]
      );
      if (!dept) {
        return res.status(400).json({ success: false, message: "Invalid department_id" });
      }

      const [result] = await conn.query(
        `INSERT INTO Faculty
           (name, employee_no, email, password, phone, department_id,
            designation, qualification, specialization, office_location,
            gender, joining_date, profile_bio, is_registered)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          name.trim(), employee_no.trim(), cleanEmail, hash,
          phone || null, department_id, designation || null,
          qualification || null, specialization || null, office_location || null,
          gender || null, joining_date || null, profile_bio || null,
        ]
      );
      const faculty_id = result.insertId;

      await conn.query(
        "INSERT INTO Library_Members (member_type, faculty_id, membership_date) VALUES ('faculty', ?, CURRENT_DATE)",
        [faculty_id]
      );

      await conn.commit();
      return res.status(201).json({
        success: true,
        message: "Faculty registered successfully",
        data: { faculty_id, role },
      });
    }
  } catch (err) {
    await conn.rollback();
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, message: "Email or ID already exists" });
    }
    next(err);
  } finally {
    conn.release();
  }
};

// ── POST /api/auth/login ──────────────────────────────────────────────────────
// PRD §3.2 — email + password; tries all three tables
export const login = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const identifier = (email || username || "").trim();

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: "Email/username and password are required" });
    }

    let user    = null;
    let role    = null;
    let idField = null;

    // 1. Librarians — match by username or email
    {
      const [[row]] = await pool.query(
        "SELECT * FROM Librarians WHERE username = ? OR username = ?",
        [identifier, identifier]
      );
      if (row) { user = row; role = row.role; idField = "librarian_id"; }
    }

    // 2. Faculty — match by employee_no or email
    if (!user) {
      const [[row]] = await pool.query(
        "SELECT * FROM Faculty WHERE employee_no = ? OR email = ?",
        [identifier, identifier]
      );
      if (row) { user = row; role = "faculty"; idField = "faculty_id"; }
    }

    // 3. Students — match by registration_no or email
    if (!user) {
      const [[row]] = await pool.query(
        "SELECT * FROM Students WHERE registration_no = ? OR email = ?",
        [identifier, identifier]
      );
      if (row) { user = row; role = "student"; idField = "student_id"; }
    }

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // Buffer / Windows line-ending fix
    const dbHash  = getHash(user.password);
    const isMatch = await bcrypt.compare(password, dbHash);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const { accessToken, refreshToken } = generateTokens(user[idField], role);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge:   7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      data: {
        accessToken,
        user: { id: user[idField], name: user.name, role },
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

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
// PRD §3.3 — own profile
export const getMe = async (req, res, next) => {
  try {
    const { librarian_id: id, role } = req.librarian;
    let profile = null;

    if (role === "admin" || role === "staff") {
      const [[row]] = await pool.query(
        "SELECT librarian_id AS id, name, username, role FROM Librarians WHERE librarian_id = ?",
        [id]
      );
      profile = row;
    } else if (role === "faculty") {
      const [[row]] = await pool.query(
        `SELECT f.faculty_id AS id, f.name, f.email, f.phone, f.employee_no,
                f.designation, f.qualification, f.specialization,
                f.office_location, f.gender, f.joining_date, f.profile_bio,
                d.department_name, lm.member_id, lm.status AS membership_status
         FROM Faculty f
         JOIN Department d ON f.department_id = d.department_id
         LEFT JOIN Library_Members lm ON lm.faculty_id = f.faculty_id
         WHERE f.faculty_id = ?`,
        [id]
      );
      profile = row ? { ...row, role } : null;
    } else if (role === "student") {
      const [[row]] = await pool.query(
        `SELECT s.student_id AS id, s.name, s.email, s.phone, s.registration_no,
                s.academic_year, s.cgpa, s.gender, s.date_of_birth,
                s.address, s.profile_bio,
                d.department_name, lm.member_id, lm.status AS membership_status
         FROM Students s
         JOIN Department d ON s.department_id = d.department_id
         LEFT JOIN Library_Members lm ON lm.student_id = s.student_id
         WHERE s.student_id = ?`,
        [id]
      );
      profile = row ? { ...row, role } : null;
    }

    if (!profile) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/auth/me ──────────────────────────────────────────────────────────
// PRD §3.3 — update own profile (excluding email and role)
export const updateMe = async (req, res, next) => {
  try {
    const { librarian_id: id, role } = req.librarian;

    if (role === "admin" || role === "staff") {
      const { name } = req.body;
      if (!name) return res.status(400).json({ success: false, message: "name is required" });
      await pool.query("UPDATE Librarians SET name = ? WHERE librarian_id = ?", [name, id]);
    } else if (role === "faculty") {
      const { name, phone, designation, qualification, specialization,
              office_location, gender, joining_date, profile_bio } = req.body;
      const fields = [], vals = [];
      if (name            !== undefined) { fields.push("name = ?");             vals.push(name); }
      if (phone           !== undefined) { fields.push("phone = ?");            vals.push(phone); }
      if (designation     !== undefined) { fields.push("designation = ?");      vals.push(designation); }
      if (qualification   !== undefined) { fields.push("qualification = ?");    vals.push(qualification); }
      if (specialization  !== undefined) { fields.push("specialization = ?");   vals.push(specialization); }
      if (office_location !== undefined) { fields.push("office_location = ?");  vals.push(office_location); }
      if (gender          !== undefined) { fields.push("gender = ?");           vals.push(gender); }
      if (joining_date    !== undefined) { fields.push("joining_date = ?");     vals.push(joining_date); }
      if (profile_bio     !== undefined) { fields.push("profile_bio = ?");      vals.push(profile_bio); }
      if (!fields.length) return res.status(400).json({ success: false, message: "No fields to update" });
      await pool.query(`UPDATE Faculty SET ${fields.join(", ")} WHERE faculty_id = ?`, [...vals, id]);
    } else if (role === "student") {
      const { name, phone, address, profile_bio, academic_year, gender, cgpa, date_of_birth } = req.body;
      const fields = [], vals = [];
      if (name          !== undefined) { fields.push("name = ?");          vals.push(name); }
      if (phone         !== undefined) { fields.push("phone = ?");         vals.push(phone); }
      if (address       !== undefined) { fields.push("address = ?");       vals.push(address); }
      if (profile_bio   !== undefined) { fields.push("profile_bio = ?");   vals.push(profile_bio); }
      if (academic_year !== undefined) { fields.push("academic_year = ?"); vals.push(academic_year); }
      if (gender        !== undefined) { fields.push("gender = ?");        vals.push(gender); }
      if (cgpa          !== undefined) { fields.push("cgpa = ?");          vals.push(cgpa); }
      if (date_of_birth !== undefined) { fields.push("date_of_birth = ?"); vals.push(date_of_birth); }
      if (!fields.length) return res.status(400).json({ success: false, message: "No fields to update" });
      await pool.query(`UPDATE Students SET ${fields.join(", ")} WHERE student_id = ?`, [...vals, id]);
    }

    res.json({ success: true, message: "Profile updated" });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/auth/me/password ─────────────────────────────────────────────────
// PRD §3.3 — password change requires current password confirmation
export const changePassword = async (req, res, next) => {
  try {
    const { librarian_id: id, role } = req.librarian;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "currentPassword and newPassword are required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: "New password must be at least 8 characters" });
    }

    let table, idCol;
    if (role === "admin" || role === "staff") { table = "Librarians"; idCol = "librarian_id"; }
    else if (role === "faculty")               { table = "Faculty";    idCol = "faculty_id"; }
    else                                       { table = "Students";   idCol = "student_id"; }

    const [[row]] = await pool.query(
      `SELECT password FROM ${table} WHERE ${idCol} = ?`, [id]
    );
    if (!row) return res.status(404).json({ success: false, message: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, getHash(row.password));
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Current password is incorrect" });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query(`UPDATE ${table} SET password = ? WHERE ${idCol} = ?`, [newHash, id]);

    res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    next(err);
  }
};