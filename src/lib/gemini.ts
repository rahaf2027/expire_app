/**
 * Direct Gemini API calls from the browser.
 * Replaces all Express /api/ocr/* endpoints for static hosting.
 */
import { GoogleGenAI, Type } from "@google/genai";
import type { MultilingualName } from "../types";

function getClient(): GoogleGenAI {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string;
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("VITE_GEMINI_API_KEY is not set in .env");
  }
  return new GoogleGenAI({ apiKey });
}

// ─── Retry + fallback across multiple models ──────────────────────────────────
async function generateWithRetry(ai: GoogleGenAI, config: any, imagePart: any, promptText: string) {
  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];
  let lastError: any = null;

  for (const model of models) {
    let delay = 1000;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: { parts: [imagePart, { text: promptText }] },
          config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const msg = String(err.message || "").toLowerCase();
        const isTemp = msg.includes("503") || msg.includes("unavailable") || msg.includes("high demand");
        if (isTemp && attempt < 3) {
          await new Promise((r) => setTimeout(r, delay));
          delay *= 2;
        } else {
          break;
        }
      }
    }
  }
  throw lastError || new Error("Gemini: all models failed");
}

// ─── Analyze packaging photo → extract name, brand, multilingual names ────────
export async function analyzePackage(imageBase64: string): Promise<{
  name: string;
  brand: string;
  multilingualNames: MultilingualName[];
}> {
  const ai = getClient();

  const matches = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  const mimeType = matches ? matches[1] : "image/jpeg";
  const base64Data = matches ? matches[2] : imageBase64;

  const imagePart = { inlineData: { mimeType, data: base64Data } };

  const promptText = `Analyze this product packaging photo.
Extract the product details strictly in JSON.
1. Extract the prominent product "name" in its main printed language.
2. Extract the "brand" or manufacturer name (e.g. Alpro, Nestle, Ritter Sport, etc.).
3. Identify all distinct languages present on the packaging. For each language found, provide the product name as printed on the package in that language. Put this in "multilingualNames".`;

  const config = {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        brand: { type: Type.STRING },
        multilingualNames: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              language: { type: Type.STRING },
              name: { type: Type.STRING },
            },
            required: ["language", "name"],
          },
        },
      },
      required: ["name", "brand", "multilingualNames"],
    },
  };

  const response = await generateWithRetry(ai, config, imagePart, promptText);
  return JSON.parse(response.text || "{}");
}

// ─── Analyze expiry date photo → extract date in YYYY-MM-DD ──────────────────
export async function analyzeExpiry(imageBase64: string): Promise<{
  expiryDate: string;
  confidence: number;
}> {
  const ai = getClient();

  const matches = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  const mimeType = matches ? matches[1] : "image/jpeg";
  const base64Data = matches ? matches[2] : imageBase64;

  const imagePart = { inlineData: { mimeType, data: base64Data } };

  const promptText = `Analyze this image which contains a printed expiry date, best before date, or Mindesthaltbarkeitsdatum (MHD).
Locate the printed date numbers (e.g. 15.10.2026, 12/26, EXP 05/27, 2026/06/30).
Standardize it into 'YYYY-MM-DD' format.
If you find a month/year like '12/26', output '2026-12-01'.
If unreadable, return empty string for expiryDate and confidence 0.0.`;

  const config = {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        expiryDate: { type: Type.STRING },
        confidence: { type: Type.NUMBER },
      },
      required: ["expiryDate", "confidence"],
    },
  };

  const response = await generateWithRetry(ai, config, imagePart, promptText);
  return JSON.parse(response.text || "{}");
}
