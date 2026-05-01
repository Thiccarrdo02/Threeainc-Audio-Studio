import { fal } from "@fal-ai/client";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const modelId = "fal-ai/gemini-3.1-flash-tts";
const force = process.argv.includes("--force");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : undefined;

const expressions = [
  "[cheerfully]",
  "[short pause]",
  "[excited]",
  "[uhm]",
];

function loadEnv() {
  const envPath = join(root, ".env.local");
  if (!existsSync(envPath)) {
    return;
  }

  const env = readFileSync(envPath, "utf8");
  for (const line of env.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/i);
    if (!match || process.env[match[1]]) {
      continue;
    }
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

function parseVoices(source) {
  return Array.from(source.matchAll(/\{\s*id:\s*"([^"]+)"/g)).map(
    (match) => match[1],
  );
}

function promptFor(language, index) {
  const expression = expressions[index % expressions.length];
  if (language === "hi") {
    return `थ्रीज़िंक प्लेटफॉर्म के ऑडियो स्टूडियो में ${expression} आपका स्वागत है।`;
  }

  return `Welcome to ThreeZinc platform, ${expression} Audio Studio.`;
}

function styleFor(language) {
  if (language === "hi") {
    return "Create a short polished Hindi preview for a voice catalog. Use natural Hindi pronunciation, clear studio quality, and do not read bracketed expression tags literally.";
  }

  return "Create a short polished English preview for a voice catalog. Use clear studio quality and do not read bracketed expression tags literally.";
}

async function download(url, outFile) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(outFile, buffer);
  return buffer.length;
}

async function generatePreview(voice, language, index) {
  const outDir = join(root, "public", "previews", language);
  const outFile = join(outDir, `${voice}.mp3`);

  await mkdir(outDir, { recursive: true });
  if (!force && existsSync(outFile)) {
    const fileStat = await stat(outFile);
    return { voice, language, skipped: true, bytes: fileStat.size, path: outFile };
  }

  const result = await fal.subscribe(modelId, {
    input: {
      prompt: promptFor(language, index),
      style_instructions: styleFor(language),
      language_code: language === "hi" ? "Hindi (India)" : "English (US)",
      voice,
      output_format: "mp3",
      temperature: 0.75,
    },
    logs: false,
  });

  const audio = result.data?.audio;
  if (!audio?.url) {
    throw new Error(`Missing audio URL for ${voice}/${language}`);
  }

  const bytes = await download(audio.url, outFile);
  return { voice, language, bytes, path: outFile };
}

async function main() {
  loadEnv();

  if (!process.env.FAL_KEY) {
    throw new Error("FAL_KEY is required in .env.local or the environment.");
  }

  fal.config({ credentials: process.env.FAL_KEY });

  const voicesSource = await readFile(join(root, "config", "voices.ts"), "utf8");
  const voices = parseVoices(voicesSource);
  const selectedVoices = Number.isFinite(limit) ? voices.slice(0, limit) : voices;
  const manifest = [];

  for (const [index, voice] of selectedVoices.entries()) {
    for (const language of ["en", "hi"]) {
      const item = await generatePreview(voice, language, index);
      manifest.push(item);
      const status = item.skipped ? "skipped" : `${item.bytes} bytes`;
      console.log(`${voice}/${language}: ${status}`);
    }
  }

  await writeFile(
    join(root, "public", "previews", "manifest.json"),
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        model: modelId,
        voices: selectedVoices,
        languages: ["en", "hi"],
        files: manifest.map((item) => ({
          voice: item.voice,
          language: item.language,
          path: item.path.replace(root, "").replaceAll("\\", "/").replace(/^\//, ""),
          skipped: Boolean(item.skipped),
          bytes: item.bytes,
        })),
      },
      null,
      2,
    )}\n`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
