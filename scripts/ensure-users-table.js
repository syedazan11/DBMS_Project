require("dotenv").config();
const { neon } = require("@neondatabase/serverless");

const connectionString = process.env.NEXT_PUBLIC_DATABASE_URL;

if (!connectionString) {
  throw new Error("NEXT_PUBLIC_DATABASE_URL is not set");
}

const sql = neon(connectionString);

async function main() {
  await sql(`
    CREATE TABLE IF NOT EXISTS users (
      id serial PRIMARY KEY,
      name varchar NOT NULL,
      email varchar NOT NULL UNIQUE,
      "passwordHash" varchar NOT NULL,
      "imageUrl" varchar,
      "createdAt" timestamp NOT NULL DEFAULT now()
    );
  `);

  console.log("users table ensured");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
