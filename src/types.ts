/**
 * Shared TypeScript interfaces for Taxi AI Translation Bridge
 */

export interface LogEntry {
  remoteJid: string;           // Full WhatsApp JID (e.g. "306912345678@s.whatsapp.net")
  direction: 'INCOMING' | 'OUTGOING';
  detectedLanguage: string;    // ISO 2-letter code
  modelUsed: string;
  promptTokens: number;
  completionTokens: number;
}

export interface TranslationResult {
  translation: string;
  detectedLanguage: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export interface Session {
  detectedLanguage: string;
  lastActivity: number;
  history: ChatMessage[];
  translationEnabled: boolean;
}

export interface WebhookPayload {
  event: string;
  instance: string;
  data: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      id?: string;
    };
    message?: {
      conversation?: string;
      extendedTextMessage?: {
        text?: string;
      };
    };
  };
}

export interface ProcessMessageParams {
  remoteJid: string;
  fromMe: boolean;
  text: string;
  instanceName: string;
}

export interface CumulativeMetrics {
  totalCostUsd: number;
  totalTranslations: number;
}
