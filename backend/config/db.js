// config/db.js
import mysql from "mysql2/promise";

const dbConfig = {
  host:               process.env.DB_HOST     || "localhost",
  port:               Number(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER     || "root",
  password:           process.env.DB_PASSWORD || "",
  database:           process.env.DB_NAME     || "university_library",
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  dateStrings:        true,
};

/**
 * Connect with retry — ensures the backend waits for MySQL to be ready
 * (important in Docker where MySQL needs ~10 s to initialise on first run).
 */
const connectWithRetry = async (retries = 12, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const newPool = mysql.createPool(dbConfig);
      const conn = await newPool.getConnection();
      console.log(`✅ MySQL connected → ${dbConfig.database}@${dbConfig.host}`);
      conn.release();
      return newPool;
    } catch (err) {
      console.error(`❌ DB Connection failed (attempt ${i + 1}/${retries}): ${err.message}`);
      if (i < retries - 1) {
        console.log(`   Waiting ${delay / 1000}s before retry...`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        console.error("Critical: could not connect to MySQL after all retries.");
        process.exit(1);
      }
    }
  }
};

// Top-level await (requires "type": "module" in package.json)
const pool = await connectWithRetry();

export default pool;