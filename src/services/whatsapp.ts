import axios from 'axios';
import { config } from '../config.js';

interface SendMessageOptions {
  delay?: number;
  presence?: 'composing' | 'available';
}

export async function sendWhatsAppMessage(
  instanceName: string,
  remoteJid: string,
  text: string,
  options: SendMessageOptions = {}
): Promise<void> {
  const number = remoteJid.split('@')[0];
  const url = `${config.evolutionApiUrl}/message/sendText/${instanceName}`;

  const payload = {
    number,
    text,
    options: {
      delay: options.delay ?? 1200,
      presence: options.presence ?? 'composing',
    },
  };

  try {
    await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        apikey: config.evolutionApiKey,
      },
      timeout: 15000,
    });
  } catch (error: any) {
    console.error(
      `[whatsapp] Failed to send message to ${number}: ${error?.response?.data?.message || error.message}`
    );
    // Non-fatal: do not crash the processing pipeline
  }
}
