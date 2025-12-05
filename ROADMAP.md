# PacAI Roadmap

Short-term focus: Get v4 to MVP (API + basic UI) for internal testing. Long-term: Multiplayer sims and enterprise security.

---

## v4: Core API + Foundations (Target: Q1 2026)

### API & Backend
- [ ] API routes: `/v5/generate`, `/v5/export`, `/v5/projects`, `/v5/session` (with Zod validation)
- [ ] Auth: JWT or NextAuth integration, dev credentials for testing
- [ ] Database: Drizzle ORM schema for users, projects, worlds, audit logs (PostgreSQL deploy to Neon)
- [ ] Queue: BullMQ for deferred gens/exports (Redis via Upstash)
- [ ] Rate Limiting: Middleware for tier enforcement (Free: 2/week, Pro: 100/week, Lifetime: unlimited)
- [ ] Error Handling: Comprehensive error messages and logging

### Frontend
- [ ] Auth Screens: Login/signup with tier display
- [ ] Dashboard: Project listing, quick actions, create/edit flows
- [ ] Export UI: 9-engine selector with "Select All / Clear" toggles
- [ ] Status Indicators: Generation progress, export status

### PacCore Integration
- [ ] Integrate private PacCore engine: Call from `/lib/pac-core.js`
- [ ] Deterministic generation: ChaCha20 RNG for reproducible worlds
- [ ] Session management: Track active gens, handle cancellations

### Deployment
- [ ] Deploy to Vercel: Auto-deploy on push to `main`
- [ ] Vercel environment: Set `DATABASE_URL`, `OPENAI_API_KEY`, dev credentials
- [ ] Custom domain: pacaiwolfstudio.com routing

### Milestone: Local Demo ✅
- Users can generate a world locally, export to JSON/ZIP
- Basic auth flow (dev credentials)
- Health endpoint responds with system status

---

## v5: Dashboard + Advanced Features (Target: Q2 2026)

### Security Hardening
- [ ] HSM Integration: YubiHSM2 (primary) + Nitrokey3 (fallback) for key management
- [ ] Ed25519 Signatures: Sign all auth tokens, audit log entries, export manifests
- [ ] Full RBAC: Role-based tier enforcement at every endpoint
- [ ] Tamper-Proof Audits: Hash-chained audit logs with Ed25519 verification
- [ ] Air-Gapped Support: Zero outbound calls; local Ollama fallback

### UI Enhancements
- [ ] Live PacCore Editor: Real-time sim tweaks (React + Canvas for 3D preview)
- [ ] Advanced Export: Tiered bundles (free: JSON, pro: full ZIP with engine templates)
- [ ] Project History: Version control for worlds (snapshots, rollback)
- [ ] Collaboration: Real-time cursors + comments (optional, v5.1)

### Offline & PWA
- [ ] Service Workers: Cache API responses for offline use
- [ ] Signed Bundles: Export worlds as tamper-proof ZIPs (manifest + SHA256 signature)
- [ ] Offline Validation: Verify manifests without network

### Monitoring & Scaling
- [ ] Analytics: Usage tracking, gen success rates, export formats
- [ ] Performance: Caching, CDN for assets, Upstash Redis optimization
- [ ] UptimeRobot: Health check pings to prevent cold starts

### Milestone: Vercel MVP ✅
- Full React dashboard live at pacaiwolfstudio.com
- User sign-up, project creation, world generation, 9-engine exports
- Tier system working (Free → Creator → Lifetime)
- First 50 internal beta users

---

## v6: Advanced & Enterprise (Target: Q3 2026+)

### Multiplayer & Collaboration
- [ ] WebSockets: Real-time collaborative editing (e.g., via Pusher)
- [ ] Multi-User Sessions: Shared worlds, role-based edit permissions
- [ ] Live Sync: Sync overrides and gen results across team members

### Enterprise Features
- [ ] Custom HSM: Enterprise-grade YubiHSM2 clusters for large orgs
- [ ] SSO/SAML: Okta, Entra ID integration
- [ ] SOC2 Audit: Compliance prep, audit log export
- [ ] Dedicated Deployment: On-premises or private cloud option

### Advanced Generation
- [ ] Multi-Seed Batches: Generate 100+ variants in parallel
- [ ] Custom Scripts: User-defined generation rules (Lua/Python DSL)
- [ ] A/B Testing: Test gen quality with user feedback loop

### Monetization
- [ ] Stripe Integration: Automatic tier upgrades, invoice tracking
- [ ] Usage Analytics: Per-user/org billing dashboard
- [ ] Support Portal: Ticketing system (Zendesk/Linear integration)

### Milestone: Beta Launch 🎯
- 100+ active users, $5K+ MRR
- Enterprise contracts (defense, gaming, education verticals)
- Rust Axum gateway in production (50-100x throughput vs Express)

---

## v7: Scale & Vision (Target: Q4 2026+)

- [ ] Multiplayer Campaigns: Story-driven collaborative adventures
- [ ] Marketplace: Share/monetize custom world templates
- [ ] Mobile Apps: iOS/Android export + preview (React Native)
- [ ] Graphics Export: Blender + Unreal presets for instant game-ready assets
- [ ] AI Co-Creation: Chat interface for guided world generation

---

## Current Status & Next Steps

**Status**: Core backend + React frontend deployed to Vercel; health endpoints working; route order fixed (Dec 5, 2025).

**Next**: 
1. Hire/onboard backend engineer for API scaffolding + DB schema
2. Designer for v5 UI polish + export flow UX
3. PacCore engineer to integrate private gen engine

**Track Progress**: Use GitHub Issues for feature tracking; label by version (v4, v5, v6).

---

## Questions or Changes?

This roadmap is a living document. Open to feedback—let's iterate together! 🚀
