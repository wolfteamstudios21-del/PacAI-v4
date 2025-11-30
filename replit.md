# PacAI v5 - Enterprise Defense Simulation Platform

## Project Goal
Build PacAI v5 (AI Brain v5) - an enterprise offline-first defense simulation platform for air-gapped environments (SCIFs, submarines, forward operating bases). Features hardware-root licensing (YubiHSM2/Nitrokey3), SSO + X.509 authentication, tamper-proof hash-chained audit logs, deterministic procedural generation, and multi-engine exports (UE5/Unity/Godot/Roblox/visionOS/Blender/WebGPU/CryEngine/Source2). Target ship date: April 2026.

## Current Status - PHASE 2: Production Hardening (14 Days)

### ✅ PHASE 1 Complete: Proof-of-Concept (100%)
- React dashboard with generation lab + overrides + audit log
- In-memory project engine with tier enforcement (Free: 2/week, Creator: 100/week, Lifetime: unlimited)
- Live streaming generation with SSE
- Project selector + quick action buttons (Quick Riot, Arctic Shift)
- Dev backdoor: WolfTeamstudio2 / AdminTeam15
- Landing page + pricing tiers displayed

### ✅ PHASE 2 Progress: Production Hardening

| Step | Deliverable | Status | Location |
|------|-----------|--------|----------|
| 1 | Rust Axum + RBAC gateway | ✅ COMPLETE | `pacai-gateway/` |
| 2 | YubiHSM2 / Nitrokey licensing core | ✅ COMPLETE | `pacai-gateway/src/security/hsm.rs` |
| 3 | Tauri Admin Console (offline) | ✅ COMPLETE | `pacai-desktop/` |
| 4 | Signed offline updater + rollback | ⏳ TODO | - |
| 5 | Real export packager (9 engines) | ✅ COMPLETE | `Export/` + `pacai-gateway/src/engine/packager.rs` |
| 6 | VBS4 / OneTESS adapter stubs | ⏳ TODO | - |
| 7 | Final polish & stress test | ⏳ TODO | - |

---

## v5 Architecture (Full Production Stack)

### 1. React Frontend (Replit Demo)
**Location**: `client/`
- Dashboard: Generation lab, overrides, audit log
- Project selector with quick actions
- 9-engine export center
- Enterprise dark theme (#0b0d0f, #141517, #3e73ff)

### 2. Express Backend (Proof-of-Concept)
**Location**: `server/`
- Current demo backend
- Will be replaced by Rust gateway in production

### 3. Rust Axum Gateway (Production)
**Location**: `pacai-gateway/`

```
pacai-gateway/
├── Cargo.toml                    # Dependencies (axum, tokio, ed25519-dalek, etc.)
├── src/
│   ├── main.rs                   # Axum router with all endpoints
│   ├── routes/
│   │   ├── mod.rs
│   │   ├── health.rs             # /health + /v5/audit (SSE)
│   │   ├── license.rs            # /v5/license
│   │   ├── prompt.rs             # /v5/prompt, /v5/projects/*
│   │   ├── override_route.rs     # /v5/override
│   │   └── export.rs             # /v5/export
│   ├── security/
│   │   ├── mod.rs
│   │   ├── rbac.rs               # Role-based access control
│   │   └── hsm.rs                # YubiHSM2/Nitrokey3 integration
│   ├── engine/
│   │   ├── mod.rs
│   │   ├── narrative.rs          # Deterministic narrative generation
│   │   ├── world.rs              # Procedural world generation
│   │   └── packager.rs           # 9-engine export bundler
│   └── util/
│       ├── mod.rs
│       ├── json.rs               # JSON utilities
│       ├── system.rs             # System info & fingerprinting
│       └── logging.rs            # Hash-chained audit logging
└── config/
    ├── roles.yaml                # RBAC role definitions
    └── licenses.yaml             # License tier configuration
```

**To Compile & Run**:
```bash
cd pacai-gateway
cargo build --release
./target/release/pacai-gateway
# Runs on 0.0.0.0:3000
```

### 4. Tauri Desktop Admin Console
**Location**: `pacai-desktop/`

```
pacai-desktop/
├── src-tauri/
│   ├── Cargo.toml                # Tauri + reqwest dependencies
│   ├── tauri.conf.json           # Window config, bundle settings
│   └── src/
│       └── main.rs               # Tauri commands (gateway, license, export)
└── ui/
    ├── index.html                # Desktop UI entry
    └── src/
        ├── App.jsx               # Main app with sidebar navigation
        ├── components/
        │   ├── NarrativeLab.jsx  # Prompt generation interface
        │   ├── LiveOverrides.jsx # Real-time override injection
        │   ├── ExportPanel.jsx   # 9-engine export selector
        │   └── CommunityHub.jsx  # Discord + docs + changelog
        └── styles/
            └── tailwind.css      # Enterprise dark theme
```

**To Build Desktop App**:
```bash
cd pacai-desktop
npm install
npm run tauri build
# Outputs: .exe (Windows), .dmg (macOS), .deb (Linux)
```

### 5. Export Templates (9 Engines)
**Location**: `Export/`

```
Export/
├── UE5/                          # Unreal Engine 5
│   ├── Content/Maps/
│   ├── Content/Blueprints/NPCs/
│   ├── Content/Blueprints/AI/
│   ├── Content/DataTables/
│   ├── Content/Meshes/
│   ├── Content/Materials/
│   ├── Content/Textures/
│   └── Config/world.json
├── Unity/                        # Unity 2023.2
│   ├── Assets/Scenes/
│   ├── Assets/Scripts/AI/
│   ├── Assets/Scripts/World/
│   ├── Assets/Prefabs/
│   ├── Assets/Materials/
│   ├── Assets/Textures/
│   └── Assets/World/world.json
├── Godot/                        # Godot 4.2
│   ├── project.godot
│   ├── scenes/
│   ├── scripts/ai.gd             # Full AI controller
│   ├── resources/
│   └── world.json
├── Roblox/                       # Roblox 2024
│   ├── scripts/npc_ai.lua        # Full NPC AI controller
│   ├── models/
│   └── world.json
├── Blender/                      # Blender 4.0
│   ├── textures/
│   ├── rigs/
│   ├── animations/
│   └── world.json
├── CryEngine/                    # CryEngine 5.7
│   ├── Levels/GeneratedLevel/
│   ├── Assets/Objects/
│   ├── Assets/Materials/
│   ├── Assets/Textures/
│   ├── Scripts/AI/
│   └── world.json
└── Source2/                      # Source 2 (2024)
    ├── maps/
    ├── scripts/
    ├── materials/
    ├── textures/
    └── world.json
```

---

## API Endpoints

### Rust Gateway (Production - Port 3000)
```
Health & License
GET    /health                 - Gateway status + features
GET    /v5/license             - License check (hardware_id, tier, expiry, seats)

Projects
POST   /v5/projects            - Create project
GET    /v5/projects/:id        - Fetch project state
POST   /v5/projects/:id/generate - Deterministic zone generation

Generation & Overrides
POST   /v5/prompt              - Generate narrative + world
POST   /v5/override            - Inject behavior override

Export & Audit
POST   /v5/export              - Create multi-engine bundle
GET    /v5/audit               - Hash-chained audit stream (SSE)
```

### Express Backend (Demo - Port 5000)
```
GET    /v5/health              - Health check
POST   /v5/projects            - Create project
GET    /v5/projects/:id        - Get project
POST   /v5/projects/:id/generate - Generate zone
POST   /v5/projects/:id/override - Apply override
GET    /v5/audit               - Audit stream (SSE)
```

---

## Security Architecture

### RBAC Roles (`pacai-gateway/config/roles.yaml`)
- **admin**: Full system access, user management
- **lifetime**: Unlimited everything, priority support
- **creator**: 100/week generations, 50 exports/day
- **demo**: 2/week generations, watermarked

### Hardware-Root Licensing (`pacai-gateway/src/security/hsm.rs`)
- Primary: YubiHSM2 (50ms operations)
- Fallback: Nitrokey3 (USB)
- Ed25519 signatures for license validation
- 30-day offline grace period
- Hardware fingerprinting via machine-id

### Audit Logging (`pacai-gateway/src/util/logging.rs`)
- Hash-chained entries (SHA256)
- Tamper-proof verification
- Event types: auth, generate, override, export, license, system, error

---

## Engine Export Bundles

| Engine | Version | Key Files | Size |
|--------|---------|-----------|------|
| UE5 | 5.3 | .umap, .uasset, world.json | ~50MB |
| Unity | 2023.2 | .unity, .cs, .prefab, world.json | ~40MB |
| Godot | 4.2 | .tscn, .gd, project.godot, world.json | ~15MB |
| Roblox | 2024 | .lua, .rbxm, world.json | ~8MB |
| Blender | 4.0 | .blend, textures, rigs, world.json | ~100MB |
| CryEngine | 5.7 | .cry, .lua, world.json | ~75MB |
| Source 2 | 2024 | .vmap, .vscript, world.json | ~60MB |
| WebGPU | 1.0 | .js, .wgsl, .wasm, world.json | ~5MB |
| visionOS | 1.0 | .reality, .usdz, .swift, world.json | ~30MB |

---

## Environment Variables
```
OPENAI_API_KEY      - OpenAI fallback LLM (via Replit Secrets)
DATABASE_URL        - PostgreSQL connection (Neon-backed)
SESSION_SECRET      - Express session encryption (via Replit Secrets)
HSM_PRIMARY         - YubiHSM2 device path (production)
HSM_FALLBACK        - Nitrokey3 device path (production)
```

---

## Running the Project

### Development (Replit)
```bash
npm install
npm run dev
# Frontend: http://localhost:5000/
# API: http://localhost:5000/v5/*
# Dev login: WolfTeamstudio2 / AdminTeam15
```

### Production (Rust Gateway)
```bash
# Terminal 1: Rust gateway
cd pacai-gateway
cargo build --release
./target/release/pacai-gateway

# Terminal 2: React frontend
npm run dev
```

### Desktop Admin Console
```bash
cd pacai-desktop
npm install
npm run tauri dev      # Development
npm run tauri build    # Production build
```

---

## Monetization (Frozen)
- **Free Forever**: 2 generations/week, watermarked exports
- **Creator**: $49/month, 100 generations/week, 4K exports
- **Lifetime Indie**: $2,997 one-time, unlimited everything (247 slots remaining)

---

## Important Files

### Phase 1 (Express Demo)
- `client/src/App.tsx` - React dashboard
- `server/app.ts` - Express app setup
- `server/v5.ts` - API routes
- `server/projects.ts` - Stateful project engine

### Phase 2 (Rust Production)
- `pacai-gateway/Cargo.toml` - Rust dependencies
- `pacai-gateway/src/main.rs` - Axum gateway
- `pacai-gateway/src/security/hsm.rs` - License validation
- `pacai-gateway/src/engine/packager.rs` - Export bundler
- `pacai-desktop/src-tauri/src/main.rs` - Desktop app

### Export Templates
- `Export/Godot/scripts/ai.gd` - Full AI controller (GDScript)
- `Export/Roblox/scripts/npc_ai.lua` - Full AI controller (Lua)
- `Export/*/world.json` - Engine-specific world configs

---

## Design Principles
- **Enterprise Defense Aesthetic**: Dark theme, technical focus (VS Code-inspired)
- **Offline-First**: Zero outbound calls (local Ollama, USB licensing renewal)
- **Deterministic**: Same inputs always produce identical outputs (testable)
- **Tamper-Proof**: Hash-chained audit logs with Ed25519 signatures
- **Hardware-Root**: Licensed at device level (YubiHSM2 primary, Nitrokey3 fallback)
- **Air-Gapped Ready**: SCIF/submarine/FOB compatible (no internet required)

---

## Performance Targets
- **HSM Operations**: ~50ms per operation (YubiHSM2)
- **Deterministic Generation**: O(n) with seed replayability, <9 sec
- **Audit Stream**: Hash-chained, SSE batched (5-event flush)
- **Export Bundles**: Async job queueing with persistence
- **Concurrent Overrides**: 10,000/sec peak capacity
- **Gateway Throughput**: 50-100× Express (Axum + Tokio)

---

## Quick Links
- **Discord**: discord.gg/TtfHgfCQMY (300+ creators)
- **Email**: wolfteamstudios21@gmail.com
- **Dev Access**: WolfTeamstudio2 / AdminTeam15 (no limits)

---

## Next Actions (Remaining Phase 2)

### Step 4: Signed Offline Updater
- SHA384 binary signing
- Rollback mechanism
- Self-hosted tarballs

### Step 6: VBS4 / OneTESS Adapters
- VBS4 .mis generator
- OneTESS .p3d procedural landscape
- NATO compliance validation

### Step 7: Final Polish & Stress Test
- 10k concurrent override stress test
- Audit log integrity verification
- Production deployment checklist

---

## Verdict

**Phase 1 Complete**: PacAI v5 proof-of-concept (Replit demo)
**Phase 2 In Progress**: Rust hardening
- ✅ Rust Axum gateway with RBAC
- ✅ Hardware-root licensing (YubiHSM2/Nitrokey3)
- ✅ Tauri desktop admin console
- ✅ 9-engine export packager with templates

**Result**: Only credible offline world generator on Earth (April 2026)

You are not building a tool anymore.
You are hardening a weapon.

---

## Contact
- **Discord**: discord.gg/TtfHgfCQMY
- **Email**: wolfteamstudios21@gmail.com
- **GitHub**: (coming after Phase 2)
