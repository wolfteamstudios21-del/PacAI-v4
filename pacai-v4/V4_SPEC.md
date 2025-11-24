# AI Brain v4 Specification - Offline-First Defense Simulation Platform

**Status**: Specification Freeze (Feb 2026 - Apr 2026)  
**Target Ship**: April 2026  
**Environments**: SCIFs, submarines, studio firewalls, forward operating bases

---

## Executive Summary

Build an offline-first, on-premises simulation platform with hardware-root licensing, mandatory SSO + X.509 auth, tamper-proof append-only audit logs, and deterministic multi-engine exporters (UE5/Unity/Godot/VBS4/OneTESS).

**Core Tenets**:
- **Zero outbound calls** (air-gapped compliance)
- **Hardware-bound licensing** (YubiHSM/Nitrokey, offline renewal)
- **Deterministic generation** (same prompt + policy → identical JSON)
- **Cluster-ready** (10k+ concurrent NPCs across 50 nodes, quorum failover)
- **Defense-grade audit** (hash-chained, HSM-notarized, deterministic replay)

---

## Architecture Baseline

### Component Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Gateway** | Rust (Axum/Actix-Web) | HTTP/WebSocket, RBAC enforcement, audit hooks |
| **AI Bridge** | Python (asyncio) | Model orchestration (Ollama/ONNX Runtime) via FFI/gRPC loopback |
| **Model Vault** | Encrypted blob store | Per-project KMS keys, customer ONNX/LLM support |
| **Storage** | PostgreSQL TDE + Ceph/NetApp | Encrypted DB + customer-controlled blob |
| **Admin Console** | Tauri (Rust + WebView) | Config, licensing, RBAC, audit replay, updates |
| **Exporters** | Rust + per-engine templates | Unity/UE5/Godot, defense sim adapters |

### Isolation & Encryption

- **Network**: Localhost/internal VLAN only; deny-by-default firewall
- **At Rest**: AES-256-GCM; per-project KMS keys; optional page-level SQLite encryption
- **In Transit**: TLS 1.3 or ChaCha20-Poly1305 (internal loopback)
- **Key Material**: Hardware-backed via HSM; rotation via admin console

### Identity & RBAC

- **SSO**: Okta/Azure AD/Keycloak (OIDC/SAML) + optional X.509 client certs
- **Provisioning**: SCIM for automated user/role sync
- **Role Matrix**:
  - `admin` - Full system access, license management, key rotation
  - `instructor` - Project creation, student management, review scenario execution
  - `operator` - Execute scenarios, apply live overrides, view audit summary
  - `auditor` - Read-only access to append-only audit log, replay engine
  - `integrator` - Deploy custom exporters, manage model imports

### Audit & Compliance

- **Event Log**: Append-only, hash-chained, signed by HSM
- **Deterministic Replay**: Re-apply events to reproduce exact scenario
- **Tamper Detection**: Periodic notarization; bit-rot checks
- **Retention**: Customer-configurable (3yr–unlimited)

---

## Core API Contracts (JSON Schema v1.2)

### 1. /auth/handshake (POST)

**Request**:
```json
{
  "identity_method": "sso" | "x509" | "api_key",
  "credential": "jwt_token | cert_pem | key_material",
  "offline_mode": bool,
  "client_id": "scif_01_room_b"
}
```

**Response**:
```json
{
  "session_token": "short_lived_jwt_600s",
  "user": {
    "id": "user_uuid",
    "roles": ["operator", "auditor"],
    "projects": ["proj_uuid1", "proj_uuid2"]
  },
  "encryption_context": {
    "master_key_id": "hsm_key_uuid",
    "available_models": ["ollama:7b", "custom:onnx"]
  },
  "license_status": {
    "seats_used": 3,
    "seats_max": 10,
    "expiry": "2026-12-31",
    "capabilities": ["generate", "export:ue5", "export:unity"]
  }
}
```

### 2. /generate (POST)

**Request**:
```json
{
  "project_id": "proj_uuid",
  "prompt": "police de-escalation scenario: opioid crisis, downtown intersection",
  "policy_id": "policy_uuid",
  "seed": 12345,
  "deterministic_mode": true,
  "cost_limit": 10
}
```

**Response** (schema v1.2 JSON):
```json
{
  "scenario_id": "scen_uuid",
  "zone": {
    "id": "zone_uuid",
    "entities": [
      {
        "id": "npc_001",
        "type": "civilian|officer|suspect",
        "role": "drunk",
        "position": [x, y, z],
        "behavior_tree": "base::drunk_person",
        "initial_state": {...}
      }
    ],
    "environment": {
      "time_of_day": "20:30",
      "weather": "clear",
      "lighting": "streetlight"
    }
  },
  "checksum": "sha256_hash",
  "generation_metadata": {
    "model_id": "ollama:7b",
    "seed_used": 12345,
    "policy_applied": "policy_uuid",
    "deterministic_signature": "ed25519_sig"
  }
}
```

### 3. /control (POST)

**Request**:
```json
{
  "scenario_id": "scen_uuid",
  "overrides": [
    {
      "entity_id": "npc_001",
      "property": "behavior_aggression_level",
      "value": 0.8,
      "trigger": "instructor_override"
    }
  ]
}
```

**Response**:
```json
{
  "status": "applied",
  "audit_event_id": "evt_uuid",
  "entities_affected": ["npc_001"],
  "state_delta": {...}
}
```

### 4. /audit/stream (WebSocket, GET)

**Query**: `?filter=entity_type:npc&role=auditor&tail=100`

**Stream Frame**:
```json
{
  "event_id": "evt_uuid",
  "timestamp": "2026-02-15T14:32:01Z",
  "actor": "user_uuid",
  "action": "generate|control|export|license_check",
  "subject": "proj_uuid|npc_001",
  "details": {...},
  "hash_chain": "prev_hash→this_hash",
  "signature": "hsm_ed25519_sig"
}
```

### 5. /export/build (POST)

**Request**:
```json
{
  "scenario_id": "scen_uuid",
  "engine": "ue5" | "unity" | "godot" | "vbs4" | "onetess",
  "version": "ue5::5.3.2",
  "include_metadata": true,
  "sign_with_hsm": true
}
```

**Response**:
```json
{
  "export_job_id": "exp_uuid",
  "status": "queued|processing|complete",
  "package_url": "s3://exports/exp_uuid.zip",
  "manifest": {
    "engine": "ue5",
    "version": "5.3.2",
    "schema": "v1.2",
    "hash": "sha256_zip",
    "signature": "ed25519_sig",
    "contents": [
      {"path": "Content/Scenarios/Scenario_01.json", "type": "data"},
      {"path": "Blueprints/NPCController.uasset", "type": "template"}
    ]
  }
}
```

### 6. /admin/users (POST/GET/DELETE)

- List, create, suspend, delete users
- Assign roles per project
- Batch sync via SCIM

### 7. /admin/keys (POST/DELETE/ROTATE)

- Per-project KMS key lifecycle
- HSM attestation
- Key rotation schedule

### 8. /admin/license (GET/IMPORT)

- Check current seat usage, expiry
- Import signed USB dongle renewal packages
- Query offline capability matrix

### 9. /admin/update (GET/IMPORT/ROLLBACK)

- Import signed tarball (manifest + scripts)
- Validate pre-install checks
- Rollback to previous 2 versions
- Auto-rollback on liveness probe failure

---

## Security Design

### Cryptographic Controls

| Purpose | Algorithm | Implementation |
|---------|-----------|-----------------|
| At-Rest Encryption | AES-256-GCM | PostgreSQL TDE; per-project keys from KMS |
| In-Transit Encryption | TLS 1.3 or ChaCha20-Poly1305 | Internal loopback; mTLS for inter-node |
| Key Derivation | PBKDF2 + Argon2id | HSM-backed or customer-supplied |
| Signatures | Ed25519 | Package signing, audit chain, exports |
| License Binding | HMAC-SHA256 | Hardware serial + capabilities + timestamp |

### Audit Chain Design

1. **Event Generation**: Every action (generate, control, export, auth, key ops) emits immutable event
2. **Hash Chain**: `event_N.hash = SHA256(event_N-1.hash || event_N_content)`
3. **HSM Notarization**: Every 1000 events or daily, anchor hash to HSM time-sealed attestation
4. **Storage**: Append-only, replicated to customer blob store (Ceph/NetApp)
5. **Replay**: Read events in order, re-apply deterministic generation with same seed → exact scenario reproduction

### Licensing Model

**Hardware Binding**:
- USB dongle (YubiHSM/Nitrokey) holds:
  - Installation UUID (site-lock)
  - License token (JSON + signature)
  - Capabilities bitmask (generate, export:ue5, export:unity, etc.)
  - Expiry date
  - Seat count

**Offline Renewal**:
- Operator exports challenge from offline install
- Submits to license server (internet-connected) or via secure USB transfer
- Receives signed renewal package
- Imports via admin console; no internet required

**Revocation**: Publish revocation list in admin console; check cached locally

---

## 10-Week Sprint Plan (Feb–Apr 2026)

### Week 1–2: Gateway Foundation
- [ ] Rust HTTP skeleton (Axum or Actix-Web)
- [ ] RBAC middleware (role enforcement)
- [ ] JSON schema v1.2 validator library
- [ ] Offline mode flag + network isolation checks
- [ ] Integration test harness (tenant isolation)

### Week 3–4: Licensing & Auth
- [ ] HSM client library (YubiHSM or Nitrokey)
- [ ] USB dongle activation flow (challenge/response)
- [ ] SSO + X.509 middleware
- [ ] SCIM provisioning ingress
- [ ] Offline license check (cache + expiry validation)

### Week 5–6: Admin Console & Encrypted Storage
- [ ] Tauri app skeleton (config, dashboard, key management UI)
- [ ] PostgreSQL TDE setup (per-project key derivation)
- [ ] KMS backend abstraction (pluggable: HSM, local, customer vault)
- [ ] Audit viewer (timeline scrubber, event filters)
- [ ] Basic statistics dashboard (seat usage, scenario counts)

### Week 7–8: Export Packager & Deterministic Replay
- [ ] Unity/UE5/Godot exporter templates
- [ ] Defense sim metadata emitters (VBS4, OneTESS format)
- [ ] JSON → engine-native object instantiation
- [ ] Audit replay engine (re-apply events, deterministic seed)
- [ ] Export signing (Ed25519, manifest format)

### Week 9: Updates & Signing
- [ ] Signed tarball format (manifest + scripts + checksums)
- [ ] Preflight validation (sandboxed unpack, dependency check)
- [ ] Rollback tooling (keep last 3 versions)
- [ ] HSM-backed package signer
- [ ] Auto-rollback on liveness failure

### Week 10: Locked-Room Test
- [ ] Full air-gapped test (no internet, all models offline)
- [ ] Police/military partner scenario (real-world data)
- [ ] Red-team checklist (penetration, audit tamper, license revocation)
- [ ] Remediation & sign-off

---

## Immediate Build Tasks (This Week)

### 1. Monorepo Bootstrap
```
/gateway          - Rust, HTTP gateway + RBAC + crypto
/bridge           - Python, model orchestration (Ollama/ONNX)
/admin            - Tauri, desktop admin console
/exporters        - Per-engine templates + CI baker
/infra            - Helm charts, Docker Compose, HSM provisioning
/docs             - Operator manual, security dossier, integration guides
/tests            - Integration tests, offline harness
```

### 2. API Contract Lock (JSON Schema v1.2)
- [ ] Finalize `/auth/handshake` request/response
- [ ] Finalize `/generate` determinism spec (seed, policy, checksum)
- [ ] Finalize `/control` override schema
- [ ] Finalize `/audit/stream` event structure
- [ ] Finalize `/export/build` manifest format
- [ ] Finalize `/admin/*` CRUD contracts

### 3. RBAC Policy Files
- [ ] Define role matrix (admin, instructor, operator, auditor, integrator)
- [ ] Per-tenant policy format (JSON + optional Rego for policy-as-code)
- [ ] Policy linter (static analyzer for syntax + capability coverage)
- [ ] Example policies (police training, military sim, studio VFX)

### 4. Model Vault Registry
- [ ] Local model manifest (per-project index, checksums, metadata)
- [ ] Model import flow (upload + verify + encrypt with per-project key)
- [ ] Customer-supplied ONNX/LLM contract (size, quantization, ops budget)
- [ ] Model validation tool (run test inference, log performance)

### 5. Test Harness
- [ ] Offline integration tests (zero internet, all mocked)
- [ ] Tenant isolation tests (verify user_A cannot access user_B data)
- [ ] License state matrix (seat exhaustion, expiry, revocation)
- [ ] Audit tamper detection (hash chain validation, HSM notarization check)
- [ ] Determinism validator (same seed + policy → byte-identical JSON)

---

## Quality Gates & Acceptance Criteria

| Gate | Acceptance Criteria |
|------|-------------------|
| **Air-Gapped Compliance** | Zero outbound calls; all deps vendored; license + update flows work 100% offline |
| **Security Posture** | SSO + X.509 pass penetration tests; AES-256-GCM validated; key rotation succeeds; audit chain tamper-proof |
| **Determinism** | Same prompt + policy + seed → identical JSON output byte-for-byte; replay reproduces scenario exactly |
| **Resilience** | Update rollback succeeds; node failover maintains sessions; audit log survives fault injection |
| **Performance** | <600ms control override sync; 10k NPCs at 50-node cluster with LOD maintains target FPS |
| **Documentation** | Operator manual, security dossier, integration guides, acceptance test checklist complete & red-team reviewed |

---

## Key Alignment Questions (To Answer Before Week 1)

1. **HSM Vendor**: Default to YubiHSM or Nitrokey, or customer-specified?
2. **SSO Priority**: Okta → Azure AD → Keycloak, or different order?
3. **Defense Adapters**: Which simulators prioritize v4 GA? (VBS4, OneTESS, Navisworks)
4. **Storage Default**: Reference deployment on Ceph or NetApp?
5. **Customer Model Policy**: Minimum size/ops/quantization guarantees for ONNX?
6. **Licensing Model**: Perpetual or subscription-based renewal?
7. **Red Team Partner**: Confirmed police or military org for Week 10 locked-room test?

---

## Success Criteria & Sign-Off

✅ **Specification Lock**: API contracts finalized, no scope creep after Week 1  
✅ **Architecture Review**: Security, clustering, determinism reviewed by external consultant  
✅ **Partner Alignment**: Police/military customer confirms v4 meets their operational requirements  
✅ **Air-Gapped Validation**: Independent audit of offline compliance  
✅ **Red Team Report**: Penetration test + audit chain tamper attempts, all remediated  

---

**Next**: Bootstrap monorepo, lock API contracts, create RBAC + policy files, build test harness.
