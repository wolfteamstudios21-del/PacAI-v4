# PacAI v6 - Dev Companion

## Overview
PacAI v6 (AI Brain v6) is an enterprise offline-first defense simulation platform designed for air-gapped environments. Its core function is deterministic procedural generation of simulation scenarios. Key features include hardware-root licensing, SSO + X.509 authentication, tamper-proof hash-chained audit logs, and multi-engine exports (UE5, Unity, Godot, Roblox, visionOS, Blender, WebGPU, CryEngine, Source2). The platform aims to be the leading offline world generator, with a target ship date of April 2026. This platform also includes a creator marketplace with Stripe Connect integration for artists to sell their work, and advanced AI-powered generation capabilities for NPCs, fauna, and simulation elements.

## User Preferences
I prefer detailed explanations.
I want iterative development.
I prefer simple language.
Ask before making major changes.
Do not make changes to the folder `Z`.
Do not make changes to the file `Y`.
I like functional programming.

## System Architecture
PacAI v6 employs a robust, security-focused, and offline-first architecture. The frontend is a React-based dashboard with an enterprise dark theme, offering a generation lab, override controls, and an audit log. The backend is a high-performance Rust Axum Gateway. A Tauri-based offline Admin Console provides a native desktop experience.

**UI/UX Decisions:**
- **Theme**: Enterprise dark theme (`#0b0d0f`, `#141517`, `#3e73ff`) inspired by VS Code.
- **Components**: Dashboard for generation, project selection, and a 9-engine export center. Artist Portal, Public Artist Showcase, Pricing Page, and Asset Gallery for user interaction.

**Technical Implementations & Feature Specifications:**
- **Offline-First**: Designed for air-gapped environments, supporting local LLMs (Ollama) and USB licensing renewal.
- **Deterministic Generation**: Ensures identical outputs for identical inputs using `narrative.rs` and `world.rs`.
- **Tamper-Proof Audit Logs**: Hash-chained SHA256 entries with Ed25519 signatures.
- **Hardware-Root Licensing**: Licenses tied to YubiHSM2/Nitrokey3 with Ed25519 signatures and a 30-day offline grace period.
- **Role-Based Access Control (RBAC)**: Defined in `config/roles.yaml` and implemented in `rbac.rs`.
- **Multi-Engine Export**: Supports 9 different game engines via `packager.rs`.
- **Image Reference System**: Enables style-guided generation with AI source detection.
- **WebSocket Bridge for Live Overrides**: Real-time override syncing with JWT authentication.
- **PWA Support**: Offline caching and installability.
- **Artist Portal & Showcase**: Monetization system for artists with royalty tracking and public galleries.
- **Stripe Payment Integration**: Full Stripe checkout for tier upgrades and Stripe Connect for the Creator Marketplace. User tiers are database-backed.
- **AI Core Upgrades**:
    - **Reasoning Engine** (`server/lib/reasoning.ts`): Ollama-powered LLM integration with an interpret→plan→expand pipeline.
    - **Detail Compression** (`server/lib/compression.ts`): Confidence-based pruning and data normalization.
    - **Azure Vision Parsing** (`server/lib/vision.ts`): Optional image-aware generation from reference images.
    - **NPC Control Layer v2** (`server/generation/npc-v6.ts`): Advanced NPC generation with motivations, emotions, behaviors, and faction alignment.
    - **Fauna Ecosystem Intelligence** (`server/generation/fauna-v6.ts`): Trophic layer classification, environmental dependencies, and behavior models.
    - **Simulation Hooks** (`server/generation/simulation-v6.ts`): Racing and gameplay fabric elements.
- **Asset Generators**:
    - **Vehicle Generator** (`server/generation/vehicle-v6.ts`)
    - **Weapon Generator** (`server/generation/weapon-v6.ts`)
    - **Creature Generator** (`server/generation/creature-v6.ts`)
- **Gallery System**: Auto-fill, web ingestion, and display of procedurally generated assets with preview generation.
- **Real Stripe Charges & Rate Limiting**: $0.50 charge per autofill/fork operation via Stripe Checkout, with free tier rate limits.
- **New Modules (v5.5)**:
    - **Voice Synthesis Module** (`/v5/voice`): Text-to-speech with multiple styles and languages.
    - **Animation/Rigging Module** (`/v5/animate`): Procedural skeletal rigging and motion generation.
    - **Texture/Style Module** (`/v5/style`): Style filters and upscaling for assets.
    - **Offline-First Enhancements** (`server/lib/offline.ts`): USB license renewal and server-side asset caching.
- **Tier Middleware** (`server/middleware/tiers.ts`): Centralized enforcement of tier limits for all modules.
- **Pipeline Engine (v6.3)**: Modular AI workflow system with:
    - **Engine Core** (`server/lib/pipeline-engine.ts`): Pipeline registration, sync/async execution, run history tracking
    - **Pipeline Registry** (`server/lib/pipeline-registry.ts`): Pre-built pipelines wrapping existing services
    - **API Routes** (`server/routes/pipelines.ts`): RESTful pipeline execution with auth, validation, rate limiting
    - Available Pipelines: `image.concept`, `model.3d`, `gallery.autofill`, `gallery.ingest`, `npc.generate`, `fauna.generate`
    - Project-scoped runs with history: `/api/projects/:projectId/runs`
- **Vercel Optimizations (v6.4)**:
    - **Circuit Breaker** (`server/lib/circuit-breaker.ts`): p-retry wrapper for external API calls with automatic retry logic
    - **Health Check Endpoints** (`server/routes/health.ts`): `/api/health`, `/api/health/ready`, `/api/health/live` for Kubernetes/Vercel probes
    - **Prompt Cache** (`server/lib/prompt-cache.ts`): In-memory cache with 1-hour TTL, 500 entry limit, LRU eviction
    - **Heap Monitoring**: Memory usage logging at pipeline start/end, warnings when RSS exceeds 500MB
- **War Simulation v6.4.1** (`server/generation/war-simulation.ts`): Persistent planetary war simulation for Vanguard: Infinite Echoes with:
    - **Master System Prompt**: Constraint-driven, consequence-aware war orchestration AI
    - **Planet Initialization**: Generate war-torn planets with factions, key locations, and major bases
    - **Live War Evaluation**: Tactical assessment with resource status and recommended actions
    - **Counteroffensive Planning**: Major operation planning with success probability
    - **Resolution Phase**: War conclusion with outcomes and aftermath
    - **PAI² (Player After-Action Intelligence)**: Analyze player behavior as battlefield intelligence
    - **Psychological Warfare Engine**: Generate enemy propaganda and psyops messages
    - **Cross-Planet Strategic Continuity**: Translate outcomes into galactic-level consequences
    - **Project-scoped**: War simulations stored per-project with config and results history
    - **Tier-gated**: Requires Creator ($9.99/mo) or Lifetime tier
    - **v6.4.1 Enhancements**:
        - **Conflict Type Selection**: 6 conflict archetypes (military, horror, political, economic, social, survival)
        - **Campaign Duration**: Configurable 7-90 day campaigns
        - **8-Axis Resource System**: Tracks power, wealth, support, knowledge, morale, stability, hope, and fear for both player and enemy
        - **Enhanced Faction Profiles**: Behavior profiles (aggression, diplomacy, deception, resilience, resource_focus) with faction archetypes
        - **Full Campaign Timeline**: Day-by-day major events and psychological operations tracking
        - **Story Hooks Generator**: Emergent narrative opportunities from war state
        - **Final Outcome Analysis**: Victory/defeat status with control percentages, galactic effects, and universe tone shifts

**System Design Choices:**
- **Frontend**: React with Next.js for SSR.
- **Backend**: Rust Axum Gateway.
- **Desktop Application**: Tauri-based Admin Console.
- **API Endpoints**: Comprehensive API for all platform functionalities.
- **Security Hardening**: Tier enforcement, endpoint protection, HMAC-SHA256 signature verification.
- **Authentication**: NextAuth for credentials-based authentication with JWT sessions.

## External Dependencies
- **OpenAI**: Fallback LLM.
- **PostgreSQL**: Database backend (via Neon).
- **YubiHSM2**: Primary hardware security module.
- **Nitrokey3**: Fallback hardware security module.
- **Redis**: For BullMQ job queue.
- **S3/R2**: Cloud storage for export files.
- **Express**: Used for proof-of-concept backend.
- **Axum**: Rust web framework.
- **Tauri**: Desktop application framework.
- **Next.js**: For hybrid architecture and SSR.
- **NextAuth**: Credentials-based authentication.
- **Stripe**: Payment processing and Connect marketplace.
- **Ollama**: Local LLM integration.
- **Azure Vision**: Optional image parsing.