// controllers/issue.controller.js
import pool from "../config/db.js";

// ── issueBook ─────────────────────────────────────────────────────────────────
// POST /api/transactions/issue
// Body: { copy_id, member_id }
// Authenticated librarian handles the transaction.
export const issueBook = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { copy_id, member_id } = req.body;
    const librarian_id = req.librarian.librarian_id;

    // 1. Verify the copy exists and is available
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
      return res.status(409).json({ success: false, message: "Book copy is not available" });
    }

    // 2. Fetch the member and their borrowing policy
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

    // 3. Check borrowing limit: count currently unreturned books
    const [[{ current_count }]] = await conn.query(
      `SELECT COUNT(*) AS current_count
       FROM Issue_Transactions
       WHERE member_id = ? AND return_date IS NULL`,
      [member_id]
    );
    if (current_count >= member.max_books_allowed) {
      await conn.rollback();
      return res.status(409).json({
        success: false,
        message: `Borrowing limit reached (${member.max_books_allowed} books for ${member.member_type}s)`,
      });
    }

    // 4. Calculate due date (NULL loan_duration_days = no limit → set far future)
    const issueDate = new Date();
    const dueDate   = member.loan_duration_days
      ? new Date(issueDate.getTime() + member.loan_duration_days * 86400000)
      : new Date("9999-12-31");

    // 5. Create the transaction record
    const [result] = await conn.query(
      `INSERT INTO Issue_Transactions
         (copy_id, member_id, librarian_id, issue_date, due_date, fine_amount)
       VALUES (?, ?, ?, CURRENT_DATE, ?, 0.00)`,
      [copy_id, member_id, librarian_id, dueDate.toISOString().split("T")[0]]
    );

    // 6. Update copy status to 'issued'
    await conn.query(
      "UPDATE Book_Copies SET status = 'issued' WHERE copy_id = ?",
      [copy_id]
    );

    await conn.commit();

    res.status(201).json({
      success: true,
      message: "Book issued successfully",
      data: {
        issue_id:    result.insertId,
        copy_id,
        member_id,
        issue_date:  issueDate.toISOString().split("T")[0],
        due_date:    dueDate.toISOString().split("T")[0],
        member_type: member.member_type,
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

// ── returnBook ────────────────────────────────────────────────────────────────
// PATCH /api/transactions/:issueId/return
export const returnBook = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { issueId } = req.params;

    // Fetch transaction + policy for fine calculation
    const [[txn]] = await conn.query(
      `SELECT it.issue_id, it.copy_id, it.member_id, it.due_date,
              it.return_date, bp.fine_per_day
       FROM Issue_Transactions it
       JOIN Library_Members lm  ON it.member_id = lm.member_id
       JOIN Borrowing_Policy bp ON lm.member_type = bp.member_type
       WHERE it.issue_id = ?`,
      [issueId]
    );

    if (!txn) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }
    if (txn.return_date) {
      await conn.rollback();
      return res.status(409).json({ success: false, message: "Book already returned" });
    }

    // Calculate fine
    const today     = new Date();
    const due       = new Date(txn.due_date);
    const daysLate  = Math.max(0, Math.floor((today - due) / 86400000));
    const fineAmt   = (daysLate * parseFloat(txn.fine_per_day)).toFixed(2);

    // Update transaction with return date and fine
    await conn.query(
      `UPDATE Issue_Transactions
       SET return_date = CURRENT_DATE, fine_amount = ?
       WHERE issue_id = ?`,
      [fineAmt, issueId]
    );

    // Restore copy status
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

// ── getOverdue ────────────────────────────────────────────────────────────────
// GET /api/transactions/overdue
export const getOverdue = async (_req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT * FROM vw_overdue_transactions");
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// ── getMemberTransactions ─────────────────────────────────────────────────────
// GET /api/transactions/member/:memberId
export const getMemberTransactions = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT it.issue_id, b.title, b.isbn, bc.barcode, bc.shelf_location,
              it.issue_date, it.due_date, it.return_date, it.fine_amount,
              CASE WHEN it.return_date IS NULL AND it.due_date < CURRENT_DATE
                   THEN 'overdue'
                   WHEN it.return_date IS NULL THEN 'active'
                   ELSE 'returned' END AS transaction_status
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