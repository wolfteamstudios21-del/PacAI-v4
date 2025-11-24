# v4 Operator Manual (Draft)

## Installation

1. **Hardware Requirements**
   - YubiHSM 2 or Nitrokey HSM (USB dongle)
   - PostgreSQL 13+ with pgcrypto
   - Network: Localhost/internal VLAN only (air-gapped)

2. **Initial Setup**
   ```bash
   docker-compose up -d
   admin-console --init-license /path/to/license.usb
   ```

3. **User Provisioning (RBAC)**
   - SCIM: Auto-sync from Okta/Azure AD/Keycloak
   - Manual: Create users with `admin-console --add-user`

## Operations

### Licensing
- Check status: `admin-console --license-status`
- Renew offline: Export challenge → USB → Import renewal
- Revoke user: `admin-console --revoke-user <id>`

### Audit
- Real-time stream: `curl ws://localhost:3000/audit/stream`
- Replay scenario: `admin-console --replay --scenario-id <id>`
- Export report: `admin-console --export-audit --format pdf`

### Updates
- Import signed package: `admin-console --import-update /path/to/v0.2.0.tar.gz`
- Rollback: `admin-console --rollback --version v0.1.0`

### Security
- Rotate KMS keys: `admin-console --rotate-keys --project-id <id>`
- Check audit chain: `admin-console --validate-audit-chain`
- HSM attestation: `admin-console --attest-hsm`

## Troubleshooting

**"License expired"**: Import renewal package via USB  
**"Zero audit events"**: Check PostgreSQL connection  
**"HSM not detected"**: Verify YubiHSM USB, restart gateway  

See SECURITY_DOSSIER.md for cryptographic controls.
