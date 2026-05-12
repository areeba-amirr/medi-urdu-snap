import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

async function callAI(body: Record<string, unknown>) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY not configured");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, ...body }),
  });
  if (res.status === 429) throw new Error("Rate limit exceeded. Please wait a moment and try again.");
  if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Workspace → Usage.");
  if (!res.ok) {
    const t = await res.text();
    console.error("AI gateway error", res.status, t);
    throw new Error(`AI request failed (${res.status})`);
  }
  return res.json();
}

function parseToolCall(data: any) {
  const tc = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (!tc) {
    // Fallback: try parsing content as JSON
    const content = data?.choices?.[0]?.message?.content ?? "";
    const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    try { return JSON.parse(cleaned); } catch { throw new Error("AI returned invalid response"); }
  }
  try {
    return JSON.parse(tc.function.arguments);
  } catch {
    throw new Error("AI returned malformed structured output");
  }
}

const medicineSchema = {
  type: "object",
  properties: {
    medicine_name: { type: "string" },
    medicine_name_urdu: { type: "string" },
    dosage: { type: "string" },
    dosage_urdu: { type: "string" },
    frequency: { type: "string" },
    frequency_urdu: { type: "string" },
    instructions: { type: "string" },
    instructions_urdu: { type: "string" },
    warnings: { type: "string" },
    warnings_urdu: { type: "string" },
    food_interactions: { type: "string" },
    food_interactions_urdu: { type: "string" },
    is_dangerous: { type: "boolean" },
  },
  required: [
    "medicine_name", "medicine_name_urdu", "dosage", "dosage_urdu",
    "frequency", "frequency_urdu", "instructions", "instructions_urdu",
    "warnings", "warnings_urdu",
    "food_interactions", "food_interactions_urdu", "is_dangerous",
  ],
  additionalProperties: false,
};

const MEDICINE_TEXT_FIELDS = [
  "medicine_name", "medicine_name_urdu",
  "dosage", "dosage_urdu",
  "frequency", "frequency_urdu",
  "instructions", "instructions_urdu",
  "warnings", "warnings_urdu",
  "food_interactions", "food_interactions_urdu",
] as const;

function applyMedicineFallbacks(med: Record<string, any>) {
  const out: Record<string, any> = { ...med };
  for (const k of MEDICINE_TEXT_FIELDS) {
    const v = out[k];
    const empty = v === null || v === undefined ||
      (typeof v === "string" && (v.trim() === "" ||
        /^(not\s*specified|n\/?a|unknown|none)$/i.test(v.trim()) ||
        v.trim() === "درج نہیں"));
    if (empty) out[k] = k.endsWith("_urdu") ? "دستیاب نہیں" : "N/A";
  }
  out.is_dangerous = out.is_dangerous === true || String(out.is_dangerous).toLowerCase() === "true";
  return out;
}

export const scanMedicine = createServerFn({ method: "POST" })
  .inputValidator((d: { imageBase64: string }) => z.object({ imageBase64: z.string().min(20) }).parse(d))
  .handler(async ({ data }) => {
    const dataUrl = data.imageBase64.startsWith("data:")
      ? data.imageBase64
      : `data:image/jpeg;base64,${data.imageBase64}`;

    const promptText = `You are an expert medical assistant. Look at this medicine label image very carefully. Read EVERY word on the label. Extract ALL of this information:
- Medicine name (brand + generic)
- Exact dosage (mg, ml etc)
- How many times per day to take it
- Before or after food instructions
- All warnings and side effects
- Food and drug interactions

If you cannot read something clearly, make your best medical judgment based on the medicine name and type. NEVER return null or "not specified". Always provide medical information based on the medicine name even if label is unclear. Provide Urdu translations for every field. Set is_dangerous=true only for controlled substances, strong sedatives, or medicines requiring strict medical supervision.`;

    const result = await callAI({
      messages: [
        { role: "system", content: promptText },
        {
          role: "user",
          content: [
            { type: "text", text: "Read this medicine label and extract all information." },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      tools: [{
        type: "function",
        function: {
          name: "extract_medicine",
          description: "Return medicine information in English and Urdu.",
          parameters: medicineSchema,
        },
      }],
      tool_choice: { type: "function", function: { name: "extract_medicine" } },
    });
    return applyMedicineFallbacks(parseToolCall(result));
  });

const prescriptionSchema = {
  type: "object",
  properties: {
    medicines: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          name_urdu: { type: "string" },
          dosage: { type: "string" },
          dosage_urdu: { type: "string" },
          frequency: { type: "string" },
          frequency_urdu: { type: "string" },
          duration: { type: "string" },
          duration_urdu: { type: "string" },
          instructions: { type: "string" },
          instructions_urdu: { type: "string" },
          warnings: { type: "string" },
          warnings_urdu: { type: "string" },
          is_dangerous: { type: "boolean" },
        },
        required: ["name","name_urdu","dosage","dosage_urdu","frequency","frequency_urdu","duration","duration_urdu","instructions","instructions_urdu","warnings","warnings_urdu","is_dangerous"],
        additionalProperties: false,
      },
    },
    doctor_notes: { type: "string" },
    doctor_notes_urdu: { type: "string" },
    interactions: { type: "string" },
    interactions_urdu: { type: "string" },
  },
  required: ["medicines","doctor_notes","doctor_notes_urdu","interactions","interactions_urdu"],
  additionalProperties: false,
};

const PRESCRIPTION_MED_FIELDS = [
  "name","name_urdu","dosage","dosage_urdu","frequency","frequency_urdu",
  "duration","duration_urdu","instructions","instructions_urdu","warnings","warnings_urdu",
] as const;

function applyPrescriptionFallbacks(p: Record<string, any>) {
  const out: Record<string, any> = { ...p };
  out.medicines = Array.isArray(p.medicines) ? p.medicines.map((m: any) => {
    const med: Record<string, any> = { ...m };
    for (const k of PRESCRIPTION_MED_FIELDS) {
      const v = med[k];
      const empty = v === null || v === undefined || (typeof v === "string" && v.trim() === "");
      if (empty) med[k] = k.endsWith("_urdu") ? "دستیاب نہیں" : "N/A";
    }
    med.is_dangerous = med.is_dangerous === true || String(med.is_dangerous).toLowerCase() === "true";
    return med;
  }) : [];
  for (const k of ["doctor_notes","doctor_notes_urdu","interactions","interactions_urdu"]) {
    const v = out[k];
    if (v === null || v === undefined || (typeof v === "string" && v.trim() === "")) out[k] = "";
  }
  return out;
}

export const scanPrescription = createServerFn({ method: "POST" })
  .inputValidator((d: { imageBase64: string }) => z.object({ imageBase64: z.string().min(20) }).parse(d))
  .handler(async ({ data }) => {
    const dataUrl = data.imageBase64.startsWith("data:")
      ? data.imageBase64
      : `data:image/jpeg;base64,${data.imageBase64}`;

    const promptText = `You are an expert medical assistant in Pakistan. Read this doctor prescription carefully. It may be handwritten or printed.

Decode ALL medical abbreviations:
TDS = تین بار روزانہ (3 times daily)
BD  = دو بار روزانہ (twice daily)
OD  = ایک بار روزانہ (once daily)
QID = 4 times daily
PC  = کھانے کے بعد (after food)
AC  = کھانے سے پہلے (before food)
HS  = سونے سے پہلے (at bedtime)
SOS = ضرورت پر (when needed)
PRN = as required
x7d = for 7 days

Extract EVERY medicine with name, dosage, frequency, duration, instructions (before/after food), and warnings — all with Urdu translations. Note any dangerous drug interactions in the 'interactions' field. NEVER return empty fields. Use medical knowledge if the label is unclear.`;

    const result = await callAI({
      messages: [
        { role: "system", content: promptText },
        {
          role: "user",
          content: [
            { type: "text", text: "Read this doctor's prescription and extract every medicine with full instructions in Urdu." },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      tools: [{
        type: "function",
        function: {
          name: "extract_prescription",
          description: "Extract prescription medicines and notes.",
          parameters: prescriptionSchema,
        },
      }],
      tool_choice: { type: "function", function: { name: "extract_prescription" } },
    });
    return applyPrescriptionFallbacks(parseToolCall(result));
  });

const symptomsSchema = {
  type: "object",
  properties: {
    pain_level: { type: "integer", minimum: 1, maximum: 10 },
    sleep_hours: { type: "number", minimum: 0, maximum: 24 },
    mood: { type: "string", enum: ["happy","okay","sad"] },
    notes: { type: "string" },
    notes_urdu: { type: "string" },
  },
  required: ["pain_level","sleep_hours","mood","notes","notes_urdu"],
  additionalProperties: false,
};

export const extractSymptoms = createServerFn({ method: "POST" })
  .inputValidator((d: { transcript: string }) => z.object({ transcript: z.string().min(1).max(2000) }).parse(d))
  .handler(async ({ data }) => {
    const result = await callAI({
      messages: [
        { role: "system", content: "You are a medical assistant. The patient describes their day in English or Urdu. Extract pain_level (1-10), sleep_hours (number), mood ('happy'|'okay'|'sad'), notes (English summary) and notes_urdu (Urdu summary). NEVER return null. If a value is unclear, use best guess: pain_level=5, sleep_hours=7, mood='okay'. Always provide both English and Urdu notes." },
        { role: "user", content: `Patient said: "${data.transcript}"` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "extract_symptoms",
          description: "Extract structured symptom data with safe defaults.",
          parameters: symptomsSchema,
        },
      }],
      tool_choice: { type: "function", function: { name: "extract_symptoms" } },
    });
    const r = parseToolCall(result);
    return {
      pain_level: typeof r.pain_level === "number" ? r.pain_level : 5,
      sleep_hours: typeof r.sleep_hours === "number" ? r.sleep_hours : 7,
      mood: ["happy","okay","sad"].includes(r.mood) ? r.mood : "okay",
      notes: r.notes || "",
      notes_urdu: r.notes_urdu || "",
    };
  });


const interactionSchema = {
  type: "object",
  properties: {
    is_safe: { type: "boolean" },
    severity: { type: "string", enum: ["safe","mild","moderate","severe"] },
    explanation: { type: "string" },
    explanation_urdu: { type: "string" },
  },
  required: ["is_safe","severity","explanation","explanation_urdu"],
  additionalProperties: false,
};

export const checkInteraction = createServerFn({ method: "POST" })
  .inputValidator((d: { medicine1: string; medicine2: string }) =>
    z.object({ medicine1: z.string().min(1).max(200), medicine2: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const result = await callAI({
      messages: [
        { role: "system", content: "You are a clinical pharmacist in Pakistan. Assess whether two medicines have a known drug interaction. Be concise and explain in plain English and clear Urdu." },
        { role: "user", content: `Medicine 1: ${data.medicine1}\nMedicine 2: ${data.medicine2}\nIs it safe to take them together?` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "check_interaction",
          description: "Return drug interaction assessment.",
          parameters: interactionSchema,
        },
      }],
      tool_choice: { type: "function", function: { name: "check_interaction" } },
    });
    return parseToolCall(result);
  });
