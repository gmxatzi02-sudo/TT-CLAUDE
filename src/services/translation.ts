import OpenAI from 'openai';
import { config } from '../config.js';
import { logTranslation } from '../database.js';
import type { TranslationResult, ChatMessage } from '../types.js';

const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

interface TranslateParams {
  text: string;
  direction: 'INCOMING' | 'OUTGOING';
  history: ChatMessage[];
  targetLang: string;
  remoteJid: string; // Required for correct anonymized logging
}

const SYSTEM_PROMPT = `You are an expert, real-time translator specializing in the Greek transportation and tourism domain.

Your sole task is to translate messages between a Greek taxi driver and a foreign tourist with maximum accuracy and natural tone.

Core Rules:
1. Maintain an exceptionally natural, polite, helpful, and professional tone appropriate for a hospitality service.
2. If the input is in Greek, translate it accurately to the passenger's language (target language code provided).
3. If the input is in a foreign language, translate it into clean, idiomatic Greek that a Greek taxi driver can quickly read and act upon.
4. Correct spelling mistakes, messy input, and bad grammar on the fly, but keep all original numbers, flight codes (e.g., "QA321"), times, and location landmarks unchanged.
5. Translate domain terms accurately:
   - "Arrivals gate" → "Πύλη αφίξεων"
   - "Terminal" → "Σταθμός / Terminal"
   - "Luggage" → "Αποσκευές"
   - "Check-in" → "Check-in"
   - "Baggage claim" → "Παραλαβή αποσκευών"
6. Output ONLY valid JSON with exactly two keys: "translation" (string) and "detectedLanguage" (string, ISO 2-letter code, e.g. "en", "de", "fr").
7. Never include markdown, code blocks, or any extra text outside the JSON object.`;

export async function translateText(params: TranslateParams): Promise<TranslationResult> {
  const model = config.translationModel;

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
  ];

  // Add conversation history for context (limited)
  for (const turn of params.history) {
    messages.push({
      role: turn.role,
      content: turn.text,
    });
  }

  // For outgoing (driver → tourist), explicitly tell the model which language to target.
  // For incoming (tourist → driver), the target is always Greek (el) per the system prompt.
  const userContent = params.direction === 'OUTGOING'
    ? `Translate to language code "${params.targetLang}":\n${params.text}`
    : params.text;

  messages.push({
    role: 'user',
    content: userContent,
  });

  const completion = await openai.chat.completions.create({
    model,
    messages,
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 500,
  });

  const rawContent = completion.choices[0]?.message?.content;
  if (!rawContent) {
    throw new Error('LLM returned an empty response.');
  }

  let parsed: { translation?: string; detectedLanguage?: string };
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    // Fallback: treat the whole response as the translation
    parsed = { translation: rawContent.trim(), detectedLanguage: params.targetLang };
  }

  const translation = (parsed.translation || '').trim();
  const detectedLanguage = (parsed.detectedLanguage || params.targetLang || 'en').toLowerCase();

  if (!translation) {
    throw new Error('LLM returned empty translation.');
  }

  // Log metrics (anonymized inside logTranslation)
  logTranslation({
    remoteJid: params.remoteJid,
    direction: params.direction,
    detectedLanguage,
    modelUsed: model,
    promptTokens: completion.usage?.prompt_tokens ?? 0,
    completionTokens: completion.usage?.completion_tokens ?? 0,
  });

  return {
    translation,
    detectedLanguage,
  };
}
