// config/db.js
// Uses mysql2/promise for async/await support throughout the app.
// mysql2 is preferred over Sequelize here because:
//  - The ERD is already fully designed; we don't need ORM schema generation
//  - Raw SQL queries give us full control over complex JOINs (e.g. overdue view)
//  - mysql2/promise is lightweight and maps 1-to-1 with the SQL we already wrote

import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || "lms-mysql-1",
  port:               Number(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER     || "root",
  password:           process.env.DB_PASSWORD || "",
  database:           process.env.DB_NAME     || "university_library",
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           "+00:00",
});

// Verify connectivity at startup
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log(`✅ MySQL connected → ${process.env.DB_NAME}@${process.env.DB_HOST}`);
    connection.release();
  } catch (err) {
    console.error("❌ MySQL connection failed:", err.message);
    process.exit(1);
  }
})();

export default pool;