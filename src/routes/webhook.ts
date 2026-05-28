import { Router, type Request, type Response } from 'express';
import { handleMessageUpsert } from '../services/session.js';
import type { WebhookPayload } from '../types.js';

const router = Router();

/**
 * Evolution API webhook endpoint.
 * Listens for "messages.upsert" events.
 */
router.post('/evolution-webhook', async (req: Request, res: Response) => {
  try {
    const body = req.body as WebhookPayload;

    // Only process real message upserts
    if (body.event !== 'messages.upsert') {
      return res.status(200).json({ status: 'ignored_event' });
    }

    const data = body.data;
    if (!data?.key?.remoteJid) {
      return res.status(200).json({ status: 'no_remote_jid' });
    }

    const remoteJid = data.key.remoteJid;
    const fromMe = data.key.fromMe ?? false;

    // Reject group messages (we only handle 1:1 chats)
    if (remoteJid.endsWith('@g.us')) {
      return res.status(200).json({ status: 'ignored_group_message' });
    }



    // Extract text content (supports both plain and extended text messages)
    const message = data.message;
    const textContent =
      message?.conversation?.trim() ||
      message?.extendedTextMessage?.text?.trim() ||
      '';

    if (!textContent) {
      return res.status(200).json({ status: 'no_text_content' });
    }

    // Fire-and-forget the translation pipeline (non-blocking)
    handleMessageUpsert({
      remoteJid,
      fromMe,
      text: textContent,
      instanceName: body.instance,
    }).catch((err) => {
      console.error('[webhook] Pipeline error:', err);
    });

    // Immediate ACK so Evolution API doesn't retry
    return res.status(200).json({ status: 'acknowledged' });
  } catch (error) {
    console.error('[webhook] Unexpected error:', error);
    // Still return 200 to prevent Evolution from hammering us on transient bugs
    return res.status(200).json({ status: 'error_but_acknowledged' });
  }
});

export default router;
