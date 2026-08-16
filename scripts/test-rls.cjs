#!/usr/bin/env node
/**
 * RLS test harness.
 *
 * Impersonates each role the way PostgREST does — `set local role authenticated`
 * plus a request.jwt.claims payload, so auth.uid() resolves — and asserts what
 * each one can and cannot reach.
 *
 * Everything runs inside a transaction that is always rolled back, so this
 * leaves the database exactly as it found it.
 *
 *   node scripts/test-rls.cjs
 */
const { Client } = require("pg");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });

let pass = 0;
let fail = 0;

function ok(name, detail = "") {
  pass++;
  console.log(`  PASS  ${name}${detail ? "  — " + detail : ""}`);
}
function bad(name, detail = "") {
  fail++;
  console.log(`  FAIL  ${name}${detail ? "  — " + detail : ""}`);
}

async function asUser(client, uid, fn) {
  await client.query("savepoint sp");
  try {
    await client.query(
      `select set_config('request.jwt.claims',
         json_build_object('sub', $1::text, 'role', 'authenticated')::text, true)`,
      [uid]
    );
    await client.query("set local role authenticated");
    return await fn();
  } finally {
    await client.query("reset role");
    await client.query("release savepoint sp").catch(() => {});
  }
}

/**
 * RLS denies in two different shapes:
 *   - a USING clause filters the row out, so DELETE/UPDATE quietly affect 0 rows
 *   - a WITH CHECK clause rejects the new row, which raises 42501
 * Both count as "blocked", so this helper accepts either.
 */
async function expectNoEffect(client, uid, label, sql, params = []) {
  let outcome;
  await asUser(client, uid, async () => {
    await client.query("savepoint eff");
    try {
      const r = await client.query(sql, params);
      outcome = r.rowCount === 0 ? "blocked (0 rows)" : null;
    } catch (err) {
      outcome = "blocked (" + (err.code || "error") + ")";
    } finally {
      await client.query("rollback to savepoint eff");
    }
  });
  outcome ? ok(label, outcome) : bad(label, "the statement took effect");
}

/** Expect a statement to succeed and touch exactly one row. */
async function expectAllowed(client, uid, label, sql, params = []) {
  let outcome = null;
  await asUser(client, uid, async () => {
    await client.query("savepoint allw");
    try {
      const r = await client.query(sql, params);
      outcome = r.rowCount > 0 ? null : "affected 0 rows";
    } catch (err) {
      outcome = err.message.split("\n")[0].slice(0, 60);
    } finally {
      await client.query("rollback to savepoint allw");
    }
  });
  outcome ? bad(label, outcome) : ok(label);
}

/** Expect a query to be blocked. Returns true when it correctly failed. */
async function expectDenied(client, uid, label, sql, params = []) {
  try {
    await asUser(client, uid, async () => {
      await client.query("savepoint inner_sp");
      try {
        await client.query(sql, params);
      } finally {
        await client.query("rollback to savepoint inner_sp");
      }
    });
    bad(label, "the operation was ALLOWED but should have been blocked");
  } catch (err) {
    ok(label, err.message.split("\n")[0].slice(0, 60));
  }
}

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
  });
  await client.connect();
  await client.query("begin");

  try {
    // ── Fixtures ────────────────────────────────────────────────────────────
    const mk = async (email, role, owner) => {
      const { rows } = await client.query(
        `with u as (
           insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                                   email_confirmed_at, created_at, updated_at,
                                   raw_app_meta_data, raw_user_meta_data)
           values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(),
                   'authenticated','authenticated',$1,
                   extensions.crypt('test-password-123', extensions.gen_salt('bf')),
                   now(),now(),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb)
           returning id)
         insert into public.profiles (id, email, full_name, role, owner_id)
         select id, $1, $1, $2::user_role, $3::uuid from u returning id`,
        [email, role, owner]
      );
      return rows[0].id;
    };

    const admin = await mk("t-admin@test.local", "master_admin", null);
    const chefA = await mk("t-ownerA@test.local", "master_chef", null);
    const chefB = await mk("t-ownerB@test.local", "master_chef", null);

    await client.query(
      `insert into public.branches (id, name, owner_id) values
         ('t-branch-a','Branch A',$1), ('t-branch-b','Branch B',$2)`,
      [chefA, chefB]
    );

    const branchChef = await mk("t-chef@test.local", "chef", chefA);
    const employee = await mk("t-emp@test.local", "employee", chefA);
    await client.query(
      `insert into public.branch_members (user_id, branch_id) values ($1,'t-branch-a'),($2,'t-branch-a')`,
      [branchChef, employee]
    );

    console.log("\nBranch visibility\n");

    const branchesFor = (uid) =>
      asUser(client, uid, async () => {
        const r = await client.query("select id from public.branches order by id");
        return r.rows.map((x) => x.id);
      });

    const adminSees = await branchesFor(admin);
    adminSees.includes("t-branch-a") && adminSees.includes("t-branch-b")
      ? ok("master_admin sees every branch", adminSees.join(", "))
      : bad("master_admin sees every branch", adminSees.join(", "));

    const chefASees = await branchesFor(chefA);
    chefASees.length === 1 && chefASees[0] === "t-branch-a"
      ? ok("master_chef A sees only their own branch", chefASees.join(", "))
      : bad("master_chef A sees only their own branch", chefASees.join(", "));

    const empSees = await branchesFor(employee);
    empSees.length === 1 && empSees[0] === "t-branch-a"
      ? ok("employee sees only their assigned branch", empSees.join(", "))
      : bad("employee sees only their assigned branch", empSees.join(", "));

    console.log("\nBranch creation\n");

    try {
      await asUser(client, chefA, () =>
        client.query("select public.create_branch('t-new-branch','A New Branch')")
      );
      ok("master_chef can create a branch");
    } catch (e) {
      bad("master_chef can create a branch", e.message.slice(0, 70));
    }

    await expectDenied(client, employee, "employee CANNOT create a branch",
      "select public.create_branch('t-evil','Evil Branch')");
    await expectDenied(client, branchChef, "chef CANNOT create a branch",
      "select public.create_branch('t-evil2','Evil Branch 2')");

    console.log("\nUser provisioning\n");

    try {
      await asUser(client, chefA, () =>
        client.query(
          `select public.create_app_user('t-new-emp@test.local','password123','New Emp',
                    'employee'::user_role, array['t-branch-a'])`
        )
      );
      ok("master_chef can create an employee in their own branch");
    } catch (e) {
      bad("master_chef can create an employee in their own branch", e.message.slice(0, 70));
    }

    await expectDenied(client, chefA, "master_chef CANNOT assign someone else's branch",
      `select public.create_app_user('t-x@test.local','password123','X','employee'::user_role, array['t-branch-b'])`);

    await expectDenied(client, chefA, "master_chef CANNOT mint a master_admin",
      `select public.create_app_user('t-y@test.local','password123','Y','master_admin'::user_role, array[]::text[])`);

    await expectDenied(client, employee, "employee CANNOT create users",
      `select public.create_app_user('t-z@test.local','password123','Z','employee'::user_role, array['t-branch-a'])`);

    console.log("\nProfile visibility\n");

    const profilesFor = (uid) =>
      asUser(client, uid, async () => {
        const r = await client.query("select email from public.profiles");
        return r.rows.map((x) => x.email);
      });

    const empProfiles = await profilesFor(employee);
    empProfiles.length === 1 && empProfiles[0] === "t-emp@test.local"
      ? ok("employee sees only their own profile")
      : bad("employee sees only their own profile", empProfiles.join(", "));

    const chefBProfiles = await profilesFor(chefB);
    chefBProfiles.some((e) => e === "t-emp@test.local")
      ? bad("master_chef B cannot see org A's users", chefBProfiles.join(", "))
      : ok("master_chef B cannot see org A's users");

    console.log("\nProduct isolation between branches\n");

    const mkProduct = async (id, branch, status = "active") =>
      client.query(
        `insert into public.products (id, branch_id, name, brand, expiry_date, status,
                                      quantity, created_at, updated_at)
         values ($1,$2,'Test Product','TestBrand','2026-12-01',$3,1,now()::text,now()::text)`,
        [id, branch, status]
      );

    await mkProduct("t-prod-a", "t-branch-a");
    await mkProduct("t-prod-b", "t-branch-b");
    await mkProduct("t-trash-a", "t-branch-a", "trash");

    const productsFor = (uid) =>
      asUser(client, uid, async () => {
        const r = await client.query("select id from public.products order by id");
        return r.rows.map((x) => x.id);
      });

    const empProducts = await productsFor(employee);
    empProducts.includes("t-prod-a") && !empProducts.includes("t-prod-b")
      ? ok("employee sees branch A products but not branch B", empProducts.join(", "))
      : bad("employee sees branch A products but not branch B", empProducts.join(", "));

    const chefBProducts = await productsFor(chefB);
    chefBProducts.includes("t-prod-b") && !chefBProducts.includes("t-prod-a")
      ? ok("master_chef B sees only their own branch's products", chefBProducts.join(", "))
      : bad("master_chef B sees only their own branch's products", chefBProducts.join(", "));

    console.log("\nEmployee cannot delete\n");

    await expectNoEffect(client, employee, "employee CANNOT hard-delete a product",
      "delete from public.products where id = 't-prod-a'");

    // The app bins an active product with an UPDATE, so that path needs its own guard.
    await expectNoEffect(client, employee, "employee CANNOT move a product to trash via update",
      "update public.products set status = 'trash' where id = 't-prod-a' returning id");

    await expectAllowed(client, employee, "employee CAN still mark a product sold",
      "update public.products set status = 'sold' where id = 't-prod-a' returning id");

    await expectAllowed(client, employee, "employee CAN still add a product",
      `insert into public.products (id, branch_id, name, brand, expiry_date, status,
                                    quantity, created_at, updated_at)
       values ('t-emp-new','t-branch-a','New','B','2026-11-01','active',1,
               now()::text, now()::text) returning id`);

    await expectAllowed(client, branchChef, "chef CAN move a product to trash",
      "update public.products set status = 'trash' where id = 't-prod-a' returning id");

    await expectAllowed(client, branchChef, "chef CAN hard-delete a product",
      "delete from public.products where id = 't-trash-a' returning id");

    await expectNoEffect(client, chefB, "master_chef B CANNOT touch branch A's products",
      "update public.products set name = 'hijacked' where id = 't-prod-a' returning id");

    await expectNoEffect(client, employee, "employee CANNOT insert into another branch",
      `insert into public.products (id, branch_id, name, brand, expiry_date, status,
                                    quantity, created_at, updated_at)
       values ('t-cross','t-branch-b','X','B','2026-11-01','active',1,
               now()::text, now()::text) returning id`);

    console.log("\nDeactivation is fail-closed\n");

    await client.query("update public.profiles set is_active = false where id = $1", [employee]);
    const deactivated = await branchesFor(employee);
    deactivated.length === 0
      ? ok("a deactivated user sees no branches at all")
      : bad("a deactivated user sees no branches at all", deactivated.join(", "));
    await client.query("update public.profiles set is_active = true where id = $1", [employee]);

    console.log(`\n${pass} passed, ${fail} failed\n`);
  } catch (err) {
    console.error("\nHarness error:", err.message, "\n");
    fail++;
  } finally {
    await client.query("rollback");
    await client.end();
  }

  process.exit(fail > 0 ? 1 : 0);
}

main();
