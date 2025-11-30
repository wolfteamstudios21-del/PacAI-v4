use axum::response::Json;
use serde::Serialize;
use crate::security::hsm;

#[derive(Serialize)]
pub struct LicenseResponse {
    pub valid: bool,
    pub tier: String,
    pub expiry: u64,
    pub hardware_id: String,
    pub seats_used: u32,
    pub seats_total: u32,
    pub features: Vec<String>,
    pub offline_grace_days: u32,
    pub last_validation: String,
}

pub async fn license_check() -> Json<LicenseResponse> {
    let hsm_response = hsm::verify_license();
    
    Json(LicenseResponse {
        valid: hsm_response.valid,
        tier: hsm_response.tier,
        expiry: hsm_response.expiry,
        hardware_id: hsm_response.hardware_id,
        seats_used: 1,
        seats_total: 10,
        features: vec![
            "unlimited_generations".into(),
            "priority_support".into(),
            "multi_engine_export".into(),
            "custom_behaviors".into(),
            "team_collaboration".into(),
        ],
        offline_grace_days: 30,
        last_validation: chrono::Utc::now().to_rfc3339(),
    })
}
