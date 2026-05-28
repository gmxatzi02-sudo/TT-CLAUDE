import Database from 'better-sqlite3';
import crypto from 'crypto';
import { config } from './config.js';
import type { LogEntry, CumulativeMetrics } from './types.js';

const db = new Database(config.dbPath);

// Initialize schema on startup (idempotent)
db.exec(`
  CREATE TABLE IF NOT EXISTS translation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_hash TEXT NOT NULL,
    direction TEXT NOT NULL,
    detected_language TEXT,
    model_used TEXT NOT NULL,
    prompt_tokens INTEGER NOT NULL,
    completion_tokens INTEGER NOT NULL,
    computed_cost_usd REAL NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_logs_created_at ON translation_logs(created_at);
  CREATE INDEX IF NOT EXISTS idx_logs_session ON translation_logs(session_hash);
`);

// Pricing table (per 1M tokens, converted to per-token rates)
const PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': {
    input: 0.000150 / 1000,
    output: 0.000600 / 1000,
  },
  'gpt-4o': {
    input: 0.002500 / 1000,
    output: 0.010000 / 1000,
  },
};

function getPricing(model: string) {
  return PRICING[model] ?? PRICING['gpt-4o-mini'];
}

export function logTranslation(entry: LogEntry): void {
  // Anonymize the phone number using SHA-256 (Zero-Storage Policy)
  const sessionHash = crypto
    .createHash('sha256')
    .update(entry.remoteJid)
    .digest('hex');

  const pricing = getPricing(entry.modelUsed);
  const cost =
    entry.promptTokens * pricing.input +
    entry.completionTokens * pricing.output;

  const stmt = db.prepare(`
    INSERT INTO translation_logs (
      session_hash, direction, detected_language, model_used,
      prompt_tokens, completion_tokens, computed_cost_usd
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    sessionHash,
    entry.direction,
    entry.detectedLanguage,
    entry.modelUsed,
    entry.promptTokens,
    entry.completionTokens,
    cost
  );
}

export function getCumulativeMetrics(): CumulativeMetrics {
  const totalCostRow = db
    .prepare('SELECT SUM(computed_cost_usd) as total FROM translation_logs')
    .get() as { total: number | null };

  const countRow = db
    .prepare('SELECT COUNT(*) as count FROM translation_logs')
    .get() as { count: number };

  return {
    totalCostUsd: totalCostRow.total ?? 0,
    totalTranslations: countRow.count,
  };
}

export function closeDatabase(): void {
  db.close();
}
