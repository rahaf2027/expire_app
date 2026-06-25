/**
 * Direct Supabase database operations.
 * Replaces all Express /api/branch/* endpoints for static hosting.
 */
import { supabase } from "./supabaseClient";
import type { Product, ActivityLog } from "../types";

// ─── Fetch products + logs for a branch ───────────────────────────────────────
export async function fetchBranchData(branchId: string): Promise<{ products: Product[]; logs: ActivityLog[] }> {
  const [productsRes, logsRes] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("branch_id", branchId),
    supabase
      .from("activity_logs")
      .select("*")
      .eq("branch_id", branchId)
      .order("timestamp", { ascending: false }),
  ]);

  if (productsRes.error) {
    console.error("[DB] Error fetching products:", productsRes.error);
    throw productsRes.error;
  }
  if (logsRes.error) {
    console.error("[DB] Error fetching logs:", logsRes.error);
    throw logsRes.error;
  }

  // Map snake_case DB columns → camelCase app types
  const products: Product[] = (productsRes.data || []).map((row) => ({
    id: row.id,
    name: row.name,
    brand: row.brand,
    multilingualNames: typeof row.multilingual_names === "string"
      ? JSON.parse(row.multilingual_names)
      : (row.multilingual_names || []),
    expiryDate: row.expiry_date,
    imageUrl: row.image_url || "",
    expiryImageUrl: row.expiry_image_url || "",
    status: row.status,
    quantity: row.quantity,
    quantityUnit: row.quantity_unit || 'pcs',
    unitsPerCarton: row.units_per_carton || 1,
    looseUnits: row.loose_units || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    logs: typeof row.logs === "string" ? JSON.parse(row.logs) : (row.logs || []),
  }));

  const logs: ActivityLog[] = (logsRes.data || []).map((row) => ({
    id: row.id,
    branchId: row.branch_id,
    productId: row.product_id,
    productName: row.product_name,
    brand: row.brand,
    employeeName: row.employee_name,
    action: row.action,
    timestamp: row.timestamp,
  }));

  return { products, logs };
}

// ─── Sync (upsert + delete) products and logs for a branch ───────────────────
export async function syncBranchData(
  branchId: string,
  products: Product[],
  logs: ActivityLog[]
): Promise<void> {
  // 1. Upsert all products
  if (products.length > 0) {
    const rows = products.map((p) => ({
      id: p.id,
      branch_id: branchId,
      name: p.name,
      brand: p.brand,
      multilingual_names: JSON.stringify(p.multilingualNames || []),
      expiry_date: p.expiryDate,
      image_url: p.imageUrl || null,
      expiry_image_url: p.expiryImageUrl || null,
      status: p.status,
      quantity: p.quantity,
      quantity_unit: p.quantityUnit || 'pcs',
      units_per_carton: p.unitsPerCarton || 1,
      loose_units: p.looseUnits || 0,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
      logs: JSON.stringify(p.logs || []),
    }));

    const { error: upsertErr } = await supabase
      .from("products")
      .upsert(rows, { onConflict: "id" });

    if (upsertErr) console.error("[DB] Upsert products error:", upsertErr);

    // Delete products in DB for this branch that are NOT in the incoming list
    const incomingIds = products.map((p) => p.id);
    const { error: deleteErr } = await supabase
      .from("products")
      .delete()
      .eq("branch_id", branchId)
      .not("id", "in", `(${incomingIds.map((id) => `"${id}"`).join(",")})`);

    if (deleteErr) console.error("[DB] Delete stale products error:", deleteErr);
  } else {
    // No products → delete all for this branch
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("branch_id", branchId);
    if (error) console.error("[DB] Delete all products error:", error);
  }

  // 2. Upsert activity logs (insert only, no delete)
  if (logs.length > 0) {
    const logRows = logs.map((l) => ({
      id: l.id,
      branch_id: l.branchId || branchId,
      product_id: l.productId,
      product_name: l.productName,
      brand: l.brand,
      employee_name: l.employeeName,
      action: l.action,
      timestamp: l.timestamp,
    }));

    const { error: logErr } = await supabase
      .from("activity_logs")
      .upsert(logRows, { onConflict: "id", ignoreDuplicates: true });

    if (logErr) console.error("[DB] Upsert logs error:", logErr);
  }
}

// ─── Health check: verify Supabase connection ─────────────────────────────────
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const { error } = await supabase.from("products").select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}
