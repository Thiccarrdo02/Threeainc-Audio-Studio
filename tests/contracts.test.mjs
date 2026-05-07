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

  const envExample = await read(".env.example");
  assert.match(envExample, /^FAL_KEY=/m);
  assert.match(envExample, /^ELEVENLABS_API_KEY=/m);
});

test("static preview contract is preserved", async () => {
  assert.equal(
    existsSync(join(root, "app/api/tts/preview/route.ts")),
    false,
    "preview API route must not exist",
  );

  const manifest = JSON.parse(await read("public/previews/manifest.json"));
  assert.deepEqual(manifest.languages, ["en", "hi"]);
  assert.equal(manifest.voices.length, 30);

  for (const voice of manifest.voices) {
    for (const language of ["en", "hi"]) {
      const file = join(root, "public/previews", language, `${voice}.mp3`);
      const fileStat = await stat(file);
      assert.ok(
        fileStat.size > 10000,
        `${voice}/${language} preview should be a real local MP3`,
      );
    }
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

  assert.match(voices, /previewUrls/);
  assert.match(voices, /\/previews\/en\/\$\{voice\.id\}\.mp3/);
  assert.match(voices, /\/previews\/hi\/\$\{voice\.id\}\.mp3/);

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
  assert.match(pricing, /CUSTOM_VOICE_TEXT_COST_PER_1K_CHARACTERS_USD\s*=\s*0\.1/);
  assert.match(pricing, /CUSTOM_VOICE_TRANSFORM_COST_PER_MINUTE_USD\s*=\s*0\.12/);
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
    "app/api/custom-voices/capabilities/route.ts",
    "app/api/custom-voices/clone/route.ts",
    "app/api/custom-voices/instant-clone/route.ts",
    "app/api/custom-voices/instant-text/route.ts",
    "app/api/custom-voices/library/route.ts",
    "app/api/custom-voices/library/import/route.ts",
    "app/api/custom-voices/speech/route.ts",
    "app/api/custom-voices/voice-changer/route.ts",
    "app/api/custom-voices/design/route.ts",
    "app/api/custom-voices/remix/route.ts",
    "app/api/custom-voices/save-generated/route.ts",
    "components/studio/custom-voice-lab.tsx",
    "components/studio/tts-studio.tsx",
    "lib/elevenlabs.ts",
    "lib/fal-custom-voices.ts",
    "lib/local-custom-voices.ts",
    "hooks/use-tts-generation.ts",
    "scripts/generate-voice-previews.mjs",
    "lib/client-store.ts",
    "docs/phase-4-handoff.md",
  ];

  for (const file of sourceFiles) {
    if (!existsSync(join(root, file))) {
      continue;
    }
    const contents = await read(file);
    const falKeyPrefix = ["98f7", "b25a"].join("");
    const elevenLabsKeyPrefix = ["sk", "_d7c7"].join("");
    assert.equal(contents.includes(falKeyPrefix), false, `${file} contains key prefix`);
    assert.equal(contents.includes(elevenLabsKeyPrefix), false, `${file} contains ElevenLabs key prefix`);
  }

  const gitignore = await read(".gitignore");
  assert.match(gitignore, /^\.env\.\*$/m);
  assert.match(gitignore, /^!\.env\.example$/m);
  assert.match(gitignore, /^\.local\/$/m);
});

test("storage and provider boundaries are documented in code", async () => {
  const store = await read("lib/client-store.ts");
  const route = await read("app/api/tts/generate/route.ts");
  const eleven = await read("lib/elevenlabs.ts");
  const customStore = await read("lib/local-custom-voices.ts");
  const customLab = await read("components/studio/custom-voice-lab.tsx");

  assert.match(store, /localStorage/);
  assert.match(route, /process\.env\.FAL_KEY/);
  assert.match(route, /export const maxDuration = 60/);
  assert.match(route, /createStudioFileName/);
  assert.match(route, /threezinc-studio/);
  assert.match(route, /sanitizeProviderMessage/);
  assert.equal(route.includes("NEXT_PUBLIC_FAL_KEY"), false);
  assert.match(eleven, /process\.env\.ELEVENLABS_API_KEY/);
  assert.match(customStore, /\.local/);
  assert.match(customLab, /\/api\/custom-voices\/clone/);
  assert.match(customLab, /\/api\/custom-voices\/speech/);
  assert.equal(customLab.includes("/api/custom-voices/generate"), false);
  assert.equal(customLab.includes("Custom Voice TTS"), false);
  assert.match(customLab, /VOICE_CONSENT_REQUIRED|I own this voice or have permission/);
  assert.match(customLab, /Instant Voice/);
  assert.equal(customLab.includes("Fal MiniMax"), false);
  assert.match(customLab, /\/api\/custom-voices\/instant-clone/);
  assert.match(customLab, /Upload reference voice/);
  assert.match(customLab, /Clone voice and generate/);
  assert.match(customLab, /Use Voice/);
  assert.match(customLab, /Transform Audio/);
  assert.match(customLab, /Create Voice/);
  assert.match(customLab, /Create New Voice/);
  assert.match(customLab, /Voice Remix/);
  assert.equal(customLab.includes("Browse Voices"), false);
  // The Studio uses a unified voice library: a single VoicePicker with
  // Built-in and Custom tabs. The old "Public voice library" panel is folded
  // into a "Browse more" expandable inside the Built-in tab.
  const studio = await read("components/studio/tts-studio.tsx");
  assert.match(studio, /VoicePicker/);
  assert.match(studio, /selectVoice/);
  assert.equal(
    studio.includes("Public voice library"),
    false,
    "old Public voice library section should be removed",
  );
  const picker = await read("components/studio/voice-picker.tsx");
  assert.match(picker, /Built-in/);
  assert.match(picker, /Custom/);
  assert.match(picker, /Voice Library/);
  // Provider/engine names must not surface to end-users. The lower-case
  // string "elevenlabs" remains as a type literal in code (not user-facing).
  assert.equal(picker.includes("Gemini"), false, "voice picker must not surface Gemini name");
  assert.equal(picker.includes("ElevenLabs"), false, "voice picker must not surface ElevenLabs name in user-facing copy");
  // Same rule for the Studio component
  assert.equal(studio.includes("Gemini"), false, "studio must not surface Gemini name");
  assert.equal(studio.includes("ElevenLabs"), false, "studio must not surface ElevenLabs name");
  assert.match(customLab, /Upload voice samples/);
  assert.match(customLab, /Create previews/);
  assert.match(customLab, /Generate remix previews/);
  assert.equal(customLab.includes("+ 25%"), false);
  assert.equal(customLab.includes("ELEVENLABS_API_KEY"), false);
  // Voice Lab uses the shared VoicePicker
  assert.match(customLab, /VoicePicker/);
  // Top bar still surfaces the Design Voice routing label and the Voice Lab name
  assert.match(studio, /Design Voice/);
  assert.match(studio, /Voice Lab/);
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
