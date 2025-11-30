use axum::response::Json;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use crate::engine::packager;

#[derive(Deserialize)]
pub struct ExportRequest {
    pub project_id: String,
    pub engines: Vec<String>,
    pub include_assets: Option<bool>,
    pub quality: Option<String>,
}

#[derive(Serialize)]
pub struct ExportResponse {
    pub id: String,
    pub project_id: String,
    pub status: String,
    pub engines: Vec<EngineExport>,
    pub total_size_bytes: u64,
    pub download_url: String,
    pub expires_at: String,
}

#[derive(Serialize)]
pub struct EngineExport {
    pub engine: String,
    pub status: String,
    pub files: Vec<String>,
    pub size_bytes: u64,
}

pub async fn export_bundle(Json(payload): Json<ExportRequest>) -> Json<ExportResponse> {
    let id = Uuid::new_v4().to_string();
    
    let engines: Vec<EngineExport> = payload.engines.iter().map(|engine| {
        let bundle = packager::get_engine_bundle(engine);
        EngineExport {
            engine: engine.clone(),
            status: "ready".into(),
            files: bundle.files,
            size_bytes: bundle.size_bytes,
        }
    }).collect();
    
    let total_size: u64 = engines.iter().map(|e| e.size_bytes).sum();
    
    Json(ExportResponse {
        id: id.clone(),
        project_id: payload.project_id,
        status: "completed".into(),
        engines,
        total_size_bytes: total_size,
        download_url: format!("/v5/export/{}/download", id),
        expires_at: (chrono::Utc::now() + chrono::Duration::hours(24)).to_rfc3339(),
    })
}
