// controllers/member.controller.js
// ─────────────────────────────────────────────────────────────────────────────
//  PRD §5 — Member Management
//  Members are library patrons (linked to Students or Faculty).
//  Admin has full CRUD; delete is blocked if member has active issues.
// ─────────────────────────────────────────────────────────────────────────────
import pool from "../config/db.js";

const MEMBER_SELECT = `
  SELECT lm.member_id, lm.member_type, lm.membership_date, lm.status,
         COALESCE(s.name,  f.name)  AS name,
         COALESCE(s.email, f.email) AS email,
         COALESCE(s.phone, f.phone) AS phone,
         d.department_name,
         lm.created_at
  FROM Library_Members lm
  LEFT JOIN Students   s ON lm.student_id  = s.student_id
  LEFT JOIN Faculty    f ON lm.faculty_id  = f.faculty_id
  LEFT JOIN Department d ON COALESCE(s.department_id, f.department_id) = d.department_id
`;

// ── GET /api/members ───────────────────────────────────────────────────────────
export const getMembers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let where = "WHERE 1=1";

    if (status) {
      where += " AND lm.status = ?";
      params.push(status);
    }
    if (search) {
      where += " AND (COALESCE(s.name, f.name) LIKE ? OR COALESCE(s.email, f.email) LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    const [rows] = await pool.query(
      `${MEMBER_SELECT} ${where} ORDER BY lm.created_at DESC LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM Library_Members lm
       LEFT JOIN Students s ON lm.student_id = s.student_id
       LEFT JOIN Faculty  f ON lm.faculty_id = f.faculty_id
       ${where}`,
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

// ── GET /api/members/:id ───────────────────────────────────────────────────────
export const getMember = async (req, res, next) => {
  try {
    const [[member]] = await pool.query(
      `${MEMBER_SELECT} WHERE lm.member_id = ?`,
      [req.params.id]
    );
    if (!member) return res.status(404).json({ success: false, message: "Member not found" });

    // Active & overdue issues
    const [issues] = await pool.query(
      `SELECT it.issue_id, b.title, it.issue_date, it.due_date, it.return_date,
              CASE WHEN it.return_date IS NULL AND it.due_date < CURRENT_DATE THEN 'overdue'
                   WHEN it.return_date IS NULL THEN 'active'
                   ELSE 'returned' END AS status
       FROM Issue_Transactions it
       JOIN Book_Copies bc ON it.copy_id = bc.copy_id
       JOIN Books b        ON bc.book_id = b.book_id
       WHERE it.member_id = ?
       ORDER BY it.issue_date DESC`,
      [req.params.id]
    );

    res.json({ success: true, data: { ...member, issues } });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/members ──────────────────────────────────────────────────────────
// PRD §5.1 — admin manually adds a member (standalone, not tied to a user account)
// If student_id or faculty_id is provided, links to that record.
export const createMember = async (req, res, next) => {
  try {
    const { member_type, student_id, faculty_id, membership_date } = req.body;

    if (!member_type || !["student", "faculty"].includes(member_type)) {
      return res.status(400).json({ success: false, message: "member_type must be 'student' or 'faculty'" });
    }
    if (member_type === "student" && !student_id) {
      return res.status(400).json({ success: false, message: "student_id is required for student members" });
    }
    if (member_type === "faculty" && !faculty_id) {
      return res.status(400).json({ success: false, message: "faculty_id is required for faculty members" });
    }

    const [result] = await pool.query(
      `INSERT INTO Library_Members (member_type, student_id, faculty_id, membership_date)
       VALUES (?, ?, ?, ?)`,
      [
        member_type,
        member_type === "student" ? student_id : null,
        member_type === "faculty" ? faculty_id : null,
        membership_date || new Date().toISOString().split("T")[0],
      ]
    );

    res.status(201).json({
      success: true,
      message: "Member created",
      data: { member_id: result.insertId },
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, message: "Student or faculty is already a member" });
    }
    next(err);
  }
};

// ── PUT /api/members/:id ───────────────────────────────────────────────────────
// PRD §5.1 — update status (active | suspended) or membership_date
export const updateMember = async (req, res, next) => {
  try {
    const { status, membership_date } = req.body;

    const fields = [], vals = [];
    if (status          !== undefined) { fields.push("status = ?");          vals.push(status); }
    if (membership_date !== undefined) { fields.push("membership_date = ?"); vals.push(membership_date); }

    if (!fields.length) {
      return res.status(400).json({ success: false, message: "No fields to update" });
    }

    const [result] = await pool.query(
      `UPDATE Library_Members SET ${fields.join(", ")} WHERE member_id = ?`,
      [...vals, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }

    res.json({ success: true, message: "Member updated" });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/members/:id ────────────────────────────────────────────────────
// PRD §5.1 — blocked if member has active (unreturned) issues
export const deleteMember = async (req, res, next) => {
  try {
    const [[{ active }]] = await pool.query(
      `SELECT COUNT(*) AS active
       FROM Issue_Transactions
       WHERE member_id = ? AND return_date IS NULL`,
      [req.params.id]
    );

    if (active > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete: member has ${active} active issue(s)`,
      });
    }

    const [result] = await pool.query(
      "DELETE FROM Library_Members WHERE member_id = ?",
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }

    res.json({ success: true, message: "Member deleted" });
  } catch (err) {
    next(err);
  }
};