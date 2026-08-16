#!/usr/bin/env node
/**
 * Migration runner.
 *
 * Applies supabase/migrations/*.sql in filename order, each inside a
 * transaction, and records what ran in public.schema_migrations so re-runs are
 * safe.
 *
 *   node scripts/migrate.cjs           apply pending migrations
 *   node scripts/migrate.cjs --status  show what has run
 *
 * Requires DATABASE_URL pointing at the Supabase POOLER host. The direct
 * db.*.supabase.co host is IPv6-only and unreachable from this machine.
 */
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });

const MIGRATIONS_DIR = path.join(__dirname, "..", "supabase", "migrations");

function connect() {
  const cs = process.env.DATABASE_URL;
  if (!cs) throw new Error("DATABASE_URL is not set");
  if (cs.includes("db.") && cs.includes(".supabase.co")) {
    console.warn(
      "\n  WARNING: DATABASE_URL uses the direct host, which is IPv6-only.\n" +
      "  Switch to aws-1-<region>.pooler.supabase.com with user postgres.<ref>.\n"
    );
  }
  return new Client({
    connectionString: cs,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
    statement_timeout: 120000,
  });
}

async function ensureTable(client) {
  await client.query(`
    create table if not exists public.schema_migrations (
      name       text primary key,
      applied_at timestamptz not null default now()
    );
  `);
}

async function main() {
  const statusOnly = process.argv.includes("--status");
  const client = connect();
  await client.connect();

  try {
    await ensureTable(client);

    const { rows } = await client.query("select name from public.schema_migrations");
    const applied = new Set(rows.map((r) => r.name));

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    if (statusOnly) {
      console.log("\nMigration status:\n");
      for (const f of files) {
        console.log(`  ${applied.has(f) ? "[applied]" : "[pending]"}  ${f}`);
      }
      console.log("");
      return;
    }

    const pending = files.filter((f) => !applied.has(f));
    if (pending.length === 0) {
      console.log("Nothing to apply — database is up to date.");
      return;
    }

    for (const file of pending) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
      process.stdout.write(`Applying ${file} ... `);
      try {
        await client.query("begin");
        await client.query(sql);
        await client.query("insert into public.schema_migrations(name) values ($1)", [file]);
        await client.query("commit");
        console.log("ok");
      } catch (err) {
        await client.query("rollback");
        console.log("FAILED");
        console.error(`\n  ${err.message}`);
        if (err.position) {
          const upto = sql.slice(0, Number(err.position));
          console.error(`  at line ${upto.split("\n").length}`);
        }
        console.error("\n  Rolled back. No changes were made by this file.\n");
        process.exitCode = 1;
        return;
      }
    }

    // PostgREST caches the schema; tell it to reload so new tables are visible.
    await client.query("notify pgrst, 'reload schema'");
    console.log("\nDone. PostgREST schema reload requested.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Migration runner failed:", err.message);
  process.exit(1);
});
