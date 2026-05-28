import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve data directory relative to project root
const DATA_DIR = path.join(__dirname, '../data');

export interface AppConfig {
  port: number;
  openaiApiKey: string;
  translationModel: 'gpt-4o-mini' | 'gpt-4o';
  evolutionApiUrl: string;
  evolutionApiKey: string;
  dataDir: string;
  dbPath: string;
  sessionTtlMs: number;
  sessionSweepIntervalMs: number;
  historyLimit: number;
  driverLanguage: string;   // Language the driver always speaks (default: el = Greek)
  driverJid: string;        // Driver's own WhatsApp JID for private translation notifications
  alwaysOnNumbers: Set<string>; // Numbers with translation ON by default
}

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

const translationModel = getOptionalEnv('TRANSLATION_MODEL', 'gpt-4o-mini') as AppConfig['translationModel'];
if (translationModel !== 'gpt-4o-mini' && translationModel !== 'gpt-4o') {
  throw new Error(`TRANSLATION_MODEL must be "gpt-4o-mini" or "gpt-4o", got: ${translationModel}`);
}

export const config: AppConfig = {
  port: parseInt(getOptionalEnv('PORT', '3000'), 10),
  openaiApiKey: getRequiredEnv('OPENAI_API_KEY'),
  translationModel,
  evolutionApiUrl: getOptionalEnv('EVOLUTION_API_URL', 'http://localhost:8080').replace(/\/$/, ''),
  evolutionApiKey: getRequiredEnv('EVOLUTION_API_KEY'),
  dataDir: DATA_DIR,
  dbPath: path.join(DATA_DIR, 'metrics.db'),
  sessionTtlMs: 30 * 60 * 1000,           // 30 minutes
  sessionSweepIntervalMs: 5 * 60 * 1000,  // 5 minutes
  historyLimit: 8,                        // Max conversation turns to keep in memory
  driverLanguage: getOptionalEnv('DRIVER_LANGUAGE', 'el'),
  driverJid: getOptionalEnv('DRIVER_JID', ''),
  alwaysOnNumbers: new Set(
    getOptionalEnv('TRANSLATION_ALWAYS_ON', '')
      .split(',')
      .map(n => n.trim())
      .filter(Boolean)
  ),
};

export default config;
