#!/usr/bin/env node
/**
 * One-time bootstrap: creates the first master_admin account and adopts every
 * branch_id already present in the data into the new branches table.
 *
 *   node scripts/bootstrap-admin.cjs <email> <password> ["Full Name"]
 *
 * The password is read from the command line and hashed by Postgres via
 * crypt(); it is never written to a file or logged.
 *
 * Safe to re-run: it refuses to create a second master_admin.
 */
const { Client } = require("pg");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });

const [email, password, fullName] = process.argv.slice(2);

if (!email || !password) {
  console.error(`
  Usage: node scripts/bootstrap-admin.cjs <email> <password> ["Full Name"]

  Example:
    node scripts/bootstrap-admin.cjs you@example.com 'a-strong-password' "Your Name"
`);
  process.exit(1);
}

if (password.length < 8) {
  console.error("  Password must be at least 8 characters.");
  process.exit(1);
}

function prettify(slug) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
  });
  await client.connect();

  try {
    await client.query("begin");

    const existing = await client.query(
      "select email from public.profiles where role = 'master_admin' limit 1"
    );
    if (existing.rowCount > 0) {
      console.log(`  A master_admin already exists (${existing.rows[0].email}). Nothing to do.`);
      await client.query("rollback");
      return;
    }

    const lowered = email.trim().toLowerCase();
    const dupe = await client.query("select 1 from auth.users where email = $1", [lowered]);
    if (dupe.rowCount > 0) {
      throw new Error(`An auth user with ${lowered} already exists but has no profile. Resolve manually.`);
    }

    const { rows } = await client.query(
      `
      with new_user as (
        insert into auth.users (
          instance_id, id, aud, role, email, encrypted_password,
          email_confirmed_at, created_at, updated_at,
          raw_app_meta_data, raw_user_meta_data,
          -- These must be '' rather than NULL. GoTrue scans them into plain Go
          -- strings, and a NULL fails the scan so sign-in 500s. See 006.
          confirmation_token, recovery_token, email_change,
          email_change_token_new, email_change_token_current,
          phone_change, phone_change_token, reauthentication_token
        ) values (
          '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
          'authenticated', 'authenticated', $1,
          extensions.crypt($2, extensions.gen_salt('bf')),
          now(), now(), now(),
          '{"provider":"email","providers":["email"]}'::jsonb,
          jsonb_build_object('full_name', $3::text),
          '', '', '', '', '', '', '', ''
        )
        returning id
      ),
      new_identity as (
        insert into auth.identities (
          id, user_id, provider_id, provider, identity_data,
          last_sign_in_at, created_at, updated_at
        )
        select gen_random_uuid(), id, id::text, 'email',
               jsonb_build_object('sub', id::text, 'email', $1::text,
                                  'email_verified', true, 'phone_verified', false),
               now(), now(), now()
        from new_user
        returning user_id
      )
      insert into public.profiles (id, email, full_name, role, owner_id, is_active)
      select id, $1, $3::text, 'master_admin', null, true from new_user
      returning id;
      `,
      [lowered, password, (fullName || "").trim()]
    );

    const adminId = rows[0].id;

    // Adopt the branch ids already living in products / activity_logs.
    const pending = await client.query("select branch_id from public._pending_branch_backfill");
    for (const row of pending.rows) {
      await client.query(
        `insert into public.branches (id, name, owner_id, created_by)
         values ($1, $2, $3, $3) on conflict (id) do nothing`,
        [row.branch_id, prettify(row.branch_id), adminId]
      );
    }
    await client.query("drop table if exists public._pending_branch_backfill");

    await client.query("commit");

    console.log(`
  master_admin created:  ${lowered}
  branches adopted:      ${pending.rowCount} (${pending.rows.map((r) => r.branch_id).join(", ") || "none"})

  You can now sign in to the app with this account.
`);
  } catch (err) {
    await client.query("rollback");
    console.error(`  Bootstrap failed: ${err.message}`);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Bootstrap failed:", err.message);
  process.exit(1);
});
