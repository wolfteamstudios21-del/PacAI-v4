# PacAI v5 - Enterprise Defense Simulation Platform

## Overview
PacAI v5 (AI Brain v5) is an enterprise offline-first defense simulation platform designed for air-gapped environments such as SCIFs, submarines, and forward operating bases. Its core purpose is to provide deterministic procedural generation for simulation scenarios. Key features include hardware-root licensing (YubiHSM2/Nitrokey3), SSO + X.509 authentication, tamper-proof hash-chained audit logs, and multi-engine exports (UE5, Unity, Godot, Roblox, visionOS, Blender, WebGPU, CryEngine, Source2). The platform aims to be the leading offline world generator, targeting a ship date of April 2026.

## User Preferences
I prefer detailed explanations.
I want iterative development.
I prefer simple language.
Ask before making major changes.
Do not make changes to the folder `Z`.
Do not make changes to the file `Y`.
I like functional programming.

## System Architecture
PacAI v5 employs a robust, security-focused architecture. The user interface is a React-based dashboard, featuring a generation lab, override controls, and an audit log, all rendered with an enterprise dark theme. The backend transitions from an Express-based proof-of-concept to a production-grade Rust Axum Gateway for performance and security.

**UI/UX Decisions:**
- **Theme**: Enterprise dark theme (`#0b0d0f`, `#141517`, `#3e73ff`) inspired by VS Code, emphasizing a technical aesthetic.
- **Components**: Dashboard for generation, project selection with quick actions, and a 9-engine export center.
- **Desktop Console**: A Tauri-based offline Admin Console provides a native desktop experience for management.

**Technical Implementations & Feature Specifications:**
- **Offline-First**: Designed for air-gapped environments, requiring zero outbound calls and supporting local LLMs (Ollama) and USB licensing renewal.
- **Deterministic Generation**: Guarantees identical outputs for identical inputs, facilitating testing and verification. This is handled by `narrative.rs` for story generation and `world.rs` for procedural world generation within the Rust gateway.
- **Tamper-Proof Audit Logs**: Utilizes hash-chained SHA256 entries with Ed25519 signatures for verifiable, tamper-proof logging of all critical events (auth, generate, override, export, license, system, error).
- **Hardware-Root Licensing**: Licenses are tied to physical hardware using YubiHSM2 (primary) and Nitrokey3 (fallback) for robust, offline-capable validation with Ed25519 signatures. Includes a 30-day offline grace period and machine-id fingerprinting.
- **Role-Based Access Control (RBAC)**: Defined in `config/roles.yaml` and implemented in `rbac.rs` within the Rust gateway, managing permissions for admin, lifetime, creator, and demo tiers.
- **Multi-Engine Export**: Supports exports to 9 different game engines and platforms (UE5, Unity, Godot, Roblox, Blender, CryEngine, Source2, WebGPU, visionOS) via dedicated templates and a `packager.rs` module. Export bundles include engine-specific assets and a `world.json` configuration.
- **Signed Offline Updater**: Future capability for secure binary updates with rollback mechanisms and self-hosted tarballs.

**System Design Choices:**
- **Frontend**: React application (`client/`) for the main dashboard.
- **Backend**: Rust Axum Gateway (`pacai-gateway/`) for production, offering high throughput (50-100x Express) and robust security.
  - **Modules**: Includes dedicated modules for routes, security (RBAC, HSM), engine (narrative, world, packager), and utilities (JSON, system info, logging).
- **Desktop Application**: Tauri-based desktop console (`pacai-desktop/`) for offline administration.
- **API Endpoints**: Comprehensive API for health checks, project management, generation, overrides, exports, and audit streaming.
- **Security Hardening**: Tier enforcement for exports, endpoint protection (e.g., `/api/upgrade` blocked in production), and HMAC-SHA256 signature verification for export callbacks.

## External Dependencies
- **OpenAI**: Used as a fallback LLM (via `OPENAI_API_KEY`).
- **PostgreSQL**: Database backend, backed by Neon (via `DATABASE_URL`).
- **YubiHSM2**: Primary hardware security module for licensing (via `HSM_PRIMARY`).
- **Nitrokey3**: Fallback hardware security module for licensing (via `HSM_FALLBACK`).
- **Redis**: Used for BullMQ job queue in the worker fleet (via `REDIS_URL`).
- **S3/R2**: Cloud storage for export files (via `EXPORT_BUCKET_URL`).
- **Express**: Used for the proof-of-concept demo backend (`server/`).
- **Axum**: Rust web framework for the production gateway (`pacai-gateway/`).
- **Tauri**: Framework for building the desktop admin console (`pacai-desktop/`).