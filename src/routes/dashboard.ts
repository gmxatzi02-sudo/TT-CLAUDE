import { Router } from 'express';
import { getCumulativeMetrics } from '../database.js';
import { getActiveSessionCount } from '../services/session.js';

const router = Router();

router.get('/', (_req, res) => {
  const metrics = getCumulativeMetrics();
  const activeSessions = getActiveSessionCount();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Taxi Translation Bridge • Admin</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .metric-value { font-variant-numeric: tabular-nums; }
  </style>
</head>
<body class="bg-zinc-950 text-zinc-200">
  <div class="max-w-5xl mx-auto p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div class="flex items-center gap-3">
        <div class="text-3xl">🚕</div>
        <div>
          <h1 class="text-2xl font-semibold tracking-tight">Taxi Translation Bridge</h1>
          <p class="text-sm text-zinc-500">Track A — Uncle Validation Phase</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <div class="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
          <div class="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
          <span class="text-emerald-400 text-sm font-medium">RUNNING</span>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- Cost Metrics -->
      <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div class="uppercase text-xs tracking-[1px] text-zinc-500 font-medium mb-2">Cumulative Cost</div>
        <div class="text-4xl font-semibold tabular-nums text-emerald-400 metric-value">
          $${metrics.totalCostUsd.toFixed(5)}
        </div>
        <div class="text-xs text-zinc-500 mt-1">USD (live pricing)</div>
      </div>

      <!-- Translation Count -->
      <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div class="uppercase text-xs tracking-[1px] text-zinc-500 font-medium mb-2">Translations Processed</div>
        <div class="text-4xl font-semibold tabular-nums text-white metric-value">
          ${metrics.totalTranslations.toLocaleString()}
        </div>
        <div class="text-xs text-zinc-500 mt-1">Total logged</div>
      </div>

      <!-- Active Sessions -->
      <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div class="uppercase text-xs tracking-[1px] text-zinc-500 font-medium mb-2">Active Sessions</div>
        <div class="text-4xl font-semibold tabular-nums text-white metric-value">
          ${activeSessions}
        </div>
        <div class="text-xs text-zinc-500 mt-1">In-memory (30 min TTL)</div>
      </div>
    </div>

    <!-- Integration Status -->
    <div class="mt-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div class="uppercase text-xs tracking-[1px] text-zinc-500 font-medium mb-4">System Status</div>
      
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-y-3 text-sm">
        <div class="flex items-center justify-between py-1 border-b border-zinc-800">
          <span class="text-zinc-400">Local HTTP Server</span>
          <span class="px-2.5 py-0.5 text-xs rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">ONLINE</span>
        </div>
        <div class="flex items-center justify-between py-1 border-b border-zinc-800">
          <span class="text-zinc-400">SQLite Metrics DB</span>
          <span class="px-2.5 py-0.5 text-xs rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">OPERATIONAL</span>
        </div>
        <div class="flex items-center justify-between py-1 border-b border-zinc-800">
          <span class="text-zinc-400">Evolution API Webhook</span>
          <span class="px-2.5 py-0.5 text-xs rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-medium">LISTENING</span>
        </div>
        <div class="flex items-center justify-between py-1 border-b border-zinc-800">
          <span class="text-zinc-400">In-Memory Sessions</span>
          <span class="px-2.5 py-0.5 text-xs rounded bg-sky-500/10 text-sky-400 border border-sky-500/30 font-medium">VOLATILE</span>
        </div>
      </div>
    </div>

    <div class="mt-8 text-center">
      <p class="text-xs text-zinc-600">Zero-Storage Policy enforced • No message content or PII persisted</p>
      <p class="text-[10px] text-zinc-700 mt-1">POST /webhook/evolution-webhook • GET /</p>
    </div>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

export default router;
