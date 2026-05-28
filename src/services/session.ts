import { config } from '../config.js';
import { translateText } from './translation.js';
import { sendWhatsAppMessage } from './whatsapp.js';
import type { Session, ProcessMessageParams } from '../types.js';

// Thread-safe in-memory session store (volatile RAM only)
const activeSessions = new Map<string, Session>();

// Background TTL sweeper
setInterval(() => {
  const now = Date.now();
  let evicted = 0;
  for (const [jid, session] of activeSessions.entries()) {
    if (now - session.lastActivity > config.sessionTtlMs) {
      activeSessions.delete(jid);
      evicted++;
    }
  }
  if (evicted > 0) {
    console.log(`[session] Evicted ${evicted} expired session(s)`);
  }
}, config.sessionSweepIntervalMs);

function getOrCreateSession(remoteJid: string): Session {
  let session = activeSessions.get(remoteJid);
  if (!session) {
    session = {
      detectedLanguage: 'en',
      lastActivity: Date.now(),
      history: [],
      translationEnabled: true,
    };
    activeSessions.set(remoteJid, session);
  } else {
    session.lastActivity = Date.now();
  }
  return session;
}

function appendToHistory(session: Session, role: 'user' | 'assistant', text: string) {
  session.history.push({ role, text });
  // Keep sliding window limited
  while (session.history.length > config.historyLimit) {
    session.history.shift();
  }
}

interface PipelineParams extends ProcessMessageParams {
  session: Session;
}

async function processTranslationPipeline(params: PipelineParams): Promise<void> {
  const { remoteJid, fromMe, text, session, instanceName } = params;

  if (!fromMe) {
    // === INCOMING: Tourist → Driver (foreign language → driver's language) ===
    const result = await translateText({
      text,
      direction: 'INCOMING',
      history: session.history,
      targetLang: config.driverLanguage,
      remoteJid,
    });

    // Update detected language for future outgoing translations
    session.detectedLanguage = result.detectedLanguage || 'en';

    // Store context (original + translation)
    appendToHistory(session, 'user', `Passenger: ${text}`);
    appendToHistory(session, 'assistant', `Translation: ${result.translation}`);

    // Send translation inline into the tourist's chat — both phones see it.
    const driverMessage = `🤖 ${text}\n→ ${result.translation}`;
    await sendWhatsAppMessage(instanceName, remoteJid, driverMessage);
  } else {
    // === OUTGOING: Driver → Tourist (Greek → detected language) ===
    // Ignore our own injected translation messages to prevent loops
    if (text.trim().startsWith('🤖') || text.trim().startsWith('📨') || text.trim().startsWith('🌐')) {
      return;
    }

    const targetLang = session.detectedLanguage || 'en';

    const result = await translateText({
      text,
      direction: 'OUTGOING',
      history: session.history,
      targetLang,
      remoteJid,
    });

    appendToHistory(session, 'user', `Driver: ${text}`);
    appendToHistory(session, 'assistant', `Translation: ${result.translation}`);

    // Send translation to tourist — prefixed so Uncle can distinguish it from his own typed messages
    await sendWhatsAppMessage(instanceName, remoteJid, `🌐 ${result.translation}`);
  }
}

/**
 * Main entry point called by the webhook router.
 * Handles both real messages and the special /simulate command.
 */
export async function handleMessageUpsert(msg: ProcessMessageParams): Promise<void> {
  const session = getOrCreateSession(msg.remoteJid);

  // === Driver-only control commands (fromMe only) ===
  if (msg.fromMe) {
    const cmd = msg.text.trim().toLowerCase();

    if (cmd === '!off') {
      session.translationEnabled = false;
      await sendWhatsAppMessage(msg.instanceName, msg.remoteJid, '🔕 Translation OFF for this chat.');
      console.log(`[session] Translation disabled for ${msg.remoteJid}`);
      return;
    }

    if (cmd === '!on') {
      session.translationEnabled = true;
      await sendWhatsAppMessage(msg.instanceName, msg.remoteJid, '🔔 Translation ON for this chat.');
      console.log(`[session] Translation enabled for ${msg.remoteJid}`);
      return;
    }

    if (cmd === '!status') {
      const state = session.translationEnabled ? '🟢 ON' : '🔴 OFF';
      const lang = session.detectedLanguage.toUpperCase();
      await sendWhatsAppMessage(msg.instanceName, msg.remoteJid, `Translation: ${state} | Tourist language: ${lang} | Driver language: ${config.driverLanguage.toUpperCase()}`);
      return;
    }

    if (cmd === '!help') {
      await sendWhatsAppMessage(msg.instanceName, msg.remoteJid,
        '📖 Commands:\n!on – enable translation\n!off – pause translation\n!status – show current state\n/simulate <text> – test tourist message'
      );
      return;
    }

    // Simulation hook: /simulate Hello my flight landed
    if (msg.text.startsWith('/simulate ')) {
      const simulationText = msg.text.replace('/simulate ', '').trim();
      if (!simulationText) return;
      console.log(`[session] Simulation triggered for ${msg.remoteJid}: "${simulationText}"`);
      await processTranslationPipeline({
        remoteJid: msg.remoteJid,
        fromMe: false,
        text: simulationText,
        session,
        instanceName: msg.instanceName,
      });
      return;
    }
  }

  // Skip translation if disabled for this chat
  if (!session.translationEnabled) return;

  await processTranslationPipeline({
    remoteJid: msg.remoteJid,
    fromMe: msg.fromMe,
    text: msg.text,
    session,
    instanceName: msg.instanceName,
  });
}

// For debugging / health checks
export function getActiveSessionCount(): number {
  return activeSessions.size;
}
