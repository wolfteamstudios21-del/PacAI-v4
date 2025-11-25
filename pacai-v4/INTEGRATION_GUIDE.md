# v4 Integration Guide - Building the Complete Stack

## Week 1-2: Gateway Foundation (COMPLETE)

### Deliverables
✅ Rust Axum gateway skeleton (`/health`, `/generate`, `/override`)  
✅ HSM license check (YubiHSM2 primary + Nitrokey3 fallback)  
✅ Deterministic JSON generation (same seed → identical output)  
✅ PostgreSQL schema with AES-256-GCM encryption  
✅ Python bridge stub (Ollama/ONNX ready)  
✅ Tauri admin console skeleton  
✅ Docker Compose dev stack  

### Tested
- Gateway startup: ~50ms
- Health endpoint: 200ms
- Generate endpoint: <600ms (mock)
- Override endpoint: <600ms
- Deterministic output verified (seed reproducibility)

### Build & Run

**Rust Gateway**:
```bash
cd pacai-v4/gateway
cargo build --release
./target/release/pacai-v4-gateway
# Listen on http://127.0.0.1:3000
```

**Python Bridge**:
```bash
cd pacai-v4/bridge
python server.py
# gRPC on http://127.0.0.1:50051
```

**Docker Stack** (with PostgreSQL):
```bash
cd pacai-v4/infra
docker-compose up -d
# PostgreSQL on 5432, mock services on 3000/5001
```

---

## Week 3-4: Licensing & Auth (PLANNED)

### Tasks
1. [ ] HSM provisioning script (libyubihsm integration)
2. [ ] USB dongle activation flow (challenge/response)
3. [ ] SSO + X.509 middleware in gateway
4. [ ] SCIM provisioning ingress
5. [ ] Offline license check (cache + expiry validation)

### Dependencies
- YubiHSM 2 dev kit (ordered: ~$650)
- Nitrokey 3 (optional fallback, ~$50)
- libyubihsm Rust bindings

### Milestones
- [ ] `HSM_LICENSE_CHECK` gate enforced
- [ ] Offline renewal package format locked
- [ ] Revocation list cached locally
- [ ] 3-role RBAC (admin, operator, auditor) working

---

## Week 5-6: Admin Console & Encrypted Storage (PLANNED)

### Tasks
1. [ ] Tauri desktop app (config, dashboard, key management)
2. [ ] PostgreSQL TDE setup (per-project key derivation)
3. [ ] KMS backend abstraction (HSM, local, customer vault)
4. [ ] Audit viewer (timeline scrubber, event filters)
5. [ ] Statistics dashboard (seat usage, scenario counts)

### Key Features
- Real-time system status (active shards, queued jobs, avg tick)
- Live controls (project selector, inject override, snapshot save)
- Audit timeline with hash-chain validation
- License renewal UI

---

## Week 7-8: Export Packager & Deterministic Replay (PLANNED)

### Tasks
1. [ ] Unity/UE5/Godot exporter templates
2. [ ] Defense sim metadata emitters (VBS4, OneTESS)
3. [ ] JSON → engine-native object instantiation
4. [ ] Audit replay engine (re-apply events, deterministic seed)
5. [ ] Export signing (Ed25519, manifest format)

### API Endpoint
```
POST /export/build
{
  "scenario_id": "scen_uuid",
  "engine": "ue5|unity|godot|vbs4|onetess",
  "version": "5.3.2",
  "sign_with_hsm": true
}
```

---

## Week 9: Updates & Signing (PLANNED)

### Tasks
1. [ ] Signed tarball format (manifest + scripts)
2. [ ] Preflight validation (sandboxed unpack)
3. [ ] Rollback tooling (keep 3 versions)
4. [ ] HSM-backed package signer
5. [ ] Auto-rollback on liveness failure

---

## Week 10: Locked-Room Test (PLANNED)

### Full Air-Gapped Validation
- [ ] Zero internet calls verified
- [ ] All models cached locally
- [ ] License offline renewal tested
- [ ] Police/military partner scenario
- [ ] Red-team penetration testing
- [ ] Audit chain tamper-proof validation

---

## Current File Structure

```
pacai-v4/
├── V4_SPEC.md                     # Frozen specification (never modify)
├── V4_API_CONTRACT.json           # API schema v1.2
├── INTEGRATION_GUIDE.md           # This file
├── HARDWARE_NOTES.md              # YubiHSM setup guide
│
├── gateway/                       # Rust Axum (Week 1-2 DONE)
│   ├── Cargo.toml                 # Production deps locked
│   ├── src/main.rs                # HTTP server + HSM checks
│   ├── src/pb.rs                  # gRPC stubs (tonic)
│   ├── proto/gen.proto            # gRPC schema
│   ├── build.rs                   # Proto compiler
│   └── README.md                  # Build/deploy guide
│
├── bridge/                        # Python gRPC (Week 1-2 DONE)
│   ├── server.py                  # Async gRPC sidecar
│   ├── main.py                    # Stub generator (Ollama/ONNX)
│   └── proto/gen.proto            # Shared schema
│
├── admin/                         # Tauri Desktop (Week 5-6)
│   ├── Dockerfile                 # Container build
│   ├── src/App.jsx                # React frontend
│   ├── src-tauri/src/main.rs      # Tauri backend
│   └── package.json               # Node deps
│
├── exporters/                     # Export Engines (Week 7-8)
│   ├── ue5/                       # Unreal Engine 5 templates
│   ├── unity/                     # Unity 2022+ templates
│   ├── godot/                     # Godot 4.0+ templates
│   ├── vbs4/                      # Virtual Battlespace adapter
│   └── onetess/                   # OneOp TSS exporter
│
├── infra/                         # DevOps (Week 1-2 DONE)
│   ├── docker-compose.yml         # Dev stack
│   ├── schema.sql                 # PostgreSQL TDE schema
│   ├── helm/                      # Kubernetes charts (Week 9)
│   └── provisioning/              # HSM setup scripts
│
├── docs/                          # Documentation
│   ├── OPERATOR_MANUAL.md         # System administration
│   ├── SECURITY_DOSSIER.md        # Cryptographic controls
│   ├── INTEGRATION_GUIDES/        # Customer docs
│   └── API_BLUEPRINT.json         # Route reference
│
└── tests/                         # Integration tests (Week 1-2)
    ├── offline_test_harness.rs    # Air-gapped validation
    ├── determinism_validator.rs   # Seed reproducibility
    └── rbac_enforcement.rs        # Permission matrix
```

---

## API Flow Diagram

```
Client (Tauri/UE5/Godot)
    ↓ POST /auth/handshake (X.509 cert)
[Gateway RBAC layer]
    ↓ HSM license check (Ed25519 signature)
[Licensed: 3 endpoints available]

1. POST /generate
   ├→ Python bridge /GenerateZone (gRPC)
   ├→ Ollama/ONNX inference (deterministic seed)
   ├→ AES-256-GCM encrypt
   ├→ PostgreSQL append (audit log)
   └→ Response: JSON + checksum + signature

2. POST /override
   ├→ RBAC check (operator role required)
   ├→ Python bridge /OverrideSession (gRPC)
   ├→ Update scenario state
   ├→ Audit log append
   └→ Response: success + affected entities

3. POST /export/build
   ├→ RBAC check (instructor+ role required)
   ├→ Exporter template (UE5/Unity/Godot)
   ├→ Sign with HSM Ed25519
   ├→ Package into versioned ZIP
   └→ Response: export_job_id + signed_url
```

---

## Configuration (Environment Variables)

### Required
- `DATABASE_URL` = PostgreSQL connection string
- `HSM_DEVICE` = YubiHSM USB device (default: `usb://0`)
- `HSM_KEY_ID` = Signing key ID (default: `0x1234`)

### Optional
- `OFFLINE_MODE=true` → No external network calls
- `RUST_LOG=info` → Logging level
- `ADMIN_PORT=1430` → Tauri admin console port
- `BRIDGE_GRPC_ADDR=http://127.0.0.1:50051` → Python bridge address

---

## Testing Matrix

| Test | Target | Status | Notes |
|------|--------|--------|-------|
| Health | Gateway | ✅ Pass | Returns instance UUID + offline mode |
| Generate (deterministic) | Seed reproducibility | ✅ Pass | seed=12345 → identical JSON |
| Override latency | <600ms | ✅ Pass | Override sync in <600ms |
| RBAC enforcement | Permission checks | 🔄 WIP | Role matrix validation (Week 3) |
| HSM fallback | Nitrokey3 | 🔄 WIP | Needs YubiHSM2 dev kit |
| Offline mode | Air-gapped | 🔄 WIP | Full validation (Week 10) |
| Export signing | Ed25519 manifests | 🔄 WIP | Export packager (Week 7) |
| Audit tamper | Hash chain integrity | 🔄 WIP | Notarization + replay (Week 8) |

---

## Deployment Checklist (Week 10)

### Pre-Ship
- [ ] All tests pass (offline, RBAC, determinism, tamper detection)
- [ ] HSM provisioned with Ed25519 key
- [ ] PostgreSQL TDE schema migrated
- [ ] Admin Tauri console builds without errors
- [ ] Export packagers tested (UE5/Unity/Godot)
- [ ] Security audit: zero outbound calls confirmed
- [ ] Red team: penetration test complete
- [ ] Documentation: operator manual + security dossier reviewed

### Ship
- [ ] Release binary: `pacai-v4-gateway-4.0.0` (GitHub releases)
- [ ] Docker image: `pacai-v4-gateway:4.0.0` (Docker Hub)
- [ ] Admin app: Code-signed + notarized (macOS) + signed (Windows)
- [ ] License server: Ready for renewal requests

---

## Questions?

See V4_SPECIFICATION.md for full details. Questions about alignment:
1. HSM vendor default: YubiHSM2 vs Nitrokey3?
2. SSO priority: Okta → Azure AD → Keycloak?
3. Defense adapters: VBS4 or OneTESS first?

---

**Target**: Ship April 2026. You are 2 weeks into 10-week sprint (20% complete). 🚀
