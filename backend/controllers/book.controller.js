// controllers/book.controller.js
// ─────────────────────────────────────────────────────────────────────────────
// Week 2 — Full CRUD for Books + Book_Copies availability tracking
// ─────────────────────────────────────────────────────────────────────────────
import pool from "../config/db.js";

// ── GET /api/books ─────────────────────────────────────────────────────────────
// Supports: ?search=  ?category_id=  ?page=  ?limit=
export const getBooks = async (req, res, next) => {
  try {
    const { search, category_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let where = "WHERE 1=1";

    // IMPORTANT: Use "b." prefix to avoid ambiguity
    if (search) {
      where += " AND (b.title LIKE ? OR b.isbn LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category_id) {
      where += " AND b.category_id = ?";
      params.push(category_id);
    }

    // Main Query
    const [rows] = await pool.query(
      `SELECT
          b.book_id,
          b.title,
          b.isbn,
          b.edition,
          b.publication_year,
          p.publisher_name,
          c.category_id,
          c.category_name,
          (SELECT GROUP_CONCAT(a.author_name SEPARATOR ', ') 
           FROM Book_Authors ba 
           JOIN Authors a ON ba.author_id = a.author_id 
           WHERE ba.book_id = b.book_id) AS authors,
          COUNT(DISTINCT bc.copy_id) AS total_copies,
          SUM(CASE WHEN bc.status = 'available' THEN 1 ELSE 0 END) AS available_copies
       FROM Books b
       LEFT JOIN Publishers p    ON b.publisher_id  = p.publisher_id
       LEFT JOIN Categories c    ON b.category_id   = c.category_id
       LEFT JOIN Book_Copies bc  ON b.book_id       = bc.book_id
       ${where}
       GROUP BY b.book_id, p.publisher_name, c.category_id
       ORDER BY b.title
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    // Fixed Count Query: Simple and direct
    const [countResult] = await pool.query(
      `SELECT COUNT(*) AS total FROM Books b ${where}`,
      params
    );
    
    // Check if countResult exists to prevent "cannot destructure property total"
    const total = countResult[0]?.total || 0;

    res.json({
      success: true,
      data: rows,
      meta: {
        total,
        page:  Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("SQL Error in getBooks:", err.message);
    next(err); // This will now send the actual error to your frontend
  }
};

// ── GET /api/books/:id ─────────────────────────────────────────────────────────
export const getBook = async (req, res, next) => {
  try {
    const [[book]] = await pool.query(
      `SELECT
         b.*,
         p.publisher_name,
         c.category_name,
         GROUP_CONCAT(a.author_name ORDER BY ba.author_order SEPARATOR ', ') AS authors
       FROM Books b
       LEFT JOIN Publishers p    ON b.publisher_id = p.publisher_id
       LEFT JOIN Categories c    ON b.category_id  = c.category_id
       LEFT JOIN Book_Authors ba ON b.book_id       = ba.book_id
       LEFT JOIN Authors a       ON ba.author_id    = a.author_id
       WHERE b.book_id = ?
       GROUP BY b.book_id`,
      [req.params.id]
    );

    if (!book) return res.status(404).json({ success: false, message: "Book not found" });

    const [copies] = await pool.query(
      "SELECT copy_id, barcode, shelf_location, status FROM Book_Copies WHERE book_id = ? ORDER BY copy_id",
      [req.params.id]
    );

    res.json({ success: true, data: { ...book, copies } });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/books  (admin only) ──────────────────────────────────────────────
// Body: { title, isbn, edition, publication_year, publisher_id, category_id,
//         author_ids: [1,2], copies: [{ barcode, shelf_location }] }
export const createBook = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const {
      title, isbn, edition, publication_year,
      publisher_id, category_id,
      author_ids = [],
      copies = [],
    } = req.body;

    if (!title) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: "title is required" });
    }

    // 1. Insert book
    const [result] = await conn.query(
      `INSERT INTO Books (title, isbn, edition, publication_year, publisher_id, category_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, isbn || null, edition || null, publication_year || null,
       publisher_id || null, category_id || null]
    );
    const book_id = result.insertId;

    // 2. Link authors
    if (author_ids.length) {
      const vals = author_ids.map((aid, i) => [book_id, aid, i + 1]);
      await conn.query(
        "INSERT INTO Book_Authors (book_id, author_id, author_order) VALUES ?",
        [vals]
      );
    }

    // 3. Insert physical copies
    if (copies.length) {
      const copyVals = copies.map(({ barcode, shelf_location }) => [
        book_id, barcode, shelf_location || null,
      ]);
      await conn.query(
        "INSERT INTO Book_Copies (book_id, barcode, shelf_location) VALUES ?",
        [copyVals]
      );
    }

    await conn.commit();
    res.status(201).json({ success: true, message: "Book created", data: { book_id } });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

// ── PUT /api/books/:id  (admin only) ──────────────────────────────────────────
// Replaces book metadata and re-syncs author list.
export const updateBook = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const {
      title, isbn, edition, publication_year,
      publisher_id, category_id,
      author_ids,
    } = req.body;
    const { id } = req.params;

    // Build dynamic SET clause
    const fields = [];
    const vals   = [];
    if (title            !== undefined) { fields.push("title = ?");            vals.push(title); }
    if (isbn             !== undefined) { fields.push("isbn = ?");             vals.push(isbn); }
    if (edition          !== undefined) { fields.push("edition = ?");          vals.push(edition); }
    if (publication_year !== undefined) { fields.push("publication_year = ?"); vals.push(publication_year); }
    if (publisher_id     !== undefined) { fields.push("publisher_id = ?");     vals.push(publisher_id); }
    if (category_id      !== undefined) { fields.push("category_id = ?");      vals.push(category_id); }

    if (fields.length) {
      await conn.query(
        `UPDATE Books SET ${fields.join(", ")} WHERE book_id = ?`,
        [...vals, id]
      );
    }

    // Re-sync authors if provided
    if (Array.isArray(author_ids)) {
      await conn.query("DELETE FROM Book_Authors WHERE book_id = ?", [id]);
      if (author_ids.length) {
        const authorVals = author_ids.map((aid, i) => [id, aid, i + 1]);
        await conn.query(
          "INSERT INTO Book_Authors (book_id, author_id, author_order) VALUES ?",
          [authorVals]
        );
      }
    }

    await conn.commit();
    res.json({ success: true, message: "Book updated" });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

// ── DELETE /api/books/:id  (admin only) ────────────────────────────────────────
// Blocked by FK if any copies are currently issued (ON DELETE RESTRICT on Issue_Transactions).
export const deleteBook = async (req, res, next) => {
  try {
    // Check for active issues before attempting delete
    const [[{ active }]] = await pool.query(
      `SELECT COUNT(*) AS active
       FROM Issue_Transactions it
       JOIN Book_Copies bc ON it.copy_id = bc.copy_id
       WHERE bc.book_id = ? AND it.return_date IS NULL`,
      [req.params.id]
    );

    if (active > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete: ${active} copy/copies currently issued`,
      });
    }

    const [result] = await pool.query(
      "DELETE FROM Books WHERE book_id = ?",
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Book not found" });
    }

    res.json({ success: true, message: "Book deleted" });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/books/:id/copies  (admin only) ───────────────────────────────────
// Add physical copies to an existing book.
export const addCopies = async (req, res, next) => {
  try {
    const { copies } = req.body; // [{ barcode, shelf_location }]
    if (!Array.isArray(copies) || !copies.length) {
      return res.status(400).json({ success: false, message: "copies[] is required" });
    }

    const vals = copies.map(({ barcode, shelf_location }) => [
      req.params.id, barcode, shelf_location || null,
    ]);

    await pool.query(
      "INSERT INTO Book_Copies (book_id, barcode, shelf_location) VALUES ?",
      [vals]
    );

    res.status(201).json({ success: true, message: `${copies.length} copy/copies added` });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/books/categories ──────────────────────────────────────────────────
export const getCategories = async (_req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT * FROM Categories ORDER BY category_name");
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};