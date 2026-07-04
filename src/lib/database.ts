/**
 * Direct Supabase database operations.
 * Replaces all Express /api/branch/* endpoints for static hosting.
 */
import { supabase } from "./supabaseClient";
import type { Product, ActivityLog } from "../types";

const compressImage = (base64Str: string | null, maxDim = 600): Promise<string | null> => {
  return new Promise((resolve) => {
    if (!base64Str || !base64Str.startsWith("data:") || base64Str.length < 50000) {
      resolve(base64Str);
      return;
    }
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
};

// ─── Fetch products + logs for a branch ───────────────────────────────────────
export async function fetchBranchData(branchId: string): Promise<{ products: Product[]; logs: ActivityLog[] }> {
  const [productsRes, logsRes] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("branch_id", branchId)
      .order("created_at", { ascending: false }),
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

// ─── Sync (upsert) products and logs for a branch ───────────────────
export async function syncBranchData(
  branchId: string,
  products: Product[],
  logs: ActivityLog[]
): Promise<void> {
  // 1. Upsert all products
  if (products.length > 0) {
    const rows = await Promise.all(
      products.map(async (p) => {
        const compressedImg = p.imageUrl ? await compressImage(p.imageUrl) : null;
        const compressedExpiryImg = p.expiryImageUrl ? await compressImage(p.expiryImageUrl) : null;
        
        return {
          id: p.id,
          branch_id: branchId,
          name: p.name,
          brand: p.brand,
          multilingual_names: JSON.stringify(p.multilingualNames || []),
          expiry_date: p.expiryDate,
          image_url: compressedImg,
          expiry_image_url: compressedExpiryImg,
          status: p.status,
          quantity: p.quantity,
          quantity_unit: p.quantityUnit || 'pcs',
          units_per_carton: p.unitsPerCarton || 1,
          loose_units: p.looseUnits || 0,
          created_at: p.createdAt,
          updated_at: p.updatedAt,
          logs: JSON.stringify(p.logs || []),
        };
      })
    );

    const { error: upsertErr } = await supabase
      .from("products")
      .upsert(rows, { onConflict: "id" });

    if (upsertErr) {
      console.error("[DB] Upsert products error:", upsertErr);
      throw upsertErr;
    }
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

    if (logErr) {
      console.error("[DB] Upsert logs error:", logErr);
      throw logErr;
    }
  }
}

// ─── Delete a single product explicitly ───────────────────────────────────────
export async function deleteProductFromDb(productId: string): Promise<void> {
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId);
  if (error) {
    console.error("[DB] Delete product error:", error);
    throw error;
  }
}

// ─── Delete a single activity log explicitly ──────────────────────────────────
export async function deleteLogFromDb(logId: string): Promise<void> {
  const { error } = await supabase
    .from("activity_logs")
    .delete()
    .eq("id", logId);
  if (error) {
    console.error("[DB] Delete log error:", error);
    throw error;
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
