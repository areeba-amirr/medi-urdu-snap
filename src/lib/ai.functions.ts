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
    warnings: { type: "string" },
    warnings_urdu: { type: "string" },
    food_interactions: { type: "string" },
    food_interactions_urdu: { type: "string" },
    is_dangerous: { type: "boolean" },
  },
  required: [
    "medicine_name", "medicine_name_urdu", "dosage", "dosage_urdu",
    "frequency", "frequency_urdu", "warnings", "warnings_urdu",
    "food_interactions", "food_interactions_urdu", "is_dangerous",
  ],
  additionalProperties: false,
};

export const scanMedicine = createServerFn({ method: "POST" })
  .inputValidator((d: { imageBase64: string }) => z.object({ imageBase64: z.string().min(20) }).parse(d))
  .handler(async ({ data }) => {
    const dataUrl = data.imageBase64.startsWith("data:")
      ? data.imageBase64
      : `data:image/jpeg;base64,${data.imageBase64}`;

    const result = await callAI({
      messages: [
        {
          role: "system",
          content: "You are a medical assistant in Pakistan. Read medicine labels carefully and translate every field to clear, simple Urdu. If a field is not visible, write 'Not specified' in English and 'درج نہیں' in Urdu. Mark is_dangerous=true only if the medicine has serious warnings (controlled substance, strong sedative, dangerous interactions, requires strict medical supervision).",
        },
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
    return parseToolCall(result);
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
          is_dangerous: { type: "boolean" },
        },
        required: ["name","name_urdu","dosage","dosage_urdu","frequency","frequency_urdu","duration","duration_urdu","instructions","instructions_urdu","is_dangerous"],
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

export const scanPrescription = createServerFn({ method: "POST" })
  .inputValidator((d: { imageBase64: string }) => z.object({ imageBase64: z.string().min(20) }).parse(d))
  .handler(async ({ data }) => {
    const dataUrl = data.imageBase64.startsWith("data:")
      ? data.imageBase64
      : `data:image/jpeg;base64,${data.imageBase64}`;

    const result = await callAI({
      messages: [
        {
          role: "system",
          content: "You are a medical assistant in Pakistan reading doctor prescriptions, often handwritten. Decode standard medical abbreviations: TDS=3 times daily (تین بار روزانہ), BD=twice daily (دو بار روزانہ), OD=once daily (ایک بار روزانہ), QID=4 times daily, PC=after food (کھانے کے بعد), AC=before food (کھانے سے پہلے), HS=at bedtime (سونے سے پہلے), SOS=as needed (ضرورت پڑنے پر), PRN=as required, x7d=for 7 days. Translate every field to simple Urdu. Note any drug interactions in 'interactions'. If nothing readable, return empty arrays/strings.",
        },
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
    return parseToolCall(result);
  });

const symptomsSchema = {
  type: "object",
  properties: {
    pain_level: { type: ["integer","null"], minimum: 0, maximum: 10 },
    sleep_hours: { type: ["number","null"], minimum: 0, maximum: 24 },
    mood: { type: ["string","null"], enum: ["happy","okay","sad", null] },
    notes: { type: "string" },
    notes_urdu: { type: "string" },
  },
  required: ["pain_level","sleep_hours","mood","notes","notes_urdu"],
};

export const extractSymptoms = createServerFn({ method: "POST" })
  .inputValidator((d: { transcript: string }) => z.object({ transcript: z.string().min(1).max(2000) }).parse(d))
  .handler(async ({ data }) => {
    const result = await callAI({
      messages: [
        { role: "system", content: "You are a medical assistant. The patient describes their day in English or Urdu. Extract pain (0-10), sleep hours, mood, and a clean summary. If a value isn't mentioned, use null." },
        { role: "user", content: `Patient said: "${data.transcript}"` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "extract_symptoms",
          description: "Extract structured symptom data.",
          parameters: symptomsSchema,
        },
      }],
      tool_choice: { type: "function", function: { name: "extract_symptoms" } },
    });
    return parseToolCall(result);
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
