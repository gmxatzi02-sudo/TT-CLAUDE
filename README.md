# Taxi AI Translation Bridge (Track A)

Real-time WhatsApp translation bridge for Greek taxi drivers and foreign tourists.

**Uncle Validation Phase** — local deployment with strict Zero-Storage Policy.

## Overview

This application acts as a transparent, low-latency translation layer between a Greek-speaking taxi driver ("Uncle") and non-Greek-speaking passengers using WhatsApp.

- Incoming tourist messages → automatically translated to Greek and shown to the driver with a `🤖 [Μετάφραση]` prefix.
- Outgoing driver replies (in Greek) → automatically translated back to the tourist's detected language.
- **Zero persistent storage** of message content or passenger identity. Only anonymized token usage and cost metrics are kept in a local SQLite database.

## Technology Stack

- Node.js 20+ + TypeScript (ESM)
- Express (webhook + dashboard)
- SQLite via `better-sqlite3`
- OpenAI (`gpt-4o-mini` / `gpt-4o`) for translation + structured JSON mode
- Evolution API (v2) for WhatsApp connectivity (local Docker)

## Project Structure

```
uncle-validation/          # (this repository root)
├── src/
│   ├── index.ts
│   ├── config.ts
│   ├── database.ts
│   ├── types.ts
│   ├── routes/
│   │   ├── webhook.ts
│   │   ├── dashboard.ts
│   │   └── api.ts
│   └── services/
│       ├── session.ts
│       ├── translation.ts
│       └── whatsapp.ts
├── tests/
│   └── simulate.ts
├── data/
│   └── metrics.db         # gitignored
├── package.json
├── tsconfig.json
└── README.md
```

## Quick Start

### 1. Prerequisites

- Node.js 20+
- Docker + Docker Compose (for local Evolution API — see separate setup)
- OpenAI API key

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

```env
OPENAI_API_KEY=sk-...
EVOLUTION_API_KEY=your-evolution-key
EVOLUTION_API_URL=http://localhost:8080
```

### 4. Run the Bridge (Development)

```bash
npm run dev
```

The local dashboard will be available at:  
**http://localhost:3000**

---

## Docker Setup for Evolution API (Required for Real WhatsApp)

The bridge talks to WhatsApp through a local **Evolution API v2** instance. We provide a ready-to-use `docker-compose.yml`.

### Step-by-step

1. **Start the Evolution stack**

```bash
# Copy and customize the Evolution environment
cp evolution.env.example evolution.env

# IMPORTANT: Edit evolution.env and change these values:
# - GLOBAL_API_KEY (make it long and random)
# - POSTGRES_PASSWORD in docker-compose.yml or evolution.env
```

2. **Launch the containers**

```bash
docker compose up -d
```

3. **Wait for startup** (≈ 30–60 seconds), then check logs:

```bash
docker compose logs -f evolution-api
```

Look for a line containing the generated API key (it is also exposed as `GLOBAL_API_KEY`).

4. **Copy the key** into your main `.env` file:

```env
EVOLUTION_API_KEY=the_key_you_just_copied
EVOLUTION_API_URL=http://localhost:8080
```

5. **Access the Manager UI** (optional but very helpful)

Open http://localhost:3001

Here you can:
- Create a new WhatsApp instance
- Scan the QR code with the driver’s phone
- Monitor connection status

Once the instance shows as "connected", the bridge can send and receive real WhatsApp messages.

### Stopping / Resetting Evolution

```bash
docker compose down -v          # removes volumes (resets everything)
docker compose down             # keeps WhatsApp session data
```

---

## Obtaining the Required Keys

| Key                        | Where to get it                                                                 | Required for |
|---------------------------|----------------------------------------------------------------------------------|--------------|
| `OPENAI_API_KEY`          | https://platform.openai.com/api-keys                                             | All translation (mandatory) |
| `EVOLUTION_API_KEY`       | Generated on first start of the Docker stack (see above)                         | Real WhatsApp (mandatory) |
| `EVOLUTION_API_URL`       | Usually `http://localhost:8080` after `docker compose up`                        | Real WhatsApp |

**For pure simulation testing** you only need a valid OpenAI key. The simulator does not require Evolution API.

### 5. Test Without a Phone (Recommended)

```bash
npm run simulate
# or with custom text:
npm run simulate "Hello, my flight has landed. Where are you?"
```

You can also send this from the driver's phone while the bridge is running:

```
/simulate Hello my flight QA321 landed 20 minutes early
```

## Webhook Contract

- **Endpoint**: `POST /webhook/evolution-webhook`
- Expects Evolution API `messages.upsert` events
- Fast 200 ACK to prevent retries
- Group chats (`@g.us`) are automatically ignored

## Zero-Storage Policy (Strictly Enforced)

- No raw message text, names, or phone numbers are ever written to disk.
- Only a SHA-256 hash of the remote JID is stored for cost aggregation.
- All conversation context lives exclusively in volatile RAM (30-minute TTL).
- The local SQLite file (`data/metrics.db`) contains **only**:
  - Token counts
  - Model used
  - Computed USD cost
  - Direction + detected language

## Cost Tracking & Dashboard

The dashboard shows live cumulative cost and translation volume. Pricing is applied at write time using the rates for the active model.

## Production Build

```bash
npm run build
npm start
```

## Scripts

| Command            | Description                              |
|--------------------|------------------------------------------|
| `npm run dev`      | Run with tsx (hot reload)                |
| `npm run build`    | Compile TypeScript to `dist/`            |
| `npm run start`    | Run production build                     |
| `npm run simulate` | Send test payload to local instance      |
| `npm run lint`     | Type-check only (no emit)                |
| `npm run clean`    | Remove dist + metrics.db                 |

## Security & Privacy Notes

- Never commit `.env`, `evolution.env`, or `data/metrics.db`
- The `/simulate` command is deliberately only processed when `fromMe === true` (driver-initiated)
- All LLM calls use `temperature: 0.1` and strict JSON mode for deterministic output
- WhatsApp session folders are persisted in the `evolution_instances` Docker volume

## Troubleshooting Common Failure Points

See the section below for detailed failure modes when running without proper keys or Docker.

## Next Steps (Track B / Production)

- Docker Compose for Evolution API + this bridge
- Health checks + Prometheus metrics export
- Optional fallback model routing (mini vs full)
- Multi-instance support + instance affinity

---

**Implemented from the official Technical Specification (Track A).**
