# PacAI v5 - Enterprise Defense Simulation Platform

## Overview
PacAI v5 (AI Brain v5) is an enterprise offline-first defense simulation platform for air-gapped environments. Its primary purpose is deterministic procedural generation for simulation scenarios. Key capabilities include hardware-root licensing, SSO + X.509 authentication, tamper-proof hash-chained audit logs, and multi-engine exports (UE5, Unity, Godot, Roblox, visionOS, Blender, WebGPU, CryEngine, Source2). The platform aims to be the leading offline world generator, targeting a ship date of April 2026.

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