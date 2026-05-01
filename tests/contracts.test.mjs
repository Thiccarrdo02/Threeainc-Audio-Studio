import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const root = process.cwd();

async function read(path) {
  return readFile(join(root, path), "utf8");
}

test("required package scripts exist", async () => {
  const pkg = JSON.parse(await read("package.json"));
  for (const script of ["dev", "build", "lint", "typecheck", "test"]) {
    assert.equal(typeof pkg.scripts[script], "string", `${script} script missing`);
  }
});

test("static preview contract is preserved", async () => {
  assert.equal(
    existsSync(join(root, "app/api/tts/preview/route.ts")),
    false,
    "preview API route must not exist",
  );

  for (const voice of ["Kore", "Puck", "Charon", "Zephyr", "Aoede"]) {
    const file = join(root, "public/previews", `${voice}.wav`);
    const fileStat = await stat(file);
    assert.ok(fileStat.size > 1000, `${voice} preview should be a real local WAV`);
  }
});

test("core MVP configuration remains intact", async () => {
  const voices = await read("config/voices.ts");
  const languages = await read("config/languages.ts");
  const stylePresets = await read("config/style-presets.ts");
  const tags = await read("config/expressive-tags.ts");
  const pricing = await read("config/pricing.ts");
  const studio = await read("components/studio/tts-studio.tsx");

  const falVoices = [
    "Achernar", "Achird", "Algenib", "Algieba", "Alnilam", "Aoede",
    "Autonoe", "Callirrhoe", "Charon", "Despina", "Enceladus", "Erinome",
    "Fenrir", "Gacrux", "Iapetus", "Kore", "Laomedeia", "Leda", "Orus",
    "Pulcherrima", "Puck", "Rasalgethi", "Sadachbia", "Sadaltager",
    "Schedar", "Sulafat", "Umbriel", "Vindemiatrix", "Zephyr",
    "Zubenelgenubi",
  ];

  for (const voice of falVoices) {
    assert.match(voices, new RegExp(`id: "${voice}"`));
  }

  for (const voice of ["Kore", "Puck", "Charon", "Zephyr", "Aoede"]) {
    assert.match(voices, new RegExp(`localPreviewVoices.*${voice}`, "s"));
  }

  for (const language of [
    "Auto-detect",
    "English (US)",
    "English (India)",
    "Hindi (India)",
    "Marathi (India)",
    "Tamil (India)",
    "Telugu (India)",
    "Gujarati (India)",
    "Kannada (India)",
    "Malayalam (India)",
    "Punjabi (India)",
  ]) {
    assert.ok(languages.includes(language), `${language} missing`);
  }

  for (const preset of ["Indian English", "Native Hindi", "North Indian", "South Indian", "Studio Ad", "Social Reel"]) {
    assert.ok(stylePresets.includes(preset), `${preset} preset missing`);
  }

  for (const tag of ["[laughing]", "[sigh]", "[uhm]", "[whispering]", "[shouting]", "[sarcasm]", "[robotic]", "[excited]", "[slowly]", "[fast]", "[extremely fast]", "[short pause]", "[medium pause]", "[long pause]", "[dramatic]", "[cheerfully]"]) {
    assert.ok(tags.includes(tag), `${tag} missing`);
  }

  assert.match(pricing, /FAL_COST_PER_1K_CHARACTERS_USD\s*=\s*0\.15/);
  assert.match(pricing, /THREEZINC_MARKUP_MULTIPLIER\s*=\s*1\.25/);
  assert.match(pricing, /THREEZINC_CREDITS_PER_USD\s*=\s*20/);
  assert.match(pricing, /MINIMUM_THREEZINC_CREDITS\s*=\s*0\.5/);
  assert.match(studio, /accentStrength:\s*45/);
  assert.ok(studio.includes("Accent Strength"), "accent strength control missing");
  assert.ok(studio.includes("addFallbackExpression"), "auto-expression fallback missing");
});

test("secret stays out of client/source files", async () => {
  const sourceFiles = [
    "app/api/tts/generate/route.ts",
    "components/studio/tts-studio.tsx",
    "hooks/use-tts-generation.ts",
    "lib/client-store.ts",
    "docs/phase-4-handoff.md",
  ];

  for (const file of sourceFiles) {
    if (!existsSync(join(root, file))) {
      continue;
    }
    const contents = await read(file);
    assert.equal(contents.includes("98f7b25a"), false, `${file} contains key prefix`);
  }

  const gitignore = await read(".gitignore");
  assert.match(gitignore, /^\.env\.\*$/m);
  assert.match(gitignore, /^!\.env\.example$/m);
});

test("storage and provider boundaries are documented in code", async () => {
  const store = await read("lib/client-store.ts");
  const route = await read("app/api/tts/generate/route.ts");

  assert.match(store, /localStorage/);
  assert.match(route, /process\.env\.FAL_KEY/);
  assert.match(route, /export const maxDuration = 60/);
  assert.equal(route.includes("NEXT_PUBLIC_FAL_KEY"), false);
});

test("vercel deployment contract is present", async () => {
  const vercel = JSON.parse(await read("vercel.json"));
  const deploymentDoc = await read("docs/VERCEL_DEPLOYMENT.md");

  assert.equal(vercel.framework, "nextjs");
  assert.equal(vercel.installCommand, "npm ci");
  assert.equal(vercel.buildCommand, "npm run build");
  assert.ok(deploymentDoc.includes("FAL_KEY"));
  assert.ok(deploymentDoc.includes("NEXT_PUBLIC_FAL_KEY"));
});
