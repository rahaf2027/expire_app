/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import pg from "pg";

// Load .env from project root regardless of where the compiled server runs
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// In production (dist/server.cjs), go up one level to reach project root
const envPath = path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });
// Fallback: also try current working directory
dotenv.config();

const app = express();
const PORT = 3000;

// Use JSON body parser with increased limit for base64 images
app.use(express.json({ limit: "20mb" }));

// Database Connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.warn("WARNING: DATABASE_URL is not set in environment variables!");
  console.warn("Tried loading from:", envPath);
} else {
  console.log("[DB] DATABASE_URL loaded successfully from:", envPath);
}


const pool = new pg.Pool({
  connectionString,
  ssl: connectionString?.includes("supabase.co")
    ? { rejectUnauthorized: false }
    : undefined,
});

// Function to initialize tables in database
async function initDB() {
  const client = await pool.connect();
  try {
    console.log("[Postgres] Initializing database tables...");
    
    // Create products table
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(100) PRIMARY KEY,
        branch_id VARCHAR(100) NOT NULL,
        name TEXT NOT NULL,
        brand TEXT NOT NULL,
        multilingual_names JSONB NOT NULL DEFAULT '[]'::jsonb,
        expiry_date VARCHAR(50) NOT NULL,
        image_url TEXT,
        expiry_image_url TEXT,
        status VARCHAR(50) NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        quantity_unit VARCHAR(20) DEFAULT 'pcs',
        units_per_carton INTEGER DEFAULT 1,
        loose_units INTEGER DEFAULT 0,
        created_at VARCHAR(100) NOT NULL,
        updated_at VARCHAR(100) NOT NULL,
        logs JSONB NOT NULL DEFAULT '[]'::jsonb
      );
    `);

    // Ensure columns exist if the table was created before this version
    await client.query(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS quantity_unit VARCHAR(20) DEFAULT 'pcs';
      ALTER TABLE products ADD COLUMN IF NOT EXISTS units_per_carton INTEGER DEFAULT 1;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS loose_units INTEGER DEFAULT 0;
    `);
    
    // Create activity_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id VARCHAR(100) PRIMARY KEY,
        branch_id VARCHAR(100) NOT NULL,
        product_id VARCHAR(100) NOT NULL,
        product_name TEXT NOT NULL,
        brand TEXT NOT NULL,
        employee_name TEXT NOT NULL,
        action VARCHAR(50) NOT NULL,
        timestamp VARCHAR(100) NOT NULL
      );
    `);
    
    console.log("[Postgres] Database initialization complete.");
  } catch (err) {
    console.error("[Postgres] Error initializing database:", err);
  } finally {
    client.release();
  }
}

const DEFAULT_BRANCH = "main-branch";

// Lazy Gemini client helper
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    throw new Error("Missing or unconfigured GEMINI_API_KEY. Please set your key in Settings > Secrets.");
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Resilient wrapper to call Gemini with exponential backoff retries and model fallbacks
async function generateContentWithRetry(
  ai: GoogleGenAI,
  config: any,
  imagePart: any,
  promptText: string
) {
  let lastError: any = null;
  const modelsToTry = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-flash-latest",
    "gemini-3.5-flash"
  ];

  for (const modelName of modelsToTry) {
    let delay = 1000;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[Gemini SDK] Calling generateContent with model: ${modelName} (Attempt ${attempt}/3)...`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: { parts: [imagePart, { text: promptText }] },
          config: config
        });
        console.log(`[Gemini SDK] Successfully generated content with model: ${modelName}`);
        return response;
      } catch (error: any) {
        lastError = error;
        const errorMessage = String(error.message || "").toLowerCase();
        const errorStatus = String(error.status || "").toLowerCase();
        const errorCode = error.code || error.statusCode || "";
        
        const isTemporaryOutage = 
          errorStatus === "unavailable" || 
          errorCode === 503 || 
          errorMessage.includes("503") || 
          errorMessage.includes("unavailable") || 
          errorMessage.includes("high demand") || 
          errorMessage.includes("temporary");

        console.warn(`[Gemini SDK] Attempt ${attempt} failed for ${modelName}. Error: ${error.message || error}`);

        if (isTemporaryOutage && attempt < 3) {
          console.warn(`[Gemini SDK] Temporary outage/limit detected. Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          // Break the retry loop for this model immediately to try the next fallback model
          console.warn(`[Gemini SDK] Model ${modelName} failed non-temporarily or out of retries. Switching to next fallback...`);
          break;
        }
      }
    }
  }
  throw lastError || new Error("Failed to generate content after trying multiple models and retrying.");
}

// --- API ROUTES ---

// Health & Config Check with DB connection validation
app.get("/api/health", async (req, res) => {
  const hasKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY";
  let dbStatus = "disconnected";
  try {
    const dbCheck = await pool.query("SELECT 1");
    if (dbCheck.rowCount !== null) {
      dbStatus = "connected";
    }
  } catch (err) {
    console.error("Database connection health check failed:", err);
  }
  
  res.json({
    status: "ok",
    database: dbStatus,
    geminiConfigured: hasKey,
    time: new Date().toISOString()
  });
});

// Fetch products and logs for a specific branch from Postgres
app.get("/api/branch/:branchId", async (req, res) => {
  const branchId = req.params.branchId || DEFAULT_BRANCH;
  try {
    const productsRes = await pool.query(
      "SELECT * FROM products WHERE branch_id = $1",
      [branchId]
    );
    
    const logsRes = await pool.query(
      "SELECT * FROM activity_logs WHERE branch_id = $1 ORDER BY timestamp DESC",
      [branchId]
    );

    const products = productsRes.rows.map(row => ({
      id: row.id,
      name: row.name,
      brand: row.brand,
      multilingualNames: typeof row.multilingual_names === 'string' 
        ? JSON.parse(row.multilingual_names) 
        : (row.multilingual_names || []),
      expiryDate: row.expiry_date,
      imageUrl: row.image_url,
      expiryImageUrl: row.expiry_image_url,
      status: row.status,
      quantity: row.quantity,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      logs: typeof row.logs === 'string' 
        ? JSON.parse(row.logs) 
        : (row.logs || [])
    }));

    const logs = logsRes.rows.map(row => ({
      id: row.id,
      branchId: row.branch_id,
      productId: row.product_id,
      productName: row.product_name,
      brand: row.brand,
      employeeName: row.employee_name,
      action: row.action,
      timestamp: row.timestamp
    }));

    res.json({ products, logs });
  } catch (err: any) {
    console.error(`[Postgres] Error fetching data for branch ${branchId}:`, err);
    res.status(500).json({ error: "Failed to fetch data from database", details: err.message });
  }
});

// Synchronize products and activity logs for a specific branch with Postgres
app.post("/api/branch/:branchId/sync", async (req, res) => {
  const branchId = req.params.branchId || DEFAULT_BRANCH;
  const { products = [], logs = [] } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Sync Products
    if (products.length === 0) {
      await client.query("DELETE FROM products WHERE branch_id = $1", [branchId]);
    } else {
      // Delete any products in DB for this branch that are NOT in the incoming products list
      const incomingProductIds = products.map((p: any) => p.id);
      const placeholders = incomingProductIds.map((_, i) => `$${i + 2}`).join(",");
      await client.query(
        `DELETE FROM products WHERE branch_id = $1 AND id NOT IN (${placeholders})`,
        [branchId, ...incomingProductIds]
      );

      // Upsert products that are in the incoming list
      for (const product of products) {
        await client.query(
          `INSERT INTO products (
            id, branch_id, name, brand, multilingual_names, expiry_date, 
            image_url, expiry_image_url, status, quantity, created_at, updated_at, logs
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (id) DO UPDATE SET
            branch_id = EXCLUDED.branch_id,
            name = EXCLUDED.name,
            brand = EXCLUDED.brand,
            multilingual_names = EXCLUDED.multilingual_names,
            expiry_date = EXCLUDED.expiry_date,
            image_url = EXCLUDED.image_url,
            expiry_image_url = EXCLUDED.expiry_image_url,
            status = EXCLUDED.status,
            quantity = EXCLUDED.quantity,
            created_at = EXCLUDED.created_at,
            updated_at = EXCLUDED.updated_at,
            logs = EXCLUDED.logs`,
          [
            product.id,
            branchId,
            product.name,
            product.brand,
            JSON.stringify(product.multilingualNames || []),
            product.expiryDate,
            product.imageUrl || null,
            product.expiryImageUrl || null,
            product.status,
            product.quantity,
            product.createdAt,
            product.updatedAt,
            JSON.stringify(product.logs || [])
          ]
        );
      }
    }

    // 2. Sync Activity Logs
    for (const log of logs) {
      await client.query(
        `INSERT INTO activity_logs (
          id, branch_id, product_id, product_name, brand, employee_name, action, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO NOTHING`,
        [
          log.id,
          log.branchId || branchId,
          log.productId,
          log.productName,
          log.brand,
          log.employeeName,
          log.action,
          log.timestamp
        ]
      );
    }

    await client.query("COMMIT");
    res.json({ success: true, branchId });
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error(`[Postgres] Error syncing data for branch ${branchId}:`, err);
    res.status(500).json({ error: "Failed to sync data with database", details: err.message });
  } finally {
    client.release();
  }
});

// Analyze Packaging Image (Photo 1)
app.post("/api/ocr/package", async (req, res) => {
  const { imageBase64, isMockSample, mockData } = req.body;

  // Handle mock sample directly to prevent unnecessary API calls and ensure instant preview response
  if (isMockSample && mockData) {
    return res.json({
      success: true,
      data: mockData,
      isSimulated: true
    });
  }

  try {
    const ai = getGeminiClient();
    
    // Extract base64 clean data
    const matches = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    let mimeType = "image/jpeg";
    let base64Data = imageBase64;
    
    if (matches && matches.length === 3) {
      mimeType = matches[1];
      base64Data = matches[2];
    }

    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Data
      }
    };

    const promptText = `Analyze this product packaging photo.
Extract the product details strictly in JSON.
1. Extract the prominent product "name" in its main printed language.
2. Extract the "brand" or manufacturer name (e.g. Alpro, Nestle, Ritter Sport, etc.).
3. Identify all distinct languages present on the packaging (like Deutsch, English, Türkçe, العربية, etc.). For each language found, provide the product name as printed on the package in that language. Put this in "multilingualNames".
`;

    const config = {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Primary printed product name" },
          brand: { type: Type.STRING, description: "Brand name or manufacturer" },
          multilingualNames: {
            type: Type.ARRAY,
            description: "Extracted multilingual name representations seen on the packaging",
            items: {
              type: Type.OBJECT,
              properties: {
                language: { type: Type.STRING, description: "Language name, e.g., 'Deutsch', 'English', 'Türkçe', 'العربية'" },
                name: { type: Type.STRING, description: "Product title/flavor in this language" }
              },
              required: ["language", "name"]
            }
          }
        },
        required: ["name", "brand", "multilingualNames"]
      }
    };

    const response = await generateContentWithRetry(ai, config, imagePart, promptText);

    const parsedData = JSON.parse(response.text || "{}");
    res.json({
      success: true,
      data: parsedData,
      isSimulated: false
    });
  } catch (error: any) {
    console.error("Gemini Package OCR Error:", error);
    // Graceful error recovery: Return mock data or prompt user to fill manually
    res.status(200).json({
      success: false,
      error: error.message || "Failed to process image",
      isSimulated: true,
      message: "Unable to reach Gemini API. Entering manual backup mode."
    });
  }
});

// Analyze Expiry Image (Photo 2)
app.post("/api/ocr/expiry", async (req, res) => {
  const { imageBase64, isMockSample, mockDate } = req.body;

  if (isMockSample && mockDate) {
    return res.json({
      success: true,
      data: { expiryDate: mockDate, confidence: 0.99 },
      isSimulated: true
    });
  }

  try {
    const ai = getGeminiClient();
    
    const matches = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    let mimeType = "image/jpeg";
    let base64Data = imageBase64;
    
    if (matches && matches.length === 3) {
      mimeType = matches[1];
      base64Data = matches[2];
    }

    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Data
      }
    };

    const promptText = `Analyze this image which contains a printed expiry date, best before date, or Mindesthaltbarkeitsdatum (MHD).
Locate the printed date numbers (e.g. 15.10.2026, 12/26, EXP 05/27, 2026/06/30).
Standardize it into 'YYYY-MM-DD' format.
If you find a month/year like '12/26', output '2026-12-01'.
If unreadable, return empty string for expiryDate and confidence 0.0.
`;

    const config = {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          expiryDate: { type: Type.STRING, description: "Standardized expiry date in YYYY-MM-DD format" },
          confidence: { type: Type.NUMBER, description: "Confidence rating of the read from 0.0 to 1.0" }
        },
        required: ["expiryDate", "confidence"]
      }
    };

    const response = await generateContentWithRetry(ai, config, imagePart, promptText);

    const parsedData = JSON.parse(response.text || "{}");
    res.json({
      success: true,
      data: parsedData,
      isSimulated: false
    });
  } catch (error: any) {
    console.error("Gemini Expiry OCR Error:", error);
    res.status(200).json({
      success: false,
      error: error.message || "Failed to parse expiry date",
      isSimulated: true,
      message: "Could not read date automatically. Please input manually."
    });
  }
});


// Start server function
async function startServer() {
  await initDB();
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // SPA Fallback for production React router / entry
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Smart Expiry Tracker server is running on http://localhost:${PORT}`);
  });
}

startServer();
