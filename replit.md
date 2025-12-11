# PacAI v6 - Dev Companion

## Overview
PacAI v6 (AI Brain v6) is an enterprise offline-first defense simulation platform for air-gapped environments. Its primary purpose is deterministic procedural generation for simulation scenarios. Key capabilities include hardware-root licensing, SSO + X.509 authentication, tamper-proof hash-chained audit logs, and multi-engine exports (UE5, Unity, Godot, Roblox, visionOS, Blender, WebGPU, CryEngine, Source2). The platform aims to be the leading offline world generator, targeting a ship date of April 2026.

## User Preferences
I prefer detailed explanations.
I want iterative development.
I prefer simple language.
Ask before making major changes.
Do not make changes to the folder `Z`.
Do not make changes to the file `Y`.
I like functional programming.

## System Architecture
PacAI v5 employs a robust, security-focused architecture. The user interface is a React-based dashboard featuring a generation lab, override controls, and an audit log, rendered with an enterprise dark theme. The backend transitions from an Express-based proof-of-concept to a production-grade Rust Axum Gateway for performance and security. A Tauri-based offline Admin Console provides a native desktop experience.

**UI/UX Decisions:**
- **Theme**: Enterprise dark theme (`#0b0d0f`, `#141517`, `#3e73ff`) inspired by VS Code, emphasizing a technical aesthetic.
- **Components**: Dashboard for generation, project selection with quick actions, and a 9-engine export center.

**Technical Implementations & Feature Specifications:**
- **Offline-First**: Designed for air-gapped environments, requiring zero outbound calls and supporting local LLMs (Ollama) and USB licensing renewal.
- **Deterministic Generation**: Guarantees identical outputs for identical inputs, handled by `narrative.rs` for story generation and `world.rs` for procedural world generation within the Rust gateway.
- **Tamper-Proof Audit Logs**: Utilizes hash-chained SHA256 entries with Ed25519 signatures for verifiable, tamper-proof logging.
- **Hardware-Root Licensing**: Licenses are tied to physical hardware using YubiHSM2 (primary) and Nitrokey3 (fallback) for robust, offline-capable validation with Ed25519 signatures, including a 30-day offline grace period.
- **Role-Based Access Control (RBAC)**: Defined in `config/roles.yaml` and implemented in `rbac.rs` within the Rust gateway, managing permissions for admin, lifetime, creator, and demo tiers.
- **Multi-Engine Export**: Supports exports to 9 different game engines and platforms via dedicated templates and a `packager.rs` module.
- **Image Reference System**: Enables style-guided generation with image references, supporting tier-based limits and AI source detection.
- **WebSocket Bridge for Live Overrides**: Real-time override syncing between the dashboard and exported game servers, secured with JWT authentication, session binding, and tier-based rate limiting.
- **Mobile Exports, Direct Links & Constant Engine Draw**: Supports mobile ZIP exports with engine-specific scripts, generates shareable JWT-based short URLs with QR codes, and provides real-time random generation via WebSocket events or polling. SDK stubs are provided for various engines.
- **PWA Support** (v5.6): Progressive Web App with manifest.json, service worker for offline caching, and beforeinstallprompt handling. Download page offers PWA install for mobile/web and desktop AppImage downloads.
- **Artist Portal** (v5.6): Artist monetization system where creators upload concept art and earn royalties (10-30%) when developers use their art in world generation. Features: upload form with royalty selection, license options (CC-BY, CC-BY-NC, Commercial, PacAI Exclusive), earnings tracking, leaderboard, and usage statistics. Backend routes: `server/routes/artist.ts`. Frontend: `client/src/pages/artist-portal.tsx`. **Security**: Uses HMAC-SHA256 signed session tokens with 24-hour TTL; artist upload and stats endpoints derive username from validated session tokens (not from request body/params) to prevent impersonation attacks.
- **Public Artist Showcase** (v5.6.1): Public gallery displaying artist work on homepage and login page to enable artist-developer communication for payment and project crediting. Features: opt-in public visibility toggle, contact fields (email, website, Twitter/X, Discord), featured artist carousel. Artists control their public presence via "Showcase Publicly" toggle in upload form. Backend: `GET /v5/artist/showcase` returns only public artwork with contact info. Frontend component: `client/src/components/ArtistShowcase.tsx`. Security: Contact info only exposed for entries where is_public=true; filtering applied server-side before response.

**v5.7 Billing & Tier Upgrades (December 2025):**
- **Stripe Payment Integration**: Full Stripe checkout integration for tier upgrades via Replit connector. Products created: Creator ($9.99/mo), Pro ($29.99/mo), Lifetime ($299.99 one-time), Enterprise ($999.99 one-time).
- **Database-Backed User Tiers**: User tiers now persist in PostgreSQL `users` table with fields: `tier`, `stripe_customer_id`, `stripe_subscription_id`, `license_expires_at`, `is_verified`. Login flow checks database first for tier info.
- **Billing Routes** (`server/routes/billing.ts`): Endpoints for `/api/billing/config`, `/api/billing/prices`, `/api/billing/create-checkout-session`, `/api/billing/success`, `/api/billing/create-portal-session`, `/api/billing/status`.
- **Pricing Page** (`client/src/pages/pricing.tsx`): Upgrade interface with tier comparison, feature lists, and Stripe checkout integration. Accessible via "Upgrade Plan" menu item.
- **Billing Success Page** (`client/src/pages/billing-success.tsx`): Post-checkout confirmation with tier update.
- **Dev Team Lifetime Licenses**: WolfTeamstudio2 and AdminTeam15 assigned lifetime tier for testing/production use.

**v5.7 Stripe Connect Marketplace (December 2025):**
- **Creator Marketplace**: Full Stripe Connect integration enabling creators to sell products with platform fees (10% + $0.30).
- **Connected Accounts**: Creators create Stripe Standard accounts via `/api/connect/connect/create`, complete onboarding via `/api/connect/connect/onboard`.
- **Onboarding Status**: Real-time status checking via `/api/connect/connect/status` (not_started, started, pending, complete).
- **Product Creation**: Creators can create products on their connected accounts via `/api/connect/products/create`.
- **Public Storefronts**: Each creator has a public store at `/api/connect/store/:accountId` with PacAI dark theme styling.
- **Direct Charges**: Checkout sessions use direct charges with application fees, routed through `/api/connect/checkout`.
- **Database Schema**: `users` table extended with `stripe_account_id`, `stripe_onboarding_complete`; new `creator_products` table for product catalog.

**v6.0 AI Core Upgrades (December 2025):**
- **Reasoning Engine** (`server/lib/reasoning.ts`): Ollama-powered LLM integration with interpret→plan→expand pipeline. Internal reasoning steps not exposed to users; output compressed and normalized. Falls back to procedural generation when Ollama unavailable.
- **Detail Compression** (`server/lib/compression.ts`): Confidence-based pruning, description truncation, seed quantization, and coordinate normalization for engine-ready output.
- **Azure Vision Parsing** (`server/lib/vision.ts`): Optional image-aware generation extracting style, palette, biome, tone, lighting from reference images. Graceful fallback when Azure Vision credentials not configured.
- **NPC Control Layer v2** (`server/generation/npc-v6.ts`): Advanced NPC generation with motivation systems (primary/secondary goals), emotional state (mood, intensity, triggers), behavior hooks, faction alignment (loyalty, biases), routines, and personality traits.
- **Fauna Ecosystem Intelligence** (`server/generation/fauna-v6.ts`): Trophic layer classification (predator/herbivore/scavenger/microfauna), environmental dependencies, behavior models (herding, aggression, activity cycles, territory), pack dynamics.
- **Simulation Hooks** (`server/generation/simulation-v6.ts`): Racing and gameplay fabric including car tuning, street density, traffic flows, race hotspots, NPC driving profiles, event triggers, and city state hour cycles.
- **v6 API Routes** (`server/routes/v6.ts`): Endpoints at `/v6/generate`, `/v6/generate/npc`, `/v6/generate/fauna`, `/v6/generate/simulation`, `/v6/generate/image`, `/v6/health`.
- **Environment Variables**: `PACAI_LLM_MODEL` (default: llama3.1), `AZURE_VISION_KEY`, `AZURE_VISION_ENDPOINT` (optional for image parsing).

**v6.1 Asset Generators (December 2025):**
- **Vehicle Generator** (`server/generation/vehicle-v6.ts`): Generates vehicles (car/tank/starship/aircraft/boat) with faction, stats (speed/armor/fuel), visuals (palette/silhouette), and abilities. Endpoint: `POST /v6/generate/vehicle`.
- **Weapon Generator** (`server/generation/weapon-v6.ts`): Generates weapons (melee/ranged/energy/explosive) with material, damage, reload time, style, faction, and special effects. Endpoint: `POST /v6/generate/weapon`.
- **Creature Generator** (`server/generation/creature-v6.ts`): Generates creatures/monsters (beast/demon/alien/mutant) with biome, abilities, weaknesses, aggression, visuals, and narrative hooks. Endpoint: `POST /v6/generate/creature`.
- **Gallery Auto-Fill** (`server/routes/gallery-autofill.ts`): Auto-populates gallery with procedurally generated vehicles, weapons, and creatures. Includes silhouette preview generation, license-aware storage (cc0/cc-by/commercial), and bulk operations. Endpoints: `POST /v6/gallery/autofill/vehicle`, `/weapon`, `/creature`, `/bulk`. List: `GET /v6/gallery`.
- **Gallery Data Model** (`server/db/gallery.ts`): In-memory gallery storage with kind filtering, license tracking, and owner attribution (system/user/web).
- **Preview Generation** (`server/lib/preview.ts`): Deterministic SVG silhouettes from tags for offline-first placeholder previews.
- **Web Ingestion** (`server/routes/gallery-ingest.ts`): CC-safe ingestion endpoint for curated web references (`POST /v6/gallery/ingest`).
- **Gallery Seeding** (`server/jobs/seed-gallery.ts`): Daily background job to auto-populate gallery with diverse asset prompts.
- **Client Component** (`client/src/components/GalleryCard.tsx`): React component for displaying gallery items with kind badges, license chips, and owner attribution.
- **Strategic Coverage**: Vanguard (starships/weapons), Realm Unbound (fantasy monsters/weapons), Riftwars (vehicles/weapons), Metro (cars/weapons), '42 Pacific Command (WW2 vehicles/weapons).

**v5.5 New Modules (December 2025):**
- **Voice Synthesis Module** (`/v5/voice`): POST for generation, GET for previews. Supports 10 voice styles (gritty, calm, urgent, robotic, tactical, commander, civilian, hostile, friendly, neutral) and 9 languages. Tier limits: Free=1 style, Pro=5, Enterprise=unlimited. Mock audio output ready for Ollama/local TTS integration.
- **Animation/Rigging Module** (`/v5/animate`): Procedural skeletal rigging for humanoid/creature/vehicle/prop assets. 24 motion types across locomotion, combat, emotes, and reactions. Generates rig JSON and FBX base64. Tier limits: Free=1 animation, Pro=5 with layers.
- **Texture/Style Module** (`/v5/style`): 15 style filters (gritty, cyberpunk, military, noir, etc.) with 2x/4x/8x upscaling. License-aware remixing with CC-BY, proprietary, and PacAI-exclusive license support. Integrates with gallery remix system.
- **Offline-First Enhancements** (`server/lib/offline.ts`): USB license renewal via JWT validation with 30-day grace period. Server-side asset caching with LRU eviction. IndexedDB schema for SDK client-side caching.
- **Tier Middleware** (`server/middleware/tiers.ts`): Centralized tier enforcement for all v5.5 modules. Limits for voices, animations, styles, exports, refs, and generations per tier (free/creator/pro/lifetime/enterprise).

**System Design Choices:**
- **Frontend**: React application (`client/`) for the main dashboard, integrated with Next.js for SSR and NextAuth authentication.
- **Backend**: Rust Axum Gateway (`pacai-gateway/`) for production, with modules for routes, security (RBAC, HSM), engine (narrative, world, packager), and utilities.
- **Desktop Application**: Tauri-based desktop console (`pacai-desktop/`) for offline administration.
- **API Endpoints**: Comprehensive API for health checks, project management, generation, overrides, exports, and audit streaming.
- **Security Hardening**: Includes tier enforcement for exports, endpoint protection, and HMAC-SHA256 signature verification.
- **Authentication**: NextAuth for credentials-based authentication with bcrypt password hashing and JWT sessions.

## External Dependencies
- **OpenAI**: Fallback LLM.
- **PostgreSQL**: Database backend (via Neon).
- **YubiHSM2**: Primary hardware security module for licensing.
- **Nitrokey3**: Fallback hardware security module for licensing.
- **Redis**: Used for BullMQ job queue.
- **S3/R2**: Cloud storage for export files.
- **Express**: Used for the proof-of-concept backend.
- **Axum**: Rust web framework for the production gateway.
- **Tauri**: Framework for building the desktop admin console.
- **Next.js**: Used for hybrid architecture with SSR.
- **NextAuth**: Credentials-based authentication.