import express from 'express';
import { config } from './config.js';
import webhookRouter from './routes/webhook.js';
import dashboardRouter from './routes/dashboard.js';
import apiRouter from './routes/api.js';

const app = express();

// Trust proxy if running behind Docker / reverse proxy (for IP logging if needed later)
app.set('trust proxy', 1);

// Body parser for JSON webhooks
app.use(express.json({ limit: '1mb' }));

// Mount routes
app.use('/webhook', webhookRouter);   // → /webhook/evolution-webhook
app.use('/', dashboardRouter);        // → /
app.use('/api', apiRouter);           // → /api/metrics

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'not_found' });
});

// Error handler (last resort)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[express] Unhandled error:', err);
  res.status(500).json({ error: 'internal_server_error' });
});

const server = app.listen(config.port, () => {
  console.log(`
🚕  Taxi AI Translation Bridge (Track A)
──────────────────────────────────────
Server running on     http://localhost:${config.port}
Dashboard             http://localhost:${config.port}/
Webhook endpoint      http://localhost:${config.port}/webhook/evolution-webhook
Metrics (JSON)        http://localhost:${config.port}/api/metrics
Model                 ${config.translationModel}
Zero-Storage Policy   ENFORCED
`);
});

process.on('SIGINT', () => {
  console.log('\n[shutdown] Graceful shutdown initiated...');
  server.close(() => {
    console.log('[shutdown] HTTP server closed.');
    process.exit(0);
  });
});

export default app;
