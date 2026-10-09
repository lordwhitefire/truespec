// RECON-001 vision helper — calls the Gemini API directly (GEMINI_KEY).
// Usage: node vision.mjs <image.png> "<prompt>"
// The key is read from the environment and never printed or written.
import { readFileSync } from "node:fs";

const [, , imagePath, ...promptParts] = process.argv;
if (!imagePath) {
  console.error('usage: node vision.mjs <image.png> "<prompt>"');
  process.exit(2);
}
const prompt = promptParts.join(" ") || "Describe this screenshot factually.";
const key = process.env.GEMINI_KEY;
if (!key) {
  console.error("GEMINI_KEY is not set in the environment.");
  process.exit(2);
}
const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const b64 = readFileSync(imagePath).toString("base64");
const body = {
  contents: [
    {
      parts: [
        { text: prompt },
        { inline_data: { mime_type: "image/png", data: b64 } },
      ],
    },
  ],
};

const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
  { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
);
const data = await res.json();
if (!res.ok) {
  console.error(`gemini ${res.status}: ${JSON.stringify(data).slice(0, 800)}`);
  process.exit(1);
}
const text =
  data.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join("") ?? "";
console.log(text);
