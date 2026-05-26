# 🌾 FarmLink — LINE-Native Smart Farming Platform

> The AI farm assistant inside LINE for Thailand and Southeast Asia.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Farmer                               │
│                    (uses LINE daily)                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                    ┌────▼─────┐
                    │  LINE    │  Chat, Flex Cards, Rich Menu
                    │  App     │  Quick Replies, Notifications
                    └────┬─────┘
                         │ LIFF
              ┌──────────▼──────────┐
              │   LIFF Mini App     │  React + Next.js PWA
              │   (apps/liff)       │  MapLibre + Dexie.js
              │                     │  Offline-first scouting
              └──────────┬──────────┘
                         │ REST API
         ┌───────────────┼────────────────┐
         │               │                │
    ┌────▼────┐    ┌─────▼─────┐   ┌──────▼──────┐
    │ LINE    │    │ REST API  │   │ AI Engine   │
    │ Bot     │    │ (apps/api)│   │ (ai-engine) │
    │ NestJS  │    │ NestJS    │   │ Python      │
    └────┬────┘    └─────┬─────┘   └──────┬──────┘
         │               │                │
         └───────────────▼────────────────┘
                         │
              ┌──────────▼──────────┐
              │   Supabase          │
              │   PostgreSQL        │  PostGIS for farm geometry
              │   + PostGIS         │  RLS for data security
              └─────────────────────┘
                         │
              ┌──────────▼──────────┐
              │   AWS S3            │  Photos, satellite images
              │   (LocalStack dev)  │  Presigned URL uploads
              └─────────────────────┘
```

## Project Structure

```
farmlink/
├── apps/
│   ├── bot/          # LINE Bot — NestJS webhook + conversation flows
│   ├── api/          # REST API — NestJS (farms, sync, satellite, uploads)
│   ├── liff/         # LIFF Mini App — Next.js PWA (map, scouting, harvest)
│   └── ai-engine/    # AI Service — Python FastAPI (NDVI, anomaly detection)
├── packages/
│   ├── shared-types/ # TypeScript types shared across all apps
│   └── database/     # Supabase client + SQL migrations
└── infrastructure/
    ├── docker-compose.yml    # Redis + LocalStack
    └── localstack/           # S3 bucket initialization
```

---

## Quick Start

### 1. Prerequisites

- Node.js ≥ 20
- Python ≥ 3.11
- Docker Desktop
- A free [Supabase](https://supabase.com) project

### 2. Clone and install

```bash
git clone <your-repo>
cd farmlink
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env with your Supabase URL, anon key, and service role key
```

### 4. Start infrastructure (Redis + LocalStack S3)

```bash
npm run infra:up
# Wait ~30 seconds for LocalStack to initialize
```

### 5. Run database migrations

Go to your [Supabase SQL Editor](https://supabase.com/dashboard) and run these files in order:

1. `packages/database/src/migrations/001_extensions.sql`
2. `packages/database/src/migrations/002_core_schema.sql`
3. `packages/database/src/migrations/003_functions.sql`

### 6. Start all services

```bash
# Terminal 1 — LINE Bot (port 3000)
cd apps/bot && npm run dev

# Terminal 2 — REST API (port 3001)
cd apps/api && npm run dev

# Terminal 3 — LIFF Mini App (port 3002)
cd apps/liff && npm run dev

# Terminal 4 — AI Engine (port 8000)
cd apps/ai-engine
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python main.py
```

Or with Turborepo (all at once):
```bash
npm run dev
```

### 7. Open the LIFF app

Visit [http://localhost:3002](http://localhost:3002) — the app runs in mock mode without LINE credentials.

---

## LINE Bot Setup (when ready for real testing)

1. Create a [LINE Messaging API channel](https://developers.line.biz/console/)
2. Set credentials in `.env`:
   ```
   LINE_CHANNEL_ID=...
   LINE_CHANNEL_SECRET=...
   LINE_CHANNEL_ACCESS_TOKEN=...
   LINE_MOCK_MODE=false
   ```
3. Expose the bot publicly with [ngrok](https://ngrok.com/):
   ```bash
   ngrok http 3000
   # Copy the HTTPS URL
   ```
4. Set webhook URL in LINE Developer Console:
   `https://your-ngrok-url.ngrok.io/webhook`
5. Enable "Use webhook" in the channel settings

---

## LIFF App Setup (for LINE embedding)

1. Create a LIFF app in LINE Developer Console
2. Set URL: `https://your-deployed-liff-url.com`
3. Add to `.env`:
   ```
   LINE_LIFF_ID=...
   NEXT_PUBLIC_LIFF_ID=...
   ```

---

## Key Features

### Offline-First Architecture
The LIFF app stores all data locally in IndexedDB (Dexie.js) first, then syncs to the server via `POST /api/sync`. This means:
- **Farmers can scout fields with no internet** — data is saved locally
- **Background sync** fires automatically when connectivity returns
- **All map tiles** are cached by the Service Worker

### Satellite Analysis Pipeline
```
Cron trigger → AI Engine → Sentinel Hub API → NDVI computation →
Anomaly detection → S3 image upload → Supabase storage →
LINE notification push to farmer
```

### Human-in-the-Loop Training
Every AI anomaly detection asks the farmer:
- "Do you see this problem?" → Yes / No / Unsure
- Confirmation + photo = labeled training data
- Stored in `anomaly_alerts.farmer_confirmed`

### PostGIS Spatial Data
Farm boundaries are stored as `GEOMETRY(Polygon, 4326)` in PostgreSQL.
Key queries:
```sql
-- Find farms in a map viewport
SELECT * FROM get_farms_in_bbox(min_lng, min_lat, max_lng, max_lat);

-- Auto-calculate area on polygon save
-- (Trigger: calculate_farm_area)
```

---

## API Reference

Swagger docs available at: `http://localhost:3001/api/docs`

Key endpoints:
```
POST /api/farms              Create farm
GET  /api/farms/:id/health   Farm health summary
POST /api/sync               Batch sync offline data  ← Main sync endpoint
POST /api/upload/presign     Get S3 presigned URL
POST /api/satellite/farm/:id/analyze  Trigger satellite analysis
```

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | ✅ | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | ✅ | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (server-side only) |
| `LINE_CHANNEL_SECRET` | For production | LINE channel secret for webhook verification |
| `LINE_CHANNEL_ACCESS_TOKEN` | For production | LINE messaging API token |
| `LINE_LIFF_ID` | For LINE embedding | LIFF app ID |
| `LINE_MOCK_MODE` | Optional | Set `false` for production |
| `AWS_ENDPOINT_URL` | Dev only | LocalStack URL (`http://localhost:4566`) |
| `SENTINEL_HUB_CLIENT_ID` | For real satellite | Sentinel Hub credentials |

---

## Roadmap

### MVP (Current)
- [x] LINE Bot onboarding
- [x] Flex Message alerts
- [x] LIFF map with polygon drawing
- [x] Offline scouting with Dexie.js
- [x] Background sync engine
- [x] Satellite NDVI analysis (stub + real)
- [x] Anomaly detection + farmer feedback loop
- [x] Harvest logging
- [x] S3 photo storage

### Phase 2
- [ ] NDVI time-series charts in LIFF
- [ ] Weather data integration (Open-Meteo)
- [ ] Push notifications (independent of LINE)
- [ ] Multi-language support (EN, Myanmar, Khmer)
- [ ] Farm comparison dashboard

### Phase 3
- [ ] AI disease classification from field photos
- [ ] Yield prediction model
- [ ] Irrigation optimization recommendations
- [ ] Cooperative farm network features

---

## Tech Stack

| Layer | Technology |
|---|---|
| LINE Bot | NestJS + @line/bot-sdk |
| LIFF App | Next.js 14 + React 18 + TypeScript |
| Maps | MapLibre GL JS (free, open-source) |
| Offline DB | Dexie.js (IndexedDB) |
| PWA | Service Worker (custom) |
| REST API | NestJS + Swagger |
| Database | Supabase (PostgreSQL + PostGIS) |
| Auth | Supabase Auth + LINE LIFF JWT |
| File Storage | AWS S3 (LocalStack for dev) |
| AI Engine | Python FastAPI + NumPy + Pillow |
| Satellite | Sentinel Hub API (stub mode by default) |
| Infrastructure | Docker Compose (Redis + LocalStack) |
| Monorepo | npm workspaces + Turborepo |

---

Built with ❤️ for Thai farmers.
