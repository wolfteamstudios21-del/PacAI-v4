# Hardware & Licensing Notes

## YubiHSM 2 Dev Kit Order

**Component**: Yubico YubiHSM 2 Starter Kit  
**Cost**: ~$650 USD (Amazon / Yubico direct)  
**Status**: ORDERED - Requested for immediate delivery  
**Purpose**: Hardware-root licensing, Ed25519 signing, HSM attestation  

**Ordering Link**: https://www.amazon.com/Yubico-YubiHSM-Starter-Kit/dp/B07DKSSXYX

**What's in the kit**:
- 2x YubiHSM 2 devices (production + backup)
- USB cables
- Documentation & integration guides
- Yubico libraries (libyubihsm)

**Integration Timeline**:
- Weeks 3-4: Install libyubihsm, implement HSM client library
- Weeks 3-4: USB dongle activation flow (challenge/response)
- Weeks 5-6: License validation in offline mode

## License Token Format

**Stored on YubiHSM USB dongle**:
```json
{
  "installation_uuid": "site_lock_id",
  "hardware_uuid": "motherboard_serial",
  "seats_max": 10,
  "capabilities": ["generate", "export:ue5", "export:unity", "export:godot"],
  "expiry_timestamp": 1735689600,
  "signature": "ed25519_signed_by_hsm"
}
```

**Offline validation**: Compare hardware UUID + check expiry + verify Ed25519 signature

## Site-Locking

Each installation is bound to:
1. **Motherboard UUID** (read from SMBIOS/DMI)
2. **HSM serial** (from YubiHSM device)
3. **Installation UUID** (generated on first boot)

Renewal packages are hardware-locked; cannot be transferred to different systems.
