// controllers/issue.controller.js
// ─────────────────────────────────────────────────────────────────────────────
//  PRD §6 — Book Issue & Return
//
//  Bug fixes vs original:
//  - issueBook used req.user?.id  but checkAuth attaches req.librarian.
//    Fixed to req.librarian?.librarian_id.
//  - Routes are now /api/issues (PRD §7.4) not /api/transactions.
//  - Added GET /api/issues/:id  (PRD §7.4)
//  - Added GET /api/issues/book/:bookId (PRD §7.4)
// ─────────────────────────────────────────────────────────────────────────────
import pool from "../config/db.js";

// ── POST /api/issues ───────────────────────────────────────────────────────────
// PRD §6.1 — Issue a book (atomic: insert txn + mark copy issued)
export const issueBook = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { copy_id, member_id } = req.body;
    // BUG FIX: was req.user?.id — checkAuth attaches req.librarian
    const librarian_id = req.librarian?.librarian_id;

    if (!copy_id || !member_id) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: "copy_id and member_id are required" });
    }

    // 1. Verify copy exists and is available
    const [[copy]] = await conn.query(
      "SELECT copy_id, book_id, status FROM Book_Copies WHERE copy_id = ?",
      [copy_id]
    );
    if (!copy) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: "Book copy not found" });
    }
    if (copy.status !== "available") {
      await conn.rollback();
      // PRD §6.5 — 422 for unavailable book
      return res.status(422).json({ success: false, message: "Book copy is not available" });
    }

    // 2. Fetch member + borrowing policy
    const [[member]] = await conn.query(
      `SELECT lm.member_id, lm.member_type, lm.status,
              bp.max_books_allowed, bp.loan_duration_days, bp.fine_per_day
       FROM Library_Members lm
       JOIN Borrowing_Policy bp ON lm.member_type = bp.member_type
       WHERE lm.member_id = ?`,
      [member_id]
    );
    if (!member) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: "Library member not found" });
    }
    if (member.status !== "active") {
      await conn.rollback();
      return res.status(403).json({ success: false, message: "Member account is suspended" });
    }

    // 3. Borrowing limit check
    const [[{ current_count }]] = await conn.query(
      "SELECT COUNT(*) AS current_count FROM Issue_Transactions WHERE member_id = ? AND return_date IS NULL",
      [member_id]
    );
    if (current_count >= member.max_books_allowed) {
      await conn.rollback();
      return res.status(409).json({
        success: false,
        message: `Borrowing limit reached (${member.max_books_allowed} books for ${member.member_type}s)`,
      });
    }

    // 4. PRD §6.1 — optional: member cannot have the same book issued twice
    const [[{ dup }]] = await conn.query(
      `SELECT COUNT(*) AS dup
       FROM Issue_Transactions it
       JOIN Book_Copies bc ON it.copy_id = bc.copy_id
       WHERE it.member_id = ? AND bc.book_id = ? AND it.return_date IS NULL`,
      [member_id, copy.book_id]
    );
    if (dup > 0) {
      await conn.rollback();
      return res.status(409).json({
        success: false,
        message: "Member already has a copy of this book issued",
      });
    }

    // 5. Calculate due date
    const issueDate = new Date();
    const dueDate   = member.loan_duration_days
      ? new Date(issueDate.getTime() + member.loan_duration_days * 86_400_000)
      : new Date("9999-12-31");

    // 6. Insert transaction
    const [result] = await conn.query(
      `INSERT INTO Issue_Transactions
         (copy_id, member_id, librarian_id, issue_date, due_date, fine_amount)
       VALUES (?, ?, ?, CURRENT_DATE, ?, 0.00)`,
      [copy_id, member_id, librarian_id, dueDate.toISOString().split("T")[0]]
    );

    // 7. Mark copy as issued
    await conn.query(
      "UPDATE Book_Copies SET status = 'issued' WHERE copy_id = ?", [copy_id]
    );

    await conn.commit();

    res.status(201).json({
      success: true,
      message: "Book issued successfully",
      data: {
        issue_id:        result.insertId,
        copy_id,
        member_id,
        issue_date:      issueDate.toISOString().split("T")[0],
        due_date:        dueDate.toISOString().split("T")[0],
        member_type:     member.member_type,
        books_remaining: member.max_books_allowed - current_count - 1,
      },
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

// ── PUT /api/issues/:id/return ────────────────────────────────────────────────
// PRD §6.2 — Return a book (atomic: update txn + mark copy available)
export const returnBook = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { id } = req.params;

    const [[txn]] = await conn.query(
      `SELECT it.issue_id, it.copy_id, it.member_id, it.due_date,
              it.return_date, bp.fine_per_day
       FROM Issue_Transactions it
       JOIN Library_Members lm  ON it.member_id = lm.member_id
       JOIN Borrowing_Policy bp ON lm.member_type = bp.member_type
       WHERE it.issue_id = ?`,
      [id]
    );

    if (!txn) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: "Issue record not found" });
    }
    if (txn.return_date) {
      await conn.rollback();
      return res.status(409).json({ success: false, message: "Book already returned" });
    }

    const today    = new Date();
    const due      = new Date(txn.due_date);
    const daysLate = Math.max(0, Math.floor((today - due) / 86_400_000));
    const fineAmt  = (daysLate * parseFloat(txn.fine_per_day)).toFixed(2);

    await conn.query(
      "UPDATE Issue_Transactions SET return_date = CURRENT_DATE, fine_amount = ? WHERE issue_id = ?",
      [fineAmt, id]
    );
    await conn.query(
      "UPDATE Book_Copies SET status = 'available' WHERE copy_id = ?",
      [txn.copy_id]
    );

    await conn.commit();

    res.json({
      success: true,
      message: "Book returned successfully",
      data: {
        issue_id:    txn.issue_id,
        return_date: today.toISOString().split("T")[0],
        days_late:   daysLate,
        fine_amount: parseFloat(fineAmt),
      },
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

// ── GET /api/issues ────────────────────────────────────────────────────────────
// PRD §7.4 — all issue records, filterable by status and member
export const getIssues = async (req, res, next) => {
  try {
    const { status, member_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let where = "WHERE 1=1";

    if (member_id) {
      where += " AND it.member_id = ?";
      params.push(member_id);
    }
    if (status === "active") {
      where += " AND it.return_date IS NULL AND it.due_date >= CURRENT_DATE";
    } else if (status === "overdue") {
      where += " AND it.return_date IS NULL AND it.due_date < CURRENT_DATE";
    } else if (status === "returned") {
      where += " AND it.return_date IS NOT NULL";
    }

    const [rows] = await pool.query(
      `SELECT it.issue_id,
              COALESCE(s.name, f.name) AS member_name,
              lm.member_type,
              b.title, b.isbn, bc.barcode,
              it.issue_date, it.due_date, it.return_date, it.fine_amount,
              CASE WHEN it.return_date IS NOT NULL THEN 'returned'
                   WHEN it.due_date < CURRENT_DATE  THEN 'overdue'
                   ELSE 'active' END AS status
       FROM Issue_Transactions it
       JOIN Library_Members lm ON it.member_id = lm.member_id
       LEFT JOIN Students s    ON lm.student_id = s.student_id
       LEFT JOIN Faculty  f    ON lm.faculty_id = f.faculty_id
       JOIN Book_Copies bc     ON it.copy_id    = bc.copy_id
       JOIN Books b            ON bc.book_id    = b.book_id
       ${where}
       ORDER BY it.issue_date DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM Issue_Transactions it ${where}`,
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

// ── GET /api/issues/:id ────────────────────────────────────────────────────────
// PRD §7.4 — single issue record
export const getIssue = async (req, res, next) => {
  try {
    const [[row]] = await pool.query(
      `SELECT it.*,
              COALESCE(s.name, f.name) AS member_name,
              lm.member_type,
              b.title, b.isbn, bc.barcode, bc.shelf_location,
              CASE WHEN it.return_date IS NOT NULL THEN 'returned'
                   WHEN it.due_date < CURRENT_DATE  THEN 'overdue'
                   ELSE 'active' END AS status
       FROM Issue_Transactions it
       JOIN Library_Members lm ON it.member_id = lm.member_id
       LEFT JOIN Students s    ON lm.student_id = s.student_id
       LEFT JOIN Faculty  f    ON lm.faculty_id = f.faculty_id
       JOIN Book_Copies bc     ON it.copy_id    = bc.copy_id
       JOIN Books b            ON bc.book_id    = b.book_id
       WHERE it.issue_id = ?`,
      [req.params.id]
    );
    if (!row) return res.status(404).json({ success: false, message: "Issue record not found" });
    res.json({ success: true, data: row });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/issues/overdue ────────────────────────────────────────────────────
export const getOverdue = async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT it.issue_id,
              COALESCE(s.name, f.name) AS member_name,
              lm.member_type,
              b.title, bc.barcode,
              it.issue_date, it.due_date,
              DATEDIFF(CURRENT_DATE, it.due_date) AS days_overdue
       FROM Issue_Transactions it
       JOIN Library_Members lm ON it.member_id = lm.member_id
       LEFT JOIN Students s    ON lm.student_id = s.student_id
       LEFT JOIN Faculty  f    ON lm.faculty_id = f.faculty_id
       JOIN Book_Copies bc     ON it.copy_id    = bc.copy_id
       JOIN Books b            ON bc.book_id    = b.book_id
       WHERE it.return_date IS NULL AND it.due_date < CURRENT_DATE
       ORDER BY it.due_date ASC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/issues/member/:memberId ──────────────────────────────────────────
// PRD §7.4
export const getMemberIssues = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT it.issue_id, b.title, b.isbn, bc.barcode, bc.shelf_location,
              it.issue_date, it.due_date, it.return_date, it.fine_amount,
              CASE WHEN it.return_date IS NOT NULL THEN 'returned'
                   WHEN it.due_date < CURRENT_DATE  THEN 'overdue'
                   ELSE 'active' END AS status
       FROM Issue_Transactions it
       JOIN Book_Copies bc ON it.copy_id = bc.copy_id
       JOIN Books b        ON bc.book_id = b.book_id
       WHERE it.member_id = ?
       ORDER BY it.issue_date DESC`,
      [req.params.memberId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/issues/book/:bookId ───────────────────────────────────────────────
// PRD §7.4
export const getBookIssues = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT it.issue_id,
              COALESCE(s.name, f.name) AS member_name,
              lm.member_type,
              bc.barcode, it.issue_date, it.due_date, it.return_date, it.fine_amount,
              CASE WHEN it.return_date IS NOT NULL THEN 'returned'
                   WHEN it.due_date < CURRENT_DATE  THEN 'overdue'
                   ELSE 'active' END AS status
       FROM Issue_Transactions it
       JOIN Library_Members lm ON it.member_id = lm.member_id
       LEFT JOIN Students s    ON lm.student_id = s.student_id
       LEFT JOIN Faculty  f    ON lm.faculty_id = f.faculty_id
       JOIN Book_Copies bc     ON it.copy_id    = bc.copy_id
       WHERE bc.book_id = ?
       ORDER BY it.issue_date DESC`,
      [req.params.bookId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};