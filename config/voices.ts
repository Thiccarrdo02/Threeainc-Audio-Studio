import type { Voice, VoiceGender } from "@/types/tts";

const voiceMeta: Array<{
  id: string;
  gender: VoiceGender;
  description: string;
  tones: string[];
}> = [
  { id: "Achernar", gender: "Female", description: "Clear, bright delivery for tutorials and polished reads.", tones: ["clear", "bright", "guide"] },
  { id: "Achird", gender: "Male", description: "Grounded male voice for direct explainers and demos.", tones: ["grounded", "direct", "steady"] },
  { id: "Algenib", gender: "Male", description: "Crisp, articulate voice for training and walkthroughs.", tones: ["crisp", "articulate", "training"] },
  { id: "Algieba", gender: "Male", description: "Warm male voice for conversational creator content.", tones: ["warm", "conversational", "friendly"] },
  { id: "Alnilam", gender: "Male", description: "Confident narrator for announcements and premium reads.", tones: ["confident", "narrator", "premium"] },
  { id: "Aoede", gender: "Female", description: "Warm and melodic for softer creator scripts.", tones: ["warm", "melodic", "gentle"] },
  { id: "Autonoe", gender: "Female", description: "Smooth, balanced female voice for product stories.", tones: ["smooth", "balanced", "story"] },
  { id: "Callirrhoe", gender: "Female", description: "Elegant and composed for brand narration.", tones: ["elegant", "composed", "brand"] },
  { id: "Charon", gender: "Male", description: "Calm and professional for explainers and training.", tones: ["calm", "professional", "steady"] },
  { id: "Despina", gender: "Female", description: "Friendly, approachable voice for learning content.", tones: ["friendly", "approachable", "learning"] },
  { id: "Enceladus", gender: "Male", description: "Measured voice for technical narration and documentation.", tones: ["measured", "technical", "precise"] },
  { id: "Erinome", gender: "Female", description: "Light, expressive voice for social clips and reels.", tones: ["light", "expressive", "social"] },
  { id: "Fenrir", gender: "Male", description: "Bold, textured voice for dramatic scripts.", tones: ["bold", "dramatic", "textured"] },
  { id: "Gacrux", gender: "Female", description: "Mature, steady voice for explainers and long-form narration.", tones: ["mature", "steady", "long-form"] },
  { id: "Iapetus", gender: "Male", description: "Deep, authoritative voice for serious narration.", tones: ["deep", "authoritative", "serious"] },
  { id: "Kore", gender: "Female", description: "Strong, composed, and firm for confident narration.", tones: ["firm", "direct", "polished"] },
  { id: "Laomedeia", gender: "Female", description: "Soft and reassuring for wellness or support scripts.", tones: ["soft", "reassuring", "support"] },
  { id: "Leda", gender: "Female", description: "Natural and nimble for conversational reads.", tones: ["natural", "nimble", "conversational"] },
  { id: "Orus", gender: "Male", description: "Clean, energetic male voice for product demos.", tones: ["clean", "energetic", "demo"] },
  { id: "Pulcherrima", gender: "Female", description: "Polished and premium for brand and ad reads.", tones: ["polished", "premium", "ad"] },
  { id: "Puck", gender: "Male", description: "Upbeat and lively for energetic product or creator content.", tones: ["upbeat", "bright", "playful"] },
  { id: "Rasalgethi", gender: "Male", description: "Rich, relaxed voice for podcasts and narration.", tones: ["rich", "relaxed", "podcast"] },
  { id: "Sadachbia", gender: "Male", description: "Neutral professional voice for corporate content.", tones: ["neutral", "professional", "corporate"] },
  { id: "Sadaltager", gender: "Male", description: "Warm presenter voice for explainers and promos.", tones: ["warm", "presenter", "promo"] },
  { id: "Schedar", gender: "Male", description: "Steady, serious voice for announcements and training.", tones: ["steady", "serious", "training"] },
  { id: "Sulafat", gender: "Female", description: "Clean, confident voice for business storytelling.", tones: ["clean", "confident", "business"] },
  { id: "Umbriel", gender: "Male", description: "Low-key, smooth voice for calm narration.", tones: ["smooth", "calm", "low-key"] },
  { id: "Vindemiatrix", gender: "Female", description: "Bright, precise voice for educational content.", tones: ["bright", "precise", "education"] },
  { id: "Zephyr", gender: "Female", description: "Bright and clear for concise, friendly delivery.", tones: ["clear", "bright", "clean"] },
  { id: "Zubenelgenubi", gender: "Male", description: "Distinct, characterful voice for memorable scripts.", tones: ["distinct", "character", "memorable"] },
];

export const ALL_VOICES = voiceMeta.map((voice) => ({
  ...voice,
  displayName: voice.id,
  accent: "Multilingual",
  previewText: "Welcome to ThreeZinc platform, Audio Studio.",
  previewUrl: `/previews/en/${voice.id}.mp3`,
  previewUrls: {
    english: `/previews/en/${voice.id}.mp3`,
    hindi: `/previews/hi/${voice.id}.mp3`,
  },
  enabledInMvp: true,
  provider: "gemini" as const,
})) satisfies Voice[];

export const MVP_VOICES = ALL_VOICES;
export const MVP_VOICE_IDS = MVP_VOICES.map((voice) => voice.id);

export function isMvpVoiceId(value: string): value is (typeof MVP_VOICE_IDS)[number] {
  return MVP_VOICE_IDS.includes(value as (typeof MVP_VOICE_IDS)[number]);
}

export function getVoiceById(id: string): Voice | undefined {
  return MVP_VOICES.find((voice) => voice.id === id);
}
