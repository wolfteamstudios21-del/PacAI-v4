use axum::response::Json;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Deserialize)]
pub struct OverrideRequest {
    pub project_id: String,
    pub target_type: String,
    pub target_id: Option<String>,
    pub behavior: String,
    pub parameters: serde_json::Value,
    pub priority: Option<u32>,
}

#[derive(Serialize)]
pub struct OverrideResponse {
    pub id: String,
    pub project_id: String,
    pub status: String,
    pub applied_at: String,
    pub target_type: String,
    pub target_id: String,
    pub behavior: String,
    pub checksum: String,
}

pub async fn apply_override(Json(payload): Json<OverrideRequest>) -> Json<OverrideResponse> {
    let id = Uuid::new_v4().to_string();
    let target_id = payload.target_id.unwrap_or_else(|| "all".into());
    
    let checksum = format!("{:x}", sha2::Sha256::digest(
        format!("{}{}{}{}", id, payload.project_id, payload.behavior, payload.parameters).as_bytes()
    ));
    
    Json(OverrideResponse {
        id,
        project_id: payload.project_id,
        status: "applied".into(),
        applied_at: chrono::Utc::now().to_rfc3339(),
        target_type: payload.target_type,
        target_id,
        behavior: payload.behavior,
        checksum,
    })
}

use sha2::Digest;
