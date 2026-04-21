// controllers/student.controller.js
// ─────────────────────────────────────────────────────────────────────────────
// Handles Student self-registration, profile view/update, and directory.
// Auth is DISABLED per project spec — no checkAuth middleware used here.
// ─────────────────────────────────────────────────────────────────────────────
import bcrypt from "bcryptjs";
import pool   from "../config/db.js";

// ── POST /api/students/register ───────────────────────────────────────────────
// Public — student self-registration.
// Body: { name, registration_no, email, password, phone?, department_id,
//         date_of_birth?, academic_year?, gender?, address?, profile_bio? }
export const registerStudent = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const {
      name, registration_no, email, password,
      phone, department_id,
      date_of_birth, academic_year, gender, address, profile_bio,
    } = req.body;

    // ── Validation ──────────────────────────────────────────────────────────
    if (!name || !registration_no || !email || !password || !department_id) {
      return res.status(400).json({
        success: false,
        message: "name, registration_no, email, password, and department_id are required",
      });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    // ── Check for existing student record (admin may have pre-created them) ─
    const [[existing]] = await conn.query(
      "SELECT student_id, is_registered FROM Students WHERE registration_no = ? OR email = ?",
      [registration_no.trim(), email.trim().toLowerCase()]
    );

    if (existing) {
      if (existing.is_registered) {
        await conn.rollback();
        return res.status(409).json({ success: false, message: "Account already registered" });
      }
      // Admin pre-created the record — attach password and mark as registered
      const hash = await bcrypt.hash(password, 10);
      await conn.query(
        `UPDATE Students
         SET password = ?, phone = COALESCE(?, phone),
             date_of_birth = COALESCE(?, date_of_birth),
             academic_year = COALESCE(?, academic_year),
             gender = COALESCE(?, gender),
             address = ?, profile_bio = ?,
             is_registered = 1
         WHERE student_id = ?`,
        [hash, phone || null, date_of_birth || null, academic_year || null,
         gender || null, address || null, profile_bio || null, existing.student_id]
      );

      // Auto-enroll as library member if not already
      const [[mem]] = await conn.query(
        "SELECT member_id FROM Library_Members WHERE student_id = ?",
        [existing.student_id]
      );
      if (!mem) {
        await conn.query(
          "INSERT INTO Library_Members (member_type, student_id, membership_date) VALUES ('student', ?, CURRENT_DATE)",
          [existing.student_id]
        );
      }

      await conn.commit();
      return res.status(200).json({
        success: true,
        message: "Account activated successfully",
        data: { student_id: existing.student_id },
      });
    }

    // ── Brand new student ────────────────────────────────────────────────────
    // Validate department exists
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
      `INSERT INTO Students
         (name, registration_no, email, password, phone, department_id,
          date_of_birth, academic_year, gender, address, profile_bio, is_registered)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        name.trim(), registration_no.trim(), email.trim().toLowerCase(),
        hash, phone || null, department_id,
        date_of_birth || null, academic_year || null,
        gender || null, address || null, profile_bio || null,
      ]
    );
    const student_id = result.insertId;

    // Auto-enroll as library member
    await conn.query(
      "INSERT INTO Library_Members (member_type, student_id, membership_date) VALUES ('student', ?, CURRENT_DATE)",
      [student_id]
    );

    await conn.commit();
    res.status(201).json({
      success: true,
      message: "Student registered successfully",
      data: { student_id },
    });
  } catch (err) {
    await conn.rollback();
    // MySQL duplicate entry
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, message: "Email or registration number already exists" });
    }
    next(err);
  } finally {
    conn.release();
  }
};

// ── GET /api/students ──────────────────────────────────────────────────────────
// Returns full directory (admin/staff view).
export const getStudents = async (req, res, next) => {
  try {
    const { search, department_id, page = 1, limit = 20 } = req.query;
    
    // 1. Precise Number Parsing
    const parsedLimit = parseInt(limit, 10) || 20;
    const parsedPage = parseInt(page, 10) || 1;
    const offset = (parsedPage - 1) * parsedLimit;

    const params = [];
    let where = "WHERE 1=1";

    // 2. Explicit Aliasing
    // We use 's.' to tell MySQL these columns belong to the Students table
    if (search) {
      where += " AND (s.name LIKE ? OR s.registration_no LIKE ? OR s.email LIKE ?)";
      const searchVal = `%${search}%`;
      params.push(searchVal, searchVal, searchVal);
    }
    
    if (department_id) {
      where += " AND s.department_id = ?";
      params.push(department_id);
    }

    // 3. Main Query with LEFT JOINs
    const [rows] = await pool.query(
      `SELECT 
          s.student_id, s.name, s.registration_no, s.email, s.phone,
          s.academic_year, s.cgpa, s.gender, s.created_at, s.is_registered,
          d.department_name,
          lm.member_id, lm.status AS membership_status
       FROM Students s
       LEFT JOIN Department d ON s.department_id = d.department_id
       LEFT JOIN Library_Members lm ON lm.student_id = s.student_id
       ${where}
       ORDER BY s.name ASC
       LIMIT ? OFFSET ?`,
      [...params, parsedLimit, offset]
    );

    // 4. Count Query with Matching Alias
    // CRITICAL: We MUST include 's' alias here because 'where' uses 's.name'
    const [countResult] = await pool.query(
      `SELECT COUNT(*) AS total FROM Students s ${where}`,
      params
    );
    
    const total = countResult[0]?.total || 0;

    res.json({
      success: true,
      data: rows,
      meta: { 
        total, 
        page: parsedPage, 
        limit: parsedLimit, 
        pages: Math.ceil(total / parsedLimit) || 1
      },
    });
  } catch (err) {
    // Check your TERMINAL/CONSOLE where the node process is running
    // It will print the exact MySQL error (e.g., "Unknown column 'cgpa'")
    console.error("Critical SQL Error:", err.message);
    next(err);
  }
};

// ── GET /api/students/:id ──────────────────────────────────────────────────────
export const getStudent = async (req, res, next) => {
  try {
    const [[student]] = await pool.query(
      `SELECT s.student_id, s.name, s.registration_no, s.email, s.phone,
              s.academic_year, s.cgpa, s.gender, s.date_of_birth,
              s.created_at, s.address, s.profile_bio, s.is_registered,
              d.department_id, d.department_name,
              lm.member_id, lm.status AS membership_status, lm.membership_date
       FROM Students s
       JOIN Department d ON s.department_id = d.department_id
       LEFT JOIN Library_Members lm ON lm.student_id = s.student_id
       WHERE s.student_id = ?`,
      [req.params.id]
    );
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

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
       WHERE lm.student_id = ?
       ORDER BY it.issue_date DESC
       LIMIT 10`,
      [req.params.id]
    );

    res.json({ success: true, data: { ...student, borrow_history: history } });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/students/:id ──────────────────────────────────────────────────────
// Update profile (no auth — caller is responsible for identity)
export const updateStudent = async (req, res, next) => {
  try {
    const {
      name, phone, address, profile_bio,
      academic_year, gender, cgpa, date_of_birth,
    } = req.body;

    const fields = [];
    const vals   = [];
    if (name         !== undefined) { fields.push("name = ?");          vals.push(name); }
    if (phone        !== undefined) { fields.push("phone = ?");         vals.push(phone); }
    if (address      !== undefined) { fields.push("address = ?");       vals.push(address); }
    if (profile_bio  !== undefined) { fields.push("profile_bio = ?");   vals.push(profile_bio); }
    if (academic_year!== undefined) { fields.push("academic_year = ?"); vals.push(academic_year); }
    if (gender       !== undefined) { fields.push("gender = ?");        vals.push(gender); }
    if (cgpa         !== undefined) { fields.push("cgpa = ?");          vals.push(cgpa); }
    if (date_of_birth!== undefined) { fields.push("date_of_birth = ?"); vals.push(date_of_birth); }

    if (!fields.length) {
      return res.status(400).json({ success: false, message: "No fields to update" });
    }

    const [result] = await pool.query(
      `UPDATE Students SET ${fields.join(", ")} WHERE student_id = ?`,
      [...vals, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    res.json({ success: true, message: "Profile updated" });
  } catch (err) {
    next(err);
  }
};