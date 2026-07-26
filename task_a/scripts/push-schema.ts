import { execSync } from "node:child_process";
import { createClient } from "@libsql/client";

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) throw new Error("TURSO_DATABASE_URL is not set");

  const sql = execSync(
    "npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script",
    { encoding: "utf8" }
  );
  const statements = sql
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);

  const client = createClient({ url, authToken });
  for (const statement of statements) {
    await client.execute(statement);
  }
  const tables = await client.execute(
    "select name from sqlite_master where type='table' and name not like 'sqlite_%'"
  );
  console.log("Schema applied. Tables:", tables.rows.map((row) => row.name).join(", "));
  client.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
