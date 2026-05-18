import type { Voice, VoiceGender } from "@/types/tts";

const voiceMeta: Array<{
  id: string;
  displayName: string;
  gender: VoiceGender;
  accent: string;
  language: string;
  useCase: string;
  description: string;
  tones: string[];
}> = [
  { id: "Kore", displayName: "Meera - Indian Corporate Narrator", gender: "Female", accent: "India", language: "Hindi", useCase: "Corporate", description: "Composed Indian female voice for Hindi and Indian English business narration.", tones: ["firm", "direct", "polished"] },
  { id: "Charon", displayName: "Aarav - Indian Explainer Voice", gender: "Male", accent: "India", language: "English", useCase: "Explainer", description: "Calm Indian male presenter for product explainers, training, and SaaS demos.", tones: ["calm", "professional", "steady"] },
  { id: "Despina", displayName: "Anaya - Hindi Learning Guide", gender: "Female", accent: "India", language: "Hindi", useCase: "Education", description: "Friendly Hindi female voice for tutorials, learning content, and onboarding.", tones: ["friendly", "approachable", "learning"] },
  { id: "Algieba", displayName: "Kabir - Indian Conversational Host", gender: "Male", accent: "India", language: "English", useCase: "Conversation", description: "Warm Indian English male voice for creator content, podcasts, and natural chats.", tones: ["warm", "conversational", "friendly"] },
  { id: "Sulafat", displayName: "Isha - Indian Business Storyteller", gender: "Female", accent: "India", language: "English", useCase: "Business", description: "Confident Indian English female voice for brand stories, explainers, and pitch videos.", tones: ["clean", "confident", "business"] },
  { id: "Schedar", displayName: "Rohan - Hindi Training Narrator", gender: "Male", accent: "India", language: "Hindi", useCase: "Training", description: "Steady Hindi male narrator for training modules, announcements, and long scripts.", tones: ["steady", "serious", "training"] },
  { id: "Achernar", displayName: "Olivia - US Tutorial Guide", gender: "Female", accent: "United States", language: "English", useCase: "Tutorial", description: "Clear, bright American female delivery for tutorials and polished reads.", tones: ["clear", "bright", "guide"] },
  { id: "Achird", displayName: "Ethan - US Product Explainer", gender: "Male", accent: "United States", language: "English", useCase: "Explainer", description: "Grounded American male voice for direct explainers and product demos.", tones: ["grounded", "direct", "steady"] },
  { id: "Algenib", displayName: "Marcus - US Training Coach", gender: "Male", accent: "United States", language: "English", useCase: "Training", description: "Crisp, articulate American male voice for training and walkthroughs.", tones: ["crisp", "articulate", "training"] },
  { id: "Alnilam", displayName: "James - Premium Narrator", gender: "Male", accent: "United States", language: "English", useCase: "Narration", description: "Confident male narrator for announcements, premium reads, and launch videos.", tones: ["confident", "narrator", "premium"] },
  { id: "Aoede", displayName: "Maya - Soft Wellness Voice", gender: "Female", accent: "United States", language: "English", useCase: "Wellness", description: "Warm and melodic female voice for softer creator scripts and wellness content.", tones: ["warm", "melodic", "gentle"] },
  { id: "Autonoe", displayName: "Sofia - Product Story Voice", gender: "Female", accent: "United States", language: "English", useCase: "Storytelling", description: "Smooth, balanced female voice for product stories and founder-led narratives.", tones: ["smooth", "balanced", "story"] },
  { id: "Callirrhoe", displayName: "Clara - Elegant Brand Voice", gender: "Female", accent: "British", language: "English", useCase: "Brand", description: "Elegant British female voice for premium brand narration and formal reads.", tones: ["elegant", "composed", "brand"] },
  { id: "Enceladus", displayName: "Noah - Technical Documentation", gender: "Male", accent: "United States", language: "English", useCase: "Technical", description: "Measured male voice for technical narration, documentation, and product education.", tones: ["measured", "technical", "precise"] },
  { id: "Erinome", displayName: "Lily - Social Media Creator", gender: "Female", accent: "United States", language: "English", useCase: "Social", description: "Light, expressive female voice for social clips, reels, and short-form promos.", tones: ["light", "expressive", "social"] },
  { id: "Fenrir", displayName: "Victor - Cinematic Trailer Voice", gender: "Male", accent: "United States", language: "English", useCase: "Cinematic", description: "Bold, textured male voice for dramatic scripts, trailers, and story moments.", tones: ["bold", "dramatic", "textured"] },
  { id: "Gacrux", displayName: "Grace - Long-Form Narrator", gender: "Female", accent: "United States", language: "English", useCase: "Long-Form", description: "Mature, steady female voice for explainers, audiobooks, and long-form narration.", tones: ["mature", "steady", "long-form"] },
  { id: "Iapetus", displayName: "David - Authority Narrator", gender: "Male", accent: "United States", language: "English", useCase: "Serious Narration", description: "Deep, authoritative male voice for serious narration and documentary scripts.", tones: ["deep", "authoritative", "serious"] },
  { id: "Laomedeia", displayName: "Emma - Support Specialist", gender: "Female", accent: "United States", language: "English", useCase: "Support", description: "Soft and reassuring female voice for wellness, customer support, and help flows.", tones: ["soft", "reassuring", "support"] },
  { id: "Leda", displayName: "Nora - Natural Conversation", gender: "Female", accent: "United States", language: "English", useCase: "Conversation", description: "Natural and nimble female voice for conversational reads and creator scripts.", tones: ["natural", "nimble", "conversational"] },
  { id: "Orus", displayName: "Ryan - Energetic Demo Voice", gender: "Male", accent: "United States", language: "English", useCase: "Product Demo", description: "Clean, energetic male voice for demos, launches, and upbeat product tours.", tones: ["clean", "energetic", "demo"] },
  { id: "Pulcherrima", displayName: "Ava - Premium Ad Voice", gender: "Female", accent: "United States", language: "English", useCase: "Advertising", description: "Polished female voice for brand ads, premium promos, and campaign reads.", tones: ["polished", "premium", "ad"] },
  { id: "Puck", displayName: "Leo - Upbeat Creator Voice", gender: "Male", accent: "United States", language: "English", useCase: "Creator", description: "Upbeat and lively male voice for energetic product or creator content.", tones: ["upbeat", "bright", "playful"] },
  { id: "Rasalgethi", displayName: "Daniel - Podcast Host", gender: "Male", accent: "United States", language: "English", useCase: "Podcast", description: "Rich, relaxed male voice for podcasts, interviews, and narration.", tones: ["rich", "relaxed", "podcast"] },
  { id: "Sadachbia", displayName: "Thomas - Corporate Presenter", gender: "Male", accent: "United States", language: "English", useCase: "Corporate", description: "Neutral professional male voice for corporate content and business explainers.", tones: ["neutral", "professional", "corporate"] },
  { id: "Sadaltager", displayName: "Miles - Promo Presenter", gender: "Male", accent: "United States", language: "English", useCase: "Promotion", description: "Warm male presenter voice for explainers, promos, and product announcements.", tones: ["warm", "presenter", "promo"] },
  { id: "Umbriel", displayName: "Henry - Calm Narrator", gender: "Male", accent: "British", language: "English", useCase: "Calm Narration", description: "Low-key British male voice for calm narration, explainers, and soft reads.", tones: ["smooth", "calm", "low-key"] },
  { id: "Vindemiatrix", displayName: "Zoe - Education Voice", gender: "Female", accent: "United States", language: "English", useCase: "Education", description: "Bright, precise female voice for educational content and knowledge videos.", tones: ["bright", "precise", "education"] },
  { id: "Zephyr", displayName: "Chloe - Clear Short-Form Voice", gender: "Female", accent: "United States", language: "English", useCase: "Short-Form", description: "Bright and clear female voice for concise, friendly delivery.", tones: ["clear", "bright", "clean"] },
  { id: "Zubenelgenubi", displayName: "Owen - Character Performer", gender: "Male", accent: "United States", language: "English", useCase: "Character", description: "Distinct, characterful male voice for memorable scripts and character reads.", tones: ["distinct", "character", "memorable"] },
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
