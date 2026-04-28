export const ACCENT_PRESETS = [
  { id: "neutral", label: "Neutral", instruction: "Use a neutral, globally understandable accent." },
  { id: "indian-english", label: "Indian English", instruction: "Use a clear Indian English accent with polished professional diction." },
  { id: "hindi-native", label: "Native Hindi", instruction: "Use natural native Hindi pronunciation and cadence." },
  { id: "north-indian", label: "North Indian", instruction: "Use a warm North Indian presentation style." },
  { id: "south-indian", label: "South Indian", instruction: "Use a clear South Indian English cadence." },
  { id: "american", label: "American", instruction: "Use a contemporary American accent." },
  { id: "british", label: "British", instruction: "Use a refined British accent." },
  { id: "australian", label: "Australian", instruction: "Use a relaxed Australian accent." },
] as const;

export const TONE_PRESETS = [
  { id: "natural", label: "Natural", instruction: "Sound natural and human, with realistic pauses." },
  { id: "studio-ad", label: "Studio Ad", instruction: "Deliver like a premium commercial voiceover." },
  { id: "explainer", label: "Explainer", instruction: "Speak clearly like a concise product explainer." },
  { id: "podcast", label: "Podcast", instruction: "Use an intimate, conversational podcast tone." },
  { id: "news", label: "News", instruction: "Read like a composed professional news anchor." },
  { id: "reel", label: "Social Reel", instruction: "Sound energetic, punchy, and creator-friendly." },
  { id: "meditation", label: "Meditation", instruction: "Speak softly, slowly, and calmly." },
  { id: "dramatic", label: "Dramatic", instruction: "Use dramatic emphasis and cinematic pacing." },
] as const;

export const PACE_PRESETS = [
  { id: "slow", label: "Slow", instruction: "Speak slowly with generous pauses." },
  { id: "steady", label: "Steady", instruction: "Use a steady medium pace." },
  { id: "fast", label: "Fast", instruction: "Speak quickly while staying clear." },
] as const;

export function getPresetInstruction<T extends readonly { id: string; instruction: string }[]>(
  presets: T,
  id: string,
) {
  return presets.find((preset) => preset.id === id)?.instruction;
}
