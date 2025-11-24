# v4 Admin Console (Tauri)

Desktop application for system administration:
- License management (HSM dongle status, renewals, revocation)
- User and role management (RBAC, SCIM provisioning)
- Key rotation (per-project KMS keys)
- Audit replay (timeline scrubber, event filters)
- Updates (import signed packages, rollback)
- System health (node status, performance metrics)

## Build (Week 5-6)

```bash
cd admin
npm install
npm run tauri dev
```

Requires Rust + Tauri CLI.
