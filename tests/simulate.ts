#!/usr/bin/env tsx
/**
 * CLI Simulation Tool for Taxi AI Translation Bridge
 *
 * Usage:
 *   npm run simulate
 *   npx tsx tests/simulate.ts "Hello, my flight QA321 landed early"
 *
 * This sends a fake "messages.upsert" payload to your local bridge
 * exactly as Evolution API would, without needing a real phone or WhatsApp.
 */
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT || 3000;
const WEBHOOK_URL = `http://localhost:${PORT}/webhook/evolution-webhook`;

async function simulateIncomingMessage(text: string, remoteJid = '306912345678@s.whatsapp.net') {
  console.log(`[SIMULATOR] → Sending tourist message: "${text}"`);
  console.log(`[SIMULATOR] → Target: ${WEBHOOK_URL}`);

  const payload = {
    event: 'messages.upsert',
    instance: process.env.EVOLUTION_INSTANCE_NAME || 'test-instance',
    data: {
      key: {
        remoteJid,
        fromMe: false,
        id: 'SIM_' + Date.now(),
      },
      message: {
        conversation: text,
      },
    },
  };

  try {
    const response = await axios.post(WEBHOOK_URL, payload, {
      timeout: 10000,
    });
    console.log('[SIMULATOR] ✓ Response:', response.data);
  } catch (err: any) {
    console.error('[SIMULATOR] ✗ Failed:', err.response?.data || err.message);
    process.exit(1);
  }
}

async function main() {
  const customText = process.argv[2];

  if (customText) {
    await simulateIncomingMessage(customText);
  } else {
    // Default realistic test message
    await simulateIncomingMessage(
      'Hello! My flight QA321 has landed early. Are you parked near Terminal 1 arrivals?'
    );
  }

  console.log('[SIMULATOR] Done. Check the dashboard at http://localhost:' + PORT);
}

main();
