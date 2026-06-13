import { neon } from "@neondatabase/serverless";

export function getDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  return neon(connectionString);
}

export async function checkDbConnection(): Promise<boolean> {
  try {
    const sql = getDb();
    await sql`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
