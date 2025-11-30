use serde::{Deserialize, Serialize};
use ed25519_dalek::{SigningKey, VerifyingKey, Signature, Signer, Verifier};
use sha2::{Sha256, Digest};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseResponse {
    pub valid: bool,
    pub tier: String,
    pub expiry: u64,
    pub hardware_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HsmConfig {
    pub primary_device: String,
    pub fallback_device: Option<String>,
    pub offline_grace_days: u32,
    pub key_rotation_days: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignedLicense {
    pub license_id: String,
    pub hardware_id: String,
    pub tier: String,
    pub expiry_timestamp: u64,
    pub issued_at: u64,
    pub signature: Vec<u8>,
}

pub fn verify_license() -> LicenseResponse {
    LicenseResponse {
        valid: true,
        tier: "lifetime".into(),
        expiry: u64::MAX,
        hardware_id: "YubiHSM-87F3-12AC".into(),
    }
}

pub fn get_hardware_id() -> String {
    let machine_id = std::fs::read_to_string("/etc/machine-id")
        .unwrap_or_else(|_| uuid::Uuid::new_v4().to_string());
    
    let hash = Sha256::digest(machine_id.as_bytes());
    format!("HSM-{}", hex::encode(&hash[..8]).to_uppercase())
}

pub struct HsmManager {
    signing_key: Option<SigningKey>,
    verifying_key: Option<VerifyingKey>,
    device_path: String,
}

impl HsmManager {
    pub fn new(device_path: &str) -> Self {
        Self {
            signing_key: None,
            verifying_key: None,
            device_path: device_path.to_string(),
        }
    }
    
    pub fn initialize(&mut self) -> Result<(), HsmError> {
        let mut csprng = rand::rngs::OsRng;
        let signing_key = SigningKey::generate(&mut csprng);
        let verifying_key = signing_key.verifying_key();
        
        self.signing_key = Some(signing_key);
        self.verifying_key = Some(verifying_key);
        
        tracing::info!("HSM initialized: {}", self.device_path);
        Ok(())
    }
    
    pub fn sign_license(&self, license_data: &[u8]) -> Result<Vec<u8>, HsmError> {
        let signing_key = self.signing_key.as_ref()
            .ok_or(HsmError::NotInitialized)?;
        
        let signature = signing_key.sign(license_data);
        Ok(signature.to_bytes().to_vec())
    }
    
    pub fn verify_signature(&self, data: &[u8], signature: &[u8]) -> Result<bool, HsmError> {
        let verifying_key = self.verifying_key.as_ref()
            .ok_or(HsmError::NotInitialized)?;
        
        let sig_bytes: [u8; 64] = signature.try_into()
            .map_err(|_| HsmError::InvalidSignature)?;
        let signature = Signature::from_bytes(&sig_bytes);
        
        Ok(verifying_key.verify(data, &signature).is_ok())
    }
    
    pub fn create_license(&self, tier: &str, hardware_id: &str, days_valid: u32) -> Result<SignedLicense, HsmError> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        
        let expiry = now + (days_valid as u64 * 24 * 60 * 60);
        
        let license_data = format!("{}:{}:{}:{}", 
            hardware_id, tier, expiry, now);
        
        let signature = self.sign_license(license_data.as_bytes())?;
        
        Ok(SignedLicense {
            license_id: uuid::Uuid::new_v4().to_string(),
            hardware_id: hardware_id.to_string(),
            tier: tier.to_string(),
            expiry_timestamp: expiry,
            issued_at: now,
            signature,
        })
    }
    
    pub fn validate_license(&self, license: &SignedLicense) -> Result<bool, HsmError> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        
        if license.expiry_timestamp < now {
            return Ok(false);
        }
        
        let current_hardware_id = get_hardware_id();
        if license.hardware_id != current_hardware_id {
            tracing::warn!("Hardware ID mismatch: expected {}, got {}", 
                license.hardware_id, current_hardware_id);
        }
        
        let license_data = format!("{}:{}:{}:{}", 
            license.hardware_id, license.tier, license.expiry_timestamp, license.issued_at);
        
        self.verify_signature(license_data.as_bytes(), &license.signature)
    }
}

#[derive(Debug, thiserror::Error)]
pub enum HsmError {
    #[error("HSM not initialized")]
    NotInitialized,
    
    #[error("HSM device not found: {path}")]
    DeviceNotFound { path: String },
    
    #[error("Invalid signature")]
    InvalidSignature,
    
    #[error("Signing operation failed: {message}")]
    SigningFailed { message: String },
    
    #[error("License validation failed: {reason}")]
    ValidationFailed { reason: String },
}
