import type { Voice, VoiceGender } from "@/types/tts";

const voiceMeta: Array<{
  id: string;
  displayName: string;
  gender: VoiceGender;
  accent: string;
  useCase: string;
  description: string;
  tones: string[];
}> = [
  { id: "Achernar", displayName: "Global Tutorial Female", gender: "Female", accent: "Global", useCase: "Tutorial", description: "Clear, bright delivery for tutorials and polished reads.", tones: ["clear", "bright", "guide"] },
  { id: "Achird", displayName: "Global Explainer Male", gender: "Male", accent: "Global", useCase: "Explainer", description: "Grounded male voice for direct explainers and demos.", tones: ["grounded", "direct", "steady"] },
  { id: "Algenib", displayName: "Global Training Male", gender: "Male", accent: "Global", useCase: "Training", description: "Crisp, articulate voice for training and walkthroughs.", tones: ["crisp", "articulate", "training"] },
  { id: "Algieba", displayName: "Global Conversational Male", gender: "Male", accent: "Global", useCase: "Conversation", description: "Warm male voice for conversational creator content.", tones: ["warm", "conversational", "friendly"] },
  { id: "Alnilam", displayName: "Global Premium Narrator Male", gender: "Male", accent: "Global", useCase: "Narration", description: "Confident narrator for announcements and premium reads.", tones: ["confident", "narrator", "premium"] },
  { id: "Aoede", displayName: "Global Gentle Female", gender: "Female", accent: "Global", useCase: "Soft Narration", description: "Warm and melodic for softer creator scripts.", tones: ["warm", "melodic", "gentle"] },
  { id: "Autonoe", displayName: "Global Story Female", gender: "Female", accent: "Global", useCase: "Storytelling", description: "Smooth, balanced female voice for product stories.", tones: ["smooth", "balanced", "story"] },
  { id: "Callirrhoe", displayName: "Global Brand Female", gender: "Female", accent: "Global", useCase: "Brand", description: "Elegant and composed for brand narration.", tones: ["elegant", "composed", "brand"] },
  { id: "Charon", displayName: "Global Professional Male", gender: "Male", accent: "Global", useCase: "Corporate", description: "Calm and professional for explainers and training.", tones: ["calm", "professional", "steady"] },
  { id: "Despina", displayName: "Global Learning Female", gender: "Female", accent: "Global", useCase: "Education", description: "Friendly, approachable voice for learning content.", tones: ["friendly", "approachable", "learning"] },
  { id: "Enceladus", displayName: "Global Technical Male", gender: "Male", accent: "Global", useCase: "Technical", description: "Measured voice for technical narration and documentation.", tones: ["measured", "technical", "precise"] },
  { id: "Erinome", displayName: "Global Social Female", gender: "Female", accent: "Global", useCase: "Social", description: "Light, expressive voice for social clips and reels.", tones: ["light", "expressive", "social"] },
  { id: "Fenrir", displayName: "Global Cinematic Male", gender: "Male", accent: "Global", useCase: "Cinematic", description: "Bold, textured voice for dramatic scripts.", tones: ["bold", "dramatic", "textured"] },
  { id: "Gacrux", displayName: "Global Long-Form Female", gender: "Female", accent: "Global", useCase: "Long-Form", description: "Mature, steady voice for explainers and long-form narration.", tones: ["mature", "steady", "long-form"] },
  { id: "Iapetus", displayName: "Global Authority Male", gender: "Male", accent: "Global", useCase: "Serious Narration", description: "Deep, authoritative voice for serious narration.", tones: ["deep", "authoritative", "serious"] },
  { id: "Kore", displayName: "Global Corporate Female", gender: "Female", accent: "Global", useCase: "Corporate", description: "Strong, composed, and firm for confident narration.", tones: ["firm", "direct", "polished"] },
  { id: "Laomedeia", displayName: "Global Support Female", gender: "Female", accent: "Global", useCase: "Support", description: "Soft and reassuring for wellness or support scripts.", tones: ["soft", "reassuring", "support"] },
  { id: "Leda", displayName: "Global Natural Female", gender: "Female", accent: "Global", useCase: "Conversation", description: "Natural and nimble for conversational reads.", tones: ["natural", "nimble", "conversational"] },
  { id: "Orus", displayName: "Global Demo Male", gender: "Male", accent: "Global", useCase: "Product Demo", description: "Clean, energetic male voice for product demos.", tones: ["clean", "energetic", "demo"] },
  { id: "Pulcherrima", displayName: "Global Ad Female", gender: "Female", accent: "Global", useCase: "Advertising", description: "Polished and premium for brand and ad reads.", tones: ["polished", "premium", "ad"] },
  { id: "Puck", displayName: "Global Creator Male", gender: "Male", accent: "Global", useCase: "Creator", description: "Upbeat and lively for energetic product or creator content.", tones: ["upbeat", "bright", "playful"] },
  { id: "Rasalgethi", displayName: "Global Podcast Male", gender: "Male", accent: "Global", useCase: "Podcast", description: "Rich, relaxed voice for podcasts and narration.", tones: ["rich", "relaxed", "podcast"] },
  { id: "Sadachbia", displayName: "Global Corporate Male", gender: "Male", accent: "Global", useCase: "Corporate", description: "Neutral professional voice for corporate content.", tones: ["neutral", "professional", "corporate"] },
  { id: "Sadaltager", displayName: "Global Promo Male", gender: "Male", accent: "Global", useCase: "Promotion", description: "Warm presenter voice for explainers and promos.", tones: ["warm", "presenter", "promo"] },
  { id: "Schedar", displayName: "Global Training Authority Male", gender: "Male", accent: "Global", useCase: "Training", description: "Steady, serious voice for announcements and training.", tones: ["steady", "serious", "training"] },
  { id: "Sulafat", displayName: "Global Business Female", gender: "Female", accent: "Global", useCase: "Business", description: "Clean, confident voice for business storytelling.", tones: ["clean", "confident", "business"] },
  { id: "Umbriel", displayName: "Global Calm Male", gender: "Male", accent: "Global", useCase: "Calm Narration", description: "Low-key, smooth voice for calm narration.", tones: ["smooth", "calm", "low-key"] },
  { id: "Vindemiatrix", displayName: "Global Education Female", gender: "Female", accent: "Global", useCase: "Education", description: "Bright, precise voice for educational content.", tones: ["bright", "precise", "education"] },
  { id: "Zephyr", displayName: "Global Clear Female", gender: "Female", accent: "Global", useCase: "Short-Form", description: "Bright and clear for concise, friendly delivery.", tones: ["clear", "bright", "clean"] },
  { id: "Zubenelgenubi", displayName: "Global Character Male", gender: "Male", accent: "Global", useCase: "Character", description: "Distinct, characterful voice for memorable scripts.", tones: ["distinct", "character", "memorable"] },
];

export const ALL_VOICES = voiceMeta.map((voice) => ({
  ...voice,
  displayName: voice.displayName,
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
