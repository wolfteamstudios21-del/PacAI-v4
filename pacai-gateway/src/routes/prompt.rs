use axum::{
    extract::Path,
    response::Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use crate::engine::{narrative, world};
use crate::security::rbac;

#[derive(Deserialize)]
pub struct PromptRequest {
    pub prompt: String,
    pub seed: Option<u64>,
    pub style: Option<String>,
    pub constraints: Option<Vec<String>>,
}

#[derive(Serialize)]
pub struct PromptResponse {
    pub id: String,
    pub status: String,
    pub narrative: narrative::NarrativeOutput,
    pub world: world::WorldOutput,
    pub checksum: String,
}

pub async fn handle_prompt(Json(payload): Json<PromptRequest>) -> Json<PromptResponse> {
    let id = Uuid::new_v4().to_string();
    let seed = payload.seed.unwrap_or_else(|| rand::random());
    
    let narrative_output = narrative::generate(&payload.prompt, seed);
    let world_output = world::generate(&payload.prompt, seed);
    
    let checksum = format!("{:x}", sha2::Sha256::digest(
        format!("{}{}{}", id, seed, payload.prompt).as_bytes()
    ));
    
    Json(PromptResponse {
        id,
        status: "completed".into(),
        narrative: narrative_output,
        world: world_output,
        checksum,
    })
}

#[derive(Deserialize)]
pub struct CreateProjectRequest {
    pub name: String,
    pub tier: String,
    pub seed: Option<u64>,
}

#[derive(Serialize)]
pub struct ProjectResponse {
    pub id: String,
    pub name: String,
    pub tier: String,
    pub seed: u64,
    pub created_at: String,
    pub status: String,
}

pub async fn create_project(Json(payload): Json<CreateProjectRequest>) -> Json<ProjectResponse> {
    let id = Uuid::new_v4().to_string();
    let seed = payload.seed.unwrap_or_else(|| rand::random());
    
    Json(ProjectResponse {
        id,
        name: payload.name,
        tier: payload.tier,
        seed,
        created_at: chrono::Utc::now().to_rfc3339(),
        status: "active".into(),
    })
}

pub async fn get_project(Path(id): Path<String>) -> Json<ProjectResponse> {
    Json(ProjectResponse {
        id: id.clone(),
        name: format!("Project-{}", &id[..8]),
        tier: "lifetime".into(),
        seed: 42,
        created_at: chrono::Utc::now().to_rfc3339(),
        status: "active".into(),
    })
}

#[derive(Deserialize)]
pub struct GenerateZoneRequest {
    pub zone_type: String,
    pub seed: Option<u64>,
    pub overrides: Option<serde_json::Value>,
}

#[derive(Serialize)]
pub struct GenerateZoneResponse {
    pub zone_id: String,
    pub zone_type: String,
    pub seed: u64,
    pub checksum: String,
    pub entities: Vec<world::Entity>,
    pub terrain: world::TerrainData,
}

pub async fn generate_zone(
    Path(project_id): Path<String>,
    Json(payload): Json<GenerateZoneRequest>,
) -> Json<GenerateZoneResponse> {
    let zone_id = Uuid::new_v4().to_string();
    let seed = payload.seed.unwrap_or_else(|| rand::random());
    
    let world_output = world::generate(&payload.zone_type, seed);
    
    let checksum = format!("{:x}", sha2::Sha256::digest(
        format!("{}{}{}", project_id, zone_id, seed).as_bytes()
    ));
    
    Json(GenerateZoneResponse {
        zone_id,
        zone_type: payload.zone_type,
        seed,
        checksum,
        entities: world_output.entities,
        terrain: world_output.terrain,
    })
}

use sha2::Digest;
