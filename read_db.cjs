const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set!");
  process.exit(1);
}

const client = new Client({
  connectionString,
  ssl: connectionString.includes("supabase.co") ? { rejectUnauthorized: false } : undefined
});

async function main() {
  await client.connect();
  const res = await client.query("SELECT id, name, brand, expiry_date, quantity, status FROM products WHERE status = 'active' ORDER BY name, brand, expiry_date");
  console.log("=== Active Products in DB ===");
  res.rows.forEach(r => {
    console.log(`ID: ${r.id} | Name: "${r.name}" | Brand: "${r.brand}" | Expiry: "${r.expiry_date}" | Qty: ${r.quantity} | Status: ${r.status}`);
  });
  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
