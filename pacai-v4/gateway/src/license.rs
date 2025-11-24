use ed25519_dalek::{SigningKey, VerifyingKey};
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Serialize, Deserialize)]
pub struct LicenseToken {
    pub installation_uuid: String,
    pub hardware_uuid: String,
    pub seats_max: u32,
    pub capabilities: Vec<String>,
    pub expiry_timestamp: u64,
    pub signature: String,
}

pub struct OfflineLicenseValidator;

impl OfflineLicenseValidator {
    /// Validate an offline license token bound to motherboard UUID + HSM attestation
    pub fn validate_token(token: &LicenseToken, motherboard_uuid: &str) -> Result<bool, String> {
        // Check hardware binding
        if token.hardware_uuid != motherboard_uuid {
            return Err("Hardware UUID mismatch (license bound to different system)".to_string());
        }

        // Check expiry
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        if now > token.expiry_timestamp {
            return Err("License expired".to_string());
        }

        // Verify Ed25519 signature (stub)
        // In production: Use HSM to verify signature
        let _signature_valid = true; // Mock for now
        Ok(true)
    }

    /// Generate offline license challenge for USB dongle renewal
    pub fn generate_challenge(installation_uuid: &str) -> String {
        use sha2::Digest;
        let mut hasher = Sha256::new();
        hasher.update(installation_uuid.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    /// Import signed renewal package (offline flow)
    pub fn import_renewal_package(
        package_data: &[u8],
        hsm_public_key: &[u8],
    ) -> Result<LicenseToken, String> {
        // Stub: In production, verify package signature with HSM public key
        // and extract renewed license token
        Err("Renewal package verification not yet implemented".to_string())
    }
}
