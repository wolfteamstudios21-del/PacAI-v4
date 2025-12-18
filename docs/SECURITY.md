# PacAI v6.3 Security Architecture

## Overview

PacAI v6.3 implements defense-grade security for air-gapped environments:

- **Hardware-Root Licensing**: YubiHSM2 / Nitrokey3
- **Ed25519 Signatures**: Manifest and audit log signing
- **SHA-384 Checksums**: File integrity verification
- **RBAC**: Role-based access control with 6 tiers
- **Hash-Chained Audit**: Tamper-proof event logging

---

## 1. Key Management

### Development Keys

Generate development keys using ssh-keygen:

```bash
# Generate Ed25519 keypair
ssh-keygen -t ed25519 -f pacai_dev_ed25519 -C "pacai-dev-key" -N ""

# Outputs:
# pacai_dev_ed25519       -> private key
# pacai_dev_ed25519.pub   -> public key
```

Or use the helper script:

```bash
./tools/generate_dev_keys.sh
```

### Production Keys (HSM)

For production deployments, keys MUST be stored in a hardware security module:

1. **Create key in HSM** (never export private key)
2. **Store HSM key ID** in `config/licenses.yaml`
3. **Export only public key** for verification
4. **30-day offline grace** if HSM unavailable

#### YubiHSM2 Commands

```bash
# Connect to HSM
yubihsm-shell

# Generate Ed25519 key (in HSM shell)
generate asymmetric 0 0 ed25519-sign ed25519 pacai-license-key

# Get public key
get pubkey <key_id>

# Sign data
sign eddsa <key_id> <manifest_hash>
```

#### Nitrokey3 Commands

```bash
# Using nitrokey-app or CLI
nitrokey-cli sign --key ed25519 --input manifest.json
```

---

## 2. Export Bundle Signing

### Signing Flow

1. **Compute SHA-384** checksum for each file
2. **Create manifest.json** with checksums + metadata
3. **Sign manifest** with Ed25519 private key
4. **Bundle** all files + manifest.json + manifest.sig into .zip

### Manifest Format

```json
{
  "pacai": "v5.0.0",
  "generated": "2024-11-30T12:00:00Z",
  "seed": "0xabcdef1234",
  "checksums": {
    "world.json": "sha384-abc123...",
    "entities/npc_001.json": "sha384-def456..."
  },
  "exports": ["ue5", "godot", "unity"],
  "signature_algorithm": "Ed25519",
  "public_key": "hex-encoded-32-bytes"
}
```

### Verification

Python verification helper:

```bash
python tools/verify_manifest.py export.zip --verbose
```

Rust verification:

```rust
use pacai_gateway::engine::packager::verify_export_bundle;

let valid = verify_export_bundle(
    Path::new("export.zip"),
    &public_key_bytes
)?;
```

---

## 3. RBAC Roles

| Role | Generate | Export | Override | Audit | License | Admin |
|------|----------|--------|----------|-------|---------|-------|
| admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| operator | ✓ | ✓ | ✓ | ✓ | - | - |
| creator | ✓ | ✓ | - | - | - | - |
| demo | ✓ | - | - | - | - | - |
| auditor | - | - | - | ✓ | - | - |

### Middleware Usage (Rust)

```rust
use axum::middleware;
use pacai_gateway::security::rbac;

// Protect routes by permission
app.route("/v5/export", post(export_handler))
    .route_layer(middleware::from_fn(rbac::require_export));

app.route("/v5/override", post(override_handler))
    .route_layer(middleware::from_fn(rbac::require_override));
```

### Role Header

Pass role in request header:

```
X-PacAI-Role: creator
```

---

## 4. Audit Logging

### Hash Chain Structure

Each audit entry includes the hash of the previous entry:

```json
{
  "id": "uuid",
  "timestamp": "2024-11-30T12:00:00Z",
  "event_type": "generate",
  "actor": "user@example.com",
  "details": {...},
  "prev_hash": "sha256-of-previous-entry",
  "hash": "sha256-of-this-entry"
}
```

### Verification

To verify audit log integrity:

1. Start from first entry (prev_hash = "genesis")
2. Compute hash of each entry
3. Verify each entry's `prev_hash` matches previous entry's `hash`
4. Any break in chain indicates tampering

---

## 5. Offline Operation

### Grace Period

- **30 days** offline operation when HSM unavailable
- Gateway tracks last successful license validation
- After 30 days: read-only mode (no new exports)
- USB renewal available via Nitrokey3 fallback

### Air-Gap Deployment

For SCIF/submarine/FOB environments:

1. Pre-provision license with HSM
2. Copy gateway + assets to air-gapped system
3. Periodic USB-based license renewal
4. All generation runs locally (Ollama/local LLM)

---

## 6. Security Checklist

### Development

- [ ] Generate dev keys with `generate_dev_keys.sh`
- [ ] Store private key in `~/.pacai/keys/`
- [ ] Never commit keys to version control
- [ ] Use `verify_manifest.py` to test bundles

### Production

- [ ] Import key to YubiHSM2
- [ ] Configure HSM path in environment
- [ ] Enable Nitrokey3 fallback
- [ ] Test offline grace period
- [ ] Verify audit log chain integrity
- [ ] Set up USB renewal workflow

---

## Contact

- **Email**: wolfteamstudios21@gmail.com
- **Discord**: discord.gg/TtfHgfCQMY
