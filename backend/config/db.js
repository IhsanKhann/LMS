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

let pool;

/**
 * CONNECT WITH RETRY
 * This ensures the backend doesn't crash if MySQL is still starting up.
 */
const connectWithRetry = async (retries = 10, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      // Create the pool
      const newPool = mysql.createPool(dbConfig);
      
      // Test the connection immediately
      const conn = await newPool.getConnection();
      console.log(`✅ MySQL connected → ${dbConfig.database}@${dbConfig.host}`);
      
      conn.release();
      return newPool;
    } catch (err) {
      console.error(`❌ DB Connection failed (Attempt ${i + 1}/${retries}): ${err.message}`);
      
      if (i < retries - 1) {
        console.log(`waiting ${delay / 1000}s for MySQL to wake up...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error("Critical: Could not connect to MySQL after multiple attempts.");
        process.exit(1); // Exit if DB is truly unreachable
      }
    }
  }
};

// Top-level await (requires "type": "module" in package.json)
pool = await connectWithRetry();

export default pool;