// controllers/book.controller.js
import pool from "../config/db.js";

// GET /api/books  — catalog with availability + authors
export const getBooks = async (req, res, next) => {
  try {
    const { search, category_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let where = "WHERE 1=1";

    if (search) {
      where += " AND (b.title LIKE ? OR b.isbn LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category_id) {
      where += " AND b.category_id = ?";
      params.push(category_id);
    }

    const [rows] = await pool.query(
      `SELECT
         b.book_id, b.title, b.isbn, b.edition, b.publication_year,
         p.publisher_name, c.category_name,
         GROUP_CONCAT(a.author_name ORDER BY ba.author_order SEPARATOR ', ') AS authors,
         COUNT(DISTINCT bc.copy_id)                                           AS total_copies,
         SUM(CASE WHEN bc.status = 'available' THEN 1 ELSE 0 END)            AS available_copies
       FROM Books b
       LEFT JOIN Publishers p  ON b.publisher_id = p.publisher_id
       LEFT JOIN Categories c  ON b.category_id  = c.category_id
       LEFT JOIN Book_Authors ba ON b.book_id = ba.book_id
       LEFT JOIN Authors a     ON ba.author_id = a.author_id
       LEFT JOIN Book_Copies bc ON b.book_id = bc.book_id
       ${where}
       GROUP BY b.book_id
       ORDER BY b.title
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(DISTINCT b.book_id) AS total
       FROM Books b ${where}`,
      params
    );

    res.json({
      success: true,
      data:  rows,
      meta:  { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/books/:id
export const getBook = async (req, res, next) => {
  try {
    const [[book]] = await pool.query(
      `SELECT b.*, p.publisher_name, c.category_name,
              GROUP_CONCAT(a.author_name ORDER BY ba.author_order SEPARATOR ', ') AS authors
       FROM Books b
       LEFT JOIN Publishers p ON b.publisher_id = p.publisher_id
       LEFT JOIN Categories c ON b.category_id  = c.category_id
       LEFT JOIN Book_Authors ba ON b.book_id = ba.book_id
       LEFT JOIN Authors a ON ba.author_id = a.author_id
       WHERE b.book_id = ?
       GROUP BY b.book_id`,
      [req.params.id]
    );

    if (!book) return res.status(404).json({ success: false, message: "Book not found" });

    // Fetch copies separately
    const [copies] = await pool.query(
      "SELECT copy_id, barcode, shelf_location, status FROM Book_Copies WHERE book_id = ?",
      [req.params.id]
    );

    res.json({ success: true, data: { ...book, copies } });
  } catch (err) {
    next(err);
  }
};

// POST /api/books  (admin only)
export const createBook = async (req, res, next) => {
  try {
    const { title, isbn, edition, publication_year, publisher_id, category_id, author_ids } = req.body;

    const [result] = await pool.query(
      "INSERT INTO Books (title, isbn, edition, publication_year, publisher_id, category_id) VALUES (?,?,?,?,?,?)",
      [title, isbn, edition, publication_year, publisher_id, category_id]
    );
    const book_id = result.insertId;

    // Link authors
    if (Array.isArray(author_ids) && author_ids.length) {
      const authorValues = author_ids.map((aid, idx) => [book_id, aid, idx + 1]);
      await pool.query("INSERT INTO Book_Authors (book_id, author_id, author_order) VALUES ?", [authorValues]);
    }

    res.status(201).json({ success: true, message: "Book created", data: { book_id } });
  } catch (err) {
    next(err);
  }
};