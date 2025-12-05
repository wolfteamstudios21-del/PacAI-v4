# PacAI v4/v5: Offline-First AI World Generator

PacAI is an AI-powered tool for generating immersive, procedural worlds—think customizable simulations for games, stories, or education. It emphasizes **offline-first** operation: users create/export worlds locally, with optional cloud sync for collaboration. Core features include a simulation engine (PacCore), live editing, tiered exports (free/basic/pro), and secure air-gapped deployments.

**v4** focuses on core API and backend stability. **v5** layers in advanced security (e.g., HSM-based licensing, RBAC, Ed25519 signatures). Deployable to Vercel for web access, with Rust for heavy lifting.

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/wolfteamstudios21-del/PacAI-v4.git
cd PacAI-v4

# Install dependencies
npm install

# Generate dev keys (see Security section)
./tools/generate_dev_keys.sh

# Run local dev server
npm run dev
# → App runs on http://localhost:5000

# Deploy to Vercel
# Push to main branch; Vercel auto-deploys (see vercel.json)
```

---

## Architecture Overview (v4 Target)

### Frontend
- **Next.js / React Dashboard**: Auth screens, live editor, export flows, project management
- **Export UI**: 9-engine selector (UE5, Unity, Godot, Roblox, Blender, CryEngine, Source2, WebGPU, visionOS)
- **Offline Support**: Service workers for PWA, signed ZIP bundles for air-gapped use

### Backend (Express/Node.js PoC → Rust Axum for Production)
- **API Routes** (`/v5/*`):
  - `/v5/health` — Service health check
  - `/v5/projects` — Project CRUD and listing
  - `/v5/generate` — Trigger world generation (ChaCha20 deterministic)
  - `/v5/export` — Export to specific engine format
  - `/v5/audit` — Tamper-proof audit log streaming
- **Auth**: Dev credentials (configurable), HSM-based (v5)
- **Database**: PostgreSQL (Neon-backed) for users, worlds, audit logs
- **Rate Limiting**: Tier-based (Free: 2/week, Creator: 100/week, Lifetime: unlimited)

### Core Engine (PacCore)
- Private Rust/Python sim engine for procedural world generation
- Handles deterministic generation, live sessions, and deferred export tasks
- Integrated via API calls from backend
- Location: Private repo (`wolfteamstudios21-del/pac-core-private`)

### Security (v5)
- **HSM Licensing**: YubiHSM2 (primary) + Nitrokey3 (fallback) for offline key management
- **Ed25519 Signatures**: All auth tokens and audit logs signed
- **Role-Based Access Control (RBAC)**: Admin, Creator, Lifetime, Demo tiers
- **Tamper-Proof Audit Logs**: Hash-chained SHA256 with Ed25519 signatures
- **Air-Gapped Support**: Zero outbound calls; local LLM (Ollama) fallback

---

## Existing Pieces (In This Repo or Private Repos)

- ✅ **Security Primitives**: HSM key generation, manifest signing, RBAC middleware (Rust `pacai_gateway`)
- ✅ **Tools**: `tools/generate_dev_keys.sh`, `verify_manifest.py`
- ✅ **Deployment Config**: `vercel.json`, esbuild configs, Nix setup
- ✅ **PacCore Logic**: World gen prototypes ready for integration (private repo)
- ✅ **Express Backend**: RESTful API with JSON endpoints, project creation, health checks
- ✅ **React Frontend**: Dashboard, export UI, authentication flows

---

## What We're Building Next

### v4 Priorities (Q1 2026)
- [ ] API scaffolding: Full CRUD for projects, worlds, exports
- [ ] Auth/DB: NextAuth or JWT + Prisma schema for users, worlds, audit logs
- [ ] Queue System: BullMQ for deferred gens/exports (Redis via Upstash)
- [ ] Rate Limiting: Tier enforcement middleware
- [ ] PacCore Integration: Call private engine from `/lib/pac-core.js`
- [ ] Basic UI: Dashboard, auth screens, export flow

See [ROADMAP.md](./ROADMAP.md) for detailed phases and milestones.

---

## Folder Structure

```
PacAI-v4/
├── /app/                 # Next.js pages & routes (dashboard, auth, editor)
├── /api/                 # API handlers (auth, gens, exports, audit)
├── /components/          # Reusable UI (WorldEditor, TierSelector, ExportPanel)
├── /lib/                 # Utils (db, auth, pac-core integration, validation)
├── /middleware/          # Next.js middleware (rate limit, auth checks)
├── /config/              # Envs, Zod schemas, licenses.yaml
├── /tools/               # Scripts (key gen, manifest verify, db setup)
├── /public/              # Static assets (logos, icons)
├── server/               # Express backend (dev/prod modes)
├── client/               # React frontend (Vite)
├── shared/               # Shared types & schemas
├── dist/                 # Production build artifacts
├── README.md
├── ROADMAP.md
├── .env.example
├── vercel.json           # Vercel deployment config
├── vite.config.ts        # Frontend build config
├── drizzle.config.ts     # Database ORM config
├── package.json
├── tsconfig.json
└── LICENSE
```

---

## Environment Template (`.env.example`)

Copy to `.env.local` or set in Vercel/Replit secrets:

```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/pacai"

# Auth (v4: Dev credentials; v5: HSM-based)
DEV_USERNAME="WolfTeamstudio2"
DEV_PASSWORD="AdminTeam15"
SESSION_SECRET="your-random-secret-key-here"

# API Keys (Cloud sync, LLM fallback)
OPENAI_API_KEY="sk-..."
UPSTASH_REDIS_URL="https://..."

# Tier Limits (gens/day)
TIER_FREE_LIMIT=2
TIER_CREATOR_LIMIT=100

# Security (v5)
HSM_PRIMARY="yubihsm2-device-id"          # YubiHSM2 device
HSM_FALLBACK="nitrokey3-device-id"        # Nitrokey3 fallback
ED25519_PRIVKEY_PATH="./keys/dev_priv.pem"

# Deployment
NODE_ENV="development"              # or "production"
PORT=5000
VERCEL_URL="https://pacaiwolfstudio.com"
```

---

## Security Architecture (v5)

### Hardware-Root Licensing
- Licenses tied to physical hardware (YubiHSM2/Nitrokey3)
- Ed25519 signatures for offline key validation
- 30-day offline grace period + machine-id fingerprinting
- Renewal via USB for air-gapped environments

### Tamper-Proof Audit Logs
- Hash-chained SHA256 entries with Ed25519 signatures
- Logs all critical events: auth, generate, override, export, license, system, error
- Verifiable integrity: each entry hashes the previous one
- Offline-accessible: stored locally + synced to cloud if available

### Role-Based Access Control (RBAC)
- **Admin**: Full system access (license mgmt, user mgmt, overrides)
- **Creator**: Generate worlds, override params, export to 9 engines
- **Lifetime Indie**: Unlimited generations, all export formats
- **Demo**: Time-limited free trial (2 worlds/week)
- Tier enforcement at endpoint level (e.g., `/v5/export` checks tier)

### Multi-Engine Export Bundles
- Engine-specific templates (UE5, Unity, Godot, Roblox, Blender, CryEngine, Source2, WebGPU, visionOS)
- Signed ZIPs with manifests: `world.json` + assets + engine-specific config
- HMAC-SHA256 signature verification for export callbacks
- Packager module handles asset bundling and compression

---

## Contributing

- **Fork & PR**: Create a PR to `main` with clear description
- **Testing**: Run `npm test` before submitting
- **Code Style**: Follow existing patterns (TypeScript, functional programming preferred)
- **Questions?**
  - Email: wolfteamstudios21@gmail.com
  - Discord: [discord.gg/TtfHgfCQMY](https://discord.gg/TtfHgfCQMY)

---

## License

MIT. See [LICENSE](./LICENSE).

---

## Ship Date

**Target: April 2026** — Full v5 release with enterprise security, multiplayer, and 1000+ user capacity.
