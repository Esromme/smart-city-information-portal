
const path = require("path");
const dotenv = require("dotenv");
const { Client } = require("pg");

dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});

async function testDatabase() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is missing from .env");
    process.exitCode = 1;
    return;
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    const result = await client.query(`
      SELECT
        current_database() AS database,
        NOW() AS server_time;
    `);

    console.log("✅ Supabase PostgreSQL connected!");
    console.log("Database:", result.rows[0].database);
    console.log("Server time:", result.rows[0].server_time);
  } catch (error) {
    console.error("❌ Database connection failed.");
    console.error("Error:", error.message);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

testDatabase();
