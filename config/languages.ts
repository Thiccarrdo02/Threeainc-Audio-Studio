import type { LanguageOption } from "@/types/tts";

const language = (
  id: string,
  label: string,
  providerValue: string,
  region: LanguageOption["region"],
  featured = false,
): LanguageOption => ({ id, label, providerValue, region, featured });

export const MVP_LANGUAGES: readonly LanguageOption[] = [
  { id: "auto", label: "Auto-detect", region: "Global", featured: true },
  language("en-IN", "English (India)", "English (India)", "India", true),
  language("hi-IN", "Hindi (India)", "Hindi (India)", "India", true),
  language("mr-IN", "Marathi (India)", "Marathi (India)", "India", true),
  language("ta-IN", "Tamil (India)", "Tamil (India)", "India", true),
  language("te-IN", "Telugu (India)", "Telugu (India)", "India", true),
  language("gu-IN", "Gujarati (India)", "Gujarati (India)", "India", true),
  language("kn-IN", "Kannada (India)", "Kannada (India)", "India", true),
  language("ml-IN", "Malayalam (India)", "Malayalam (India)", "India", true),
  language("pa-IN", "Punjabi (India)", "Punjabi (India)", "India", true),
  language("bn-BD", "Bangla (Bangladesh)", "Bangla (Bangladesh)", "Asia"),
  language("en-US", "English (US)", "English (US)", "Americas", true),
  language("en-UK", "English (UK)", "English (UK)", "Europe"),
  language("en-AU", "English (Australia)", "English (Australia)", "Asia"),
  language("ar-EG", "Arabic (Egypt)", "Arabic (Egypt)", "Africa"),
  language("ar-world", "Arabic (World)", "Arabic (World)", "Global"),
  language("nl-NL", "Dutch (Netherlands)", "Dutch (Netherlands)", "Europe"),
  language("fr-FR", "French (France)", "French (France)", "Europe"),
  language("fr-CA", "French (Canada)", "French (Canada)", "Americas"),
  language("de-DE", "German (Germany)", "German (Germany)", "Europe"),
  language("id-ID", "Indonesian (Indonesia)", "Indonesian (Indonesia)", "Asia"),
  language("it-IT", "Italian (Italy)", "Italian (Italy)", "Europe"),
  language("ja-JP", "Japanese (Japan)", "Japanese (Japan)", "Asia"),
  language("ko-KR", "Korean (South Korea)", "Korean (South Korea)", "Asia"),
  language("pl-PL", "Polish (Poland)", "Polish (Poland)", "Europe"),
  language("pt-BR", "Portuguese (Brazil)", "Portuguese (Brazil)", "Americas"),
  language("pt-PT", "Portuguese (Portugal)", "Portuguese (Portugal)", "Europe"),
  language("ro-RO", "Romanian (Romania)", "Romanian (Romania)", "Europe"),
  language("ru-RU", "Russian (Russia)", "Russian (Russia)", "Europe"),
  language("es-ES", "Spanish (Spain)", "Spanish (Spain)", "Europe"),
  language("es-MX", "Spanish (Mexico)", "Spanish (Mexico)", "Americas"),
  language("es-LA", "Spanish (Latin America)", "Spanish (Latin America)", "Americas"),
  language("th-TH", "Thai (Thailand)", "Thai (Thailand)", "Asia"),
  language("tr-TR", "Turkish (Turkey)", "Turkish (Turkey)", "Asia"),
  language("uk-UA", "Ukrainian (Ukraine)", "Ukrainian (Ukraine)", "Europe"),
  language("vi-VN", "Vietnamese (Vietnam)", "Vietnamese (Vietnam)", "Asia"),
  language("af-ZA", "Afrikaans (South Africa)", "Afrikaans (South Africa)", "Africa"),
  language("sq-AL", "Albanian (Albania)", "Albanian (Albania)", "Europe"),
  language("am-ET", "Amharic (Ethiopia)", "Amharic (Ethiopia)", "Africa"),
  language("hy-AM", "Armenian (Armenia)", "Armenian (Armenia)", "Asia"),
  language("az-AZ", "Azerbaijani (Azerbaijan)", "Azerbaijani (Azerbaijan)", "Asia"),
  language("eu-ES", "Basque (Spain)", "Basque (Spain)", "Europe"),
  language("be-BY", "Belarusian (Belarus)", "Belarusian (Belarus)", "Europe"),
  language("bg-BG", "Bulgarian (Bulgaria)", "Bulgarian (Bulgaria)", "Europe"),
  language("my-MM", "Burmese (Myanmar)", "Burmese (Myanmar)", "Asia"),
  language("ca-ES", "Catalan (Spain)", "Catalan (Spain)", "Europe"),
  language("ceb-PH", "Cebuano (Philippines)", "Cebuano (Philippines)", "Asia"),
  language("cmn-CN", "Chinese Mandarin (China)", "Chinese Mandarin (China)", "Asia"),
  language("cmn-TW", "Chinese Mandarin (Taiwan)", "Chinese Mandarin (Taiwan)", "Asia"),
  language("hr-HR", "Croatian (Croatia)", "Croatian (Croatia)", "Europe"),
  language("cs-CZ", "Czech (Czech Republic)", "Czech (Czech Republic)", "Europe"),
  language("da-DK", "Danish (Denmark)", "Danish (Denmark)", "Europe"),
  language("et-EE", "Estonian (Estonia)", "Estonian (Estonia)", "Europe"),
  language("fil-PH", "Filipino (Philippines)", "Filipino (Philippines)", "Asia"),
  language("fi-FI", "Finnish (Finland)", "Finnish (Finland)", "Europe"),
  language("gl-ES", "Galician (Spain)", "Galician (Spain)", "Europe"),
  language("ka-GE", "Georgian (Georgia)", "Georgian (Georgia)", "Asia"),
  language("el-GR", "Greek (Greece)", "Greek (Greece)", "Europe"),
  language("ht-HT", "Haitian Creole (Haiti)", "Haitian Creole (Haiti)", "Americas"),
  language("he-IL", "Hebrew (Israel)", "Hebrew (Israel)", "Asia"),
  language("hu-HU", "Hungarian (Hungary)", "Hungarian (Hungary)", "Europe"),
  language("is-IS", "Icelandic (Iceland)", "Icelandic (Iceland)", "Europe"),
  language("jv-ID", "Javanese (Java)", "Javanese (Java)", "Asia"),
  language("kok-IN", "Konkani (India)", "Konkani (India)", "India"),
  language("lo-LA", "Lao (Laos)", "Lao (Laos)", "Asia"),
  language("la-VA", "Latin (Vatican City)", "Latin (Vatican City)", "Europe"),
  language("lv-LV", "Latvian (Latvia)", "Latvian (Latvia)", "Europe"),
  language("lt-LT", "Lithuanian (Lithuania)", "Lithuanian (Lithuania)", "Europe"),
  language("lb-LU", "Luxembourgish (Luxembourg)", "Luxembourgish (Luxembourg)", "Europe"),
  language("mk-MK", "Macedonian (North Macedonia)", "Macedonian (North Macedonia)", "Europe"),
  language("mai-IN", "Maithili (India)", "Maithili (India)", "India"),
  language("mg-MG", "Malagasy (Madagascar)", "Malagasy (Madagascar)", "Africa"),
  language("ms-MY", "Malay (Malaysia)", "Malay (Malaysia)", "Asia"),
  language("mn-MN", "Mongolian (Mongolia)", "Mongolian (Mongolia)", "Asia"),
  language("ne-NP", "Nepali (Nepal)", "Nepali (Nepal)", "Asia"),
  language("nb-NO", "Norwegian Bokmal (Norway)", "Norwegian Bokmal (Norway)", "Europe"),
  language("nn-NO", "Norwegian Nynorsk (Norway)", "Norwegian Nynorsk (Norway)", "Europe"),
  language("or-IN", "Odia (India)", "Odia (India)", "India"),
  language("ps-AF", "Pashto (Afghanistan)", "Pashto (Afghanistan)", "Asia"),
  language("fa-IR", "Persian (Iran)", "Persian (Iran)", "Asia"),
  language("sr-RS", "Serbian (Serbia)", "Serbian (Serbia)", "Europe"),
  language("sd-IN", "Sindhi (India)", "Sindhi (India)", "India"),
  language("si-LK", "Sinhala (Sri Lanka)", "Sinhala (Sri Lanka)", "Asia"),
  language("sk-SK", "Slovak (Slovakia)", "Slovak (Slovakia)", "Europe"),
  language("sl-SI", "Slovenian (Slovenia)", "Slovenian (Slovenia)", "Europe"),
  language("sw-KE", "Swahili (Kenya)", "Swahili (Kenya)", "Africa"),
  language("sv-SE", "Swedish (Sweden)", "Swedish (Sweden)", "Europe"),
  language("ur-PK", "Urdu (Pakistan)", "Urdu (Pakistan)", "Asia"),
] as const;

export const INDIAN_LANGUAGE_IDS = MVP_LANGUAGES
  .filter((language) => language.region === "India")
  .map((language) => language.id);
export const MVP_LANGUAGE_IDS = MVP_LANGUAGES.map((language) => language.id);
export const MVP_LANGUAGE_PROVIDER_VALUES = MVP_LANGUAGES.flatMap((language) =>
  language.providerValue ? [language.providerValue] : [],
);

export function isLanguageSupported(value: string): boolean {
  return (
    value === "" ||
    MVP_LANGUAGE_IDS.includes(value) ||
    MVP_LANGUAGE_PROVIDER_VALUES.includes(value)
  );
}

export function toProviderLanguageCode(value?: string): string | undefined {
  if (!value || value === "auto") {
    return undefined;
  }

  const byId = MVP_LANGUAGES.find((language) => language.id === value);
  return byId?.providerValue ?? value;
}
