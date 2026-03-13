// controllers/faculty.controller.js
// ─────────────────────────────────────────────────────────────────────────────
// Handles Faculty self-registration, profile view/update, and directory.
// Auth is DISABLED per project spec.
// ─────────────────────────────────────────────────────────────────────────────
import bcrypt from "bcryptjs";
import pool   from "../config/db.js";

// ── POST /api/faculty/register ────────────────────────────────────────────────
// Public — faculty self-registration.
// Body: { name, employee_no, email, password, phone?, department_id,
//         designation?, qualification?, specialization?,
//         office_location?, gender?, joining_date?, profile_bio? }
export const registerFaculty = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const {
      name, employee_no, email, password, phone, department_id,
      designation, qualification, specialization,
      office_location, gender, joining_date, profile_bio,
    } = req.body;

    // ── Validation ──────────────────────────────────────────────────────────
    if (!name || !employee_no || !email || !password || !department_id) {
      return res.status(400).json({
        success: false,
        message: "name, employee_no, email, password, and department_id are required",
      });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    // ── Check for admin pre-created record ──────────────────────────────────
    const [[existing]] = await conn.query(
      "SELECT faculty_id, is_registered FROM Faculty WHERE employee_no = ? OR email = ?",
      [employee_no.trim(), email.trim().toLowerCase()]
    );

    if (existing) {
      if (existing.is_registered) {
        await conn.rollback();
        return res.status(409).json({ success: false, message: "Account already registered" });
      }
      // Attach password and fill profile on pre-existing record
      const hash = await bcrypt.hash(password, 10);
      await conn.query(
        `UPDATE Faculty
         SET password = ?, phone = COALESCE(?, phone),
             designation = COALESCE(?, designation),
             qualification = ?, specialization = ?,
             office_location = ?, gender = COALESCE(?, gender),
             joining_date = COALESCE(?, joining_date),
             profile_bio = ?, is_registered = 1
         WHERE faculty_id = ?`,
        [
          hash, phone || null,
          designation || null, qualification || null,
          specialization || null, office_location || null,
          gender || null, joining_date || null,
          profile_bio || null, existing.faculty_id,
        ]
      );

      // Auto-enroll as library member if not already
      const [[mem]] = await conn.query(
        "SELECT member_id FROM Library_Members WHERE faculty_id = ?",
        [existing.faculty_id]
      );
      if (!mem) {
        await conn.query(
          "INSERT INTO Library_Members (member_type, faculty_id, membership_date) VALUES ('faculty', ?, CURRENT_DATE)",
          [existing.faculty_id]
        );
      }

      await conn.commit();
      return res.status(200).json({
        success: true,
        message: "Account activated successfully",
        data: { faculty_id: existing.faculty_id },
      });
    }

    // ── Brand new faculty member ─────────────────────────────────────────────
    const [[dept]] = await conn.query(
      "SELECT department_id FROM Department WHERE department_id = ?",
      [department_id]
    );
    if (!dept) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: "Invalid department_id" });
    }

    const hash = await bcrypt.hash(password, 10);
    const [result] = await conn.query(
      `INSERT INTO Faculty
         (name, employee_no, email, password, phone, department_id,
          designation, qualification, specialization,
          office_location, gender, joining_date, profile_bio, is_registered)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        name.trim(), employee_no.trim(), email.trim().toLowerCase(),
        hash, phone || null, department_id,
        designation || null, qualification || null,
        specialization || null, office_location || null,
        gender || null, joining_date || null,
        profile_bio || null,
      ]
    );
    const faculty_id = result.insertId;

    // Auto-enroll as library member
    await conn.query(
      "INSERT INTO Library_Members (member_type, faculty_id, membership_date) VALUES ('faculty', ?, CURRENT_DATE)",
      [faculty_id]
    );

    await conn.commit();
    res.status(201).json({
      success: true,
      message: "Faculty registered successfully",
      data: { faculty_id },
    });
  } catch (err) {
    await conn.rollback();
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, message: "Email or employee number already exists" });
    }
    next(err);
  } finally {
    conn.release();
  }
};

// ── GET /api/faculty ───────────────────────────────────────────────────────────
export const getFacultyList = async (req, res, next) => {
  try {
    const { search, department_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let where = "WHERE 1=1";

    if (search) {
      where += " AND (f.name LIKE ? OR f.employee_no LIKE ? OR f.email LIKE ? OR f.designation LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (department_id) {
      where += " AND f.department_id = ?";
      params.push(department_id);
    }

    const [rows] = await pool.query(
      `SELECT f.faculty_id, f.name, f.employee_no, f.email, f.phone,
              f.designation, f.qualification, f.specialization,
              f.office_location, f.gender, f.joining_date, f.is_registered,
              d.department_name,
              lm.member_id, lm.status AS membership_status
       FROM Faculty f
       JOIN Department d ON f.department_id = d.department_id
       LEFT JOIN Library_Members lm ON lm.faculty_id = f.faculty_id
       ${where}
       ORDER BY f.name
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM Faculty f ${where}`,
      params
    );

    res.json({
      success: true,
      data: rows,
      meta: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/faculty/:id ───────────────────────────────────────────────────────
export const getFaculty = async (req, res, next) => {
  try {
    const [[faculty]] = await pool.query(
      `SELECT f.faculty_id, f.name, f.employee_no, f.email, f.phone,
              f.designation, f.qualification, f.specialization,
              f.office_location, f.gender, f.joining_date,
              f.profile_bio, f.is_registered,
              d.department_id, d.department_name,
              lm.member_id, lm.status AS membership_status, lm.membership_date
       FROM Faculty f
       JOIN Department d ON f.department_id = d.department_id
       LEFT JOIN Library_Members lm ON lm.faculty_id = f.faculty_id
       WHERE f.faculty_id = ?`,
      [req.params.id]
    );
    if (!faculty) return res.status(404).json({ success: false, message: "Faculty not found" });

    // Borrow history
    const [history] = await pool.query(
      `SELECT it.issue_id, b.title, bc.barcode, it.issue_date, it.due_date,
              it.return_date, it.fine_amount,
              CASE WHEN it.return_date IS NULL AND it.due_date < CURRENT_DATE THEN 'overdue'
                   WHEN it.return_date IS NULL THEN 'active'
                   ELSE 'returned' END AS status
       FROM Issue_Transactions it
       JOIN Library_Members lm ON it.member_id = lm.member_id
       JOIN Book_Copies bc     ON it.copy_id   = bc.copy_id
       JOIN Books b            ON bc.book_id   = b.book_id
       WHERE lm.faculty_id = ?
       ORDER BY it.issue_date DESC
       LIMIT 10`,
      [req.params.id]
    );

    res.json({ success: true, data: { ...faculty, borrow_history: history } });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/faculty/:id ───────────────────────────────────────────────────────
export const updateFaculty = async (req, res, next) => {
  try {
    const {
      name, phone, designation, qualification, specialization,
      office_location, gender, joining_date, profile_bio,
    } = req.body;

    const fields = [];
    const vals   = [];
    if (name            !== undefined) { fields.push("name = ?");             vals.push(name); }
    if (phone           !== undefined) { fields.push("phone = ?");            vals.push(phone); }
    if (designation     !== undefined) { fields.push("designation = ?");      vals.push(designation); }
    if (qualification   !== undefined) { fields.push("qualification = ?");    vals.push(qualification); }
    if (specialization  !== undefined) { fields.push("specialization = ?");   vals.push(specialization); }
    if (office_location !== undefined) { fields.push("office_location = ?");  vals.push(office_location); }
    if (gender          !== undefined) { fields.push("gender = ?");           vals.push(gender); }
    if (joining_date    !== undefined) { fields.push("joining_date = ?");     vals.push(joining_date); }
    if (profile_bio     !== undefined) { fields.push("profile_bio = ?");      vals.push(profile_bio); }

    if (!fields.length) {
      return res.status(400).json({ success: false, message: "No fields to update" });
    }

    const [result] = await pool.query(
      `UPDATE Faculty SET ${fields.join(", ")} WHERE faculty_id = ?`,
      [...vals, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Faculty not found" });
    }

    res.json({ success: true, message: "Profile updated" });
  } catch (err) {
    next(err);
  }
};