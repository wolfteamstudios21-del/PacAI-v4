# v4 Deployment Guide

## Architecture Summary

```
Offline-First, Air-Gapped Defense Simulation Platform
├── Rust Axum Gateway (HTTP, RBAC, HSM licensing)
├── Python Bridge (gRPC sidecar, Ollama/ONNX)
├── PostgreSQL TDE (encrypted data + audit log)
├── Tauri Admin Console (config, licensing, audit replay)
└── Export Packagers (UE5, Unity, Godot, VBS4, OneTESS)
```

## Single-Node Deployment (Development)

### 1. Build Gateway
```bash
cd pacai-v4/gateway
cargo build --release
# → target/release/pacai-v4-gateway (~15MB)
```

### 2. Initialize Database
```bash
# PostgreSQL local
createdb pacai_v4
psql pacai_v4 < ../infra/schema.sql

# Or Docker
docker-compose -f ../infra/docker-compose.yml up -d postgres
```

### 3. Start Services
```bash
# Terminal 1: Gateway
./target/release/pacai-v4-gateway

# Terminal 2: Bridge (Python gRPC sidecar)
cd ../bridge && python server.py

# Terminal 3: Admin (Tauri)
cd ../admin && npm run tauri dev
```

### 4. Verify Health
```bash
curl http://127.0.0.1:3000/health
```

Expected:
```json
{
  "status": "healthy",
  "version": "4.0.0-alpha",
  "hsm_primary": "inactive",
  "hsm_fallback": "inactive",
  "offline_mode": true
}
```

---

## Production Deployment (Air-Gapped SCIF)

### 1. Hardware Setup
- **Server**: Physical machine (no VM)
- **OS**: Ubuntu 22.04 LTS (hardened)
- **Network**: Internal VLAN only (no internet)
- **Storage**: NVMe SSD + 2TB HDD (audit backups)
- **HSM**: YubiHSM 2 (USB, primary) + Nitrokey 3 (USB, fallback)

### 2. Install Dependencies
```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# PostgreSQL (with pgcrypto)
sudo apt-get install postgresql postgresql-contrib
sudo -u postgres createdb pacai_v4

# Python 3.10+
sudo apt-get install python3.10 python3-pip

# YubiHSM client
sudo apt-get install yubihsm-client

# Build tools
sudo apt-get install build-essential pkg-config libssl-dev
```

### 3. Provision HSM
```bash
# Insert YubiHSM2 USB dongle
yubihsm-shell

yubihsm> connect
yubihsm> list objects
yubihsm> generate asymmetric 0 0x1234 ed25519 sign-hash

# Export public key for signing verification
yubihsm> get public-key 0x1234 > /tmp/hsm_pubkey.pem
```

### 4. Build & Deploy Gateway
```bash
cd /opt/pacai-v4/gateway
cargo build --release
sudo cp target/release/pacai-v4-gateway /usr/local/bin/

# Create systemd service
sudo tee /etc/systemd/system/pacai-gateway.service << EOF
[Unit]
Description=PacAI v4 Gateway
After=network-online.target postgresql.service
Wants=network-online.target

[Service]
Type=simple
User=pacai
ExecStart=/usr/local/bin/pacai-v4-gateway
Environment="DATABASE_URL=postgresql://pacai:changeme@localhost/pacai_v4"
Environment="RUST_LOG=info"
Environment="OFFLINE_MODE=true"
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable pacai-gateway
sudo systemctl start pacai-gateway
```

### 5. Start Python Bridge (systemd)
```bash
sudo tee /etc/systemd/system/pacai-bridge.service << EOF
[Unit]
Description=PacAI v4 AI Bridge
After=network.target

[Service]
Type=simple
User=pacai
WorkingDirectory=/opt/pacai-v4/bridge
ExecStart=/usr/bin/python3 server.py
Environment="PYTHONUNBUFFERED=1"
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable pacai-bridge
sudo systemctl start pacai-bridge
```

### 6. Initialize Database Schema
```bash
psql pacai_v4 -U pacai < /opt/pacai-v4/infra/schema.sql
```

### 7. Deploy Admin Console (Tauri)
```bash
cd /opt/pacai-v4/admin
npm ci
npm run build

# Build signed app (macOS/Windows)
npm run tauri build

# Copy to /Applications (macOS) or Program Files (Windows)
```

### 8. Verify Deployment
```bash
# Check gateway health
curl http://127.0.0.1:3000/health

# Generate test scenario
curl -X POST http://127.0.0.1:3000/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test","seed":123,"stream":false}'

# Check audit log
psql pacai_v4 -U pacai -c "SELECT COUNT(*) FROM audit_events"

# Verify HSM licensing
sqlite3 /var/lib/pacai/license.db "SELECT * FROM licenses"
```

---

## Multi-Node Cluster Deployment (Scaling)

### Sharding Architecture
```
[Load Balancer: HAProxy]
    ↓
[Node 1] [Node 2] [Node 3] ... [Node N]
    ↓     ↓     ↓         ↓
[PostgreSQL Primary (write)]
    ↓
[PostgreSQL Replicas (read-only, Nodes 2-N)]
    ↓
[Redis Cache: Session state]
    ↓
[Ceph Blob Store: Encrypted exports]
```

### Deploy Node N+1
```bash
# Same as single-node, but:

# 1. PostgreSQL (replica mode)
pg_basebackup -h <primary_ip> -D /var/lib/postgresql/13/main
systemctl start postgresql

# 2. Redis client config
export REDIS_URL=redis://<redis_primary>:6379

# 3. Join shard cluster
export SHARD_ID=node_$(hostname)
export SHARDING_ENABLED=true

# 4. Start gateway
systemctl start pacai-gateway
```

---

## Monitoring & Observability

### Logs
```bash
# Gateway logs
journalctl -u pacai-gateway -f

# Bridge logs
journalctl -u pacai-bridge -f

# Database logs
tail -f /var/log/postgresql/postgresql.log

# Audit stream (real-time)
curl ws://127.0.0.1:3000/audit/stream?tail=100
```

### Metrics
```bash
# System health
curl http://127.0.0.1:3000/metrics

# Expected output:
# pacai_gateway_requests_total{endpoint="/generate",status="200"} 1234
# pacai_gateway_request_duration_seconds{endpoint="/generate"} 0.450
# pacai_hsm_license_checks{status="pass"} 5432
# pacai_audit_events_total 987654
```

### Alerts
- HSM offline → Fallback to Nitrokey3 (watch logs)
- Database latency > 1000ms → Check PostgreSQL (SLOW QUERY)
- Audit log breach → Immediate HSM notarization
- License expiry < 30 days → Generate renewal challenge

---

## Backup & Disaster Recovery

### Daily Backup (Offline)
```bash
#!/bin/bash
BACKUP_DIR=/mnt/backup/pacai_v4

# PostgreSQL dump
pg_dump pacai_v4 | gzip > $BACKUP_DIR/postgres_$(date +%Y%m%d).sql.gz

# Audit log export
sqlite3 /var/lib/pacai/license.db ".dump" | gzip > $BACKUP_DIR/audit_$(date +%Y%m%d).sql.gz

# Ceph snapshot (if using)
radosgw-admin bucket sync status --bucket=pacai-exports > $BACKUP_DIR/blob_status.txt

# Verify integrity
sha256sum $BACKUP_DIR/* > $BACKUP_DIR/MANIFEST.sha256
```

### Restore (on disaster)
```bash
# Restore PostgreSQL
gunzip < /mnt/backup/pacai_v4/postgres_20260115.sql.gz | psql pacai_v4

# Verify audit log integrity
sqlite3 -bail /var/lib/pacai/license.db < /mnt/backup/pacai_v4/audit_20260115.sql.gz

# Resync Ceph if needed
radosgw-admin bucket sync init --bucket=pacai-exports
```

---

## Security Checklist

### Installation
- [ ] HSM provisioned (Ed25519 key exists on YubiHSM2)
- [ ] PostgreSQL TDE enabled (pgcrypto + per-project keys)
- [ ] Firewall: 127.0.0.1 only (no external access)
- [ ] SSL/TLS: X.509 client certificates installed
- [ ] OS hardened: SELinux / AppArmor enabled
- [ ] SSH key-only authentication (no passwords)

### Operations
- [ ] Daily backup verified (monthly restore drill)
- [ ] HSM attestation: Weekly `yubihsm-shell get log`
- [ ] Audit chain: Daily hash-chain validation
- [ ] License: Monthly renewal challenge exported
- [ ] Monitoring: Alerts configured (Slack/PagerDuty)

### Compliance
- [ ] FIPS 140-2 (HSM)
- [ ] NIST SP 800-171 (encryption, access control)
- [ ] FISMA (Federal Information Security Management)
- [ ] DISA STIGs (DoD security standards)

---

## Support

- **v4 Spec**: See `V4_SPECIFICATION.md`
- **API Reference**: See `API_BLUEPRINT.json`
- **Security**: See `SECURITY_DOSSIER.md`
- **Operator Manual**: See `OPERATOR_MANUAL.md`

**Next**: Red-team testing (Week 10) + partner sign-off.

---

**Status**: Deployment guide locked for v4.0.0 (Apr 2026 target).
