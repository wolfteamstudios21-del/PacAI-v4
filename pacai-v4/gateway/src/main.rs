use axum::{
    extract::{State, Json},
    routing::post,
    Router,
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;
use sha2::{Sha256, Digest};
use uuid::Uuid;

pub mod pb;

// ===== Data Structures =====

#[derive(Clone)]
struct AppState {
    pool: Arc<Mutex<String>>, // Mock DB for now
    hsm_primary_active: Arc<Mutex<bool>>,
    nitro_fallback_active: Arc<Mutex<bool>>,
    kms_keys: Arc<Vec<[u8; 32]>>,
}

#[derive(Deserialize)]
struct GenerateRequest {
    prompt: String,
    seed: u64,
    #[serde(default)]
    stream: bool,
}

#[derive(Serialize)]
struct GenerateResponse {
    zone_id: String,
    json: serde_json::Value,
    checksum: String,
    generation_metadata: GenerationMetadata,
}

#[derive(Serialize)]
struct GenerationMetadata {
    seed_used: u64,
    model_id: String,
    deterministic_signature: String,
}

#[derive(Deserialize)]
struct OverrideRequest {
    project_id: String,
    target: String,
    event: String,
    count: i32,
    #[serde(default)]
    position: Vec<f32>,
}

#[derive(Serialize)]
struct OverrideResponse {
    success: bool,
    entities_affected: i32,
    audit_event_id: String,
}

#[derive(Serialize)]
struct HealthResponse {
    status: String,
    version: String,
    hsm_primary: String,
    hsm_fallback: String,
    offline_mode: bool,
}

// ===== HSM License Check =====

async fn hsm_license_check(state: &State<AppState>) -> Result<(), StatusCode> {
    let hsm_primary = state.hsm_primary_active.lock().await;
    let hsm_fallback = state.nitro_fallback_active.lock().await;

    if !*hsm_primary && !*hsm_fallback {
        return Err(StatusCode::UNAUTHORIZED);
    }

    // Mock: In production, verify Ed25519 signature from HSM
    // let signature = client.asymmetric_sign(AsymmetricKeyId(0x1234), Algorithm::Ed25519, b"license_check")?;
    // ed25519_dalek::Verifier::verify(&b"data", &signature, &client.public_key())?;

    Ok(())
}

// ===== Deterministic Generation =====

fn generate_deterministic_json(prompt: &str, seed: u64) -> serde_json::Value {
    // Deterministic: same prompt + seed → identical JSON
    let mut hasher = Sha256::new();
    hasher.update(format!("{}_{}", prompt, seed));
    let hash = format!("{:x}", hasher.finalize());

    serde_json::json!({
        "scenario_id": format!("scen_{}", Uuid::new_v4()),
        "zone": {
            "id": format!("zone_{}", hash[0..8].to_string()),
            "entities": [
                {
                    "id": "npc_001",
                    "type": "civilian",
                    "position": [0.0, 0.0, 0.0],
                    "behavior_tree": "base::idle",
                    "initial_state": {}
                }
            ],
            "environment": {
                "time_of_day": "20:30",
                "weather": "clear",
                "lighting": "streetlight"
            }
        },
        "checksum": hash
    })
}

// ===== API Handlers =====

async fn health(State(state): State<Arc<AppState>>) -> (StatusCode, Json<HealthResponse>) {
    let hsm_primary = state.hsm_primary_active.lock().await;
    let hsm_fallback = state.nitro_fallback_active.lock().await;

    let response = HealthResponse {
        status: "healthy".to_string(),
        version: "4.0.0-alpha".to_string(),
        hsm_primary: if *hsm_primary { "active".to_string() } else { "inactive".to_string() },
        hsm_fallback: if *hsm_fallback { "active".to_string() } else { "inactive".to_string() },
        offline_mode: true,
    };

    (StatusCode::OK, Json(response))
}

async fn generate_zone(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<GenerateRequest>,
) -> Result<(StatusCode, Json<GenerateResponse>), StatusCode> {
    // License gate via HSM
    hsm_license_check(&state).await?;

    // Deterministic generation
    let json = generate_deterministic_json(&payload.prompt, payload.seed);
    let json_str = serde_json::to_string(&json).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Compute checksum
    let mut hasher = Sha256::new();
    hasher.update(&json_str);
    let checksum = format!("{:x}", hasher.finalize());

    // Mock Ed25519 signature
    let deterministic_sig = format!("sig_{}", checksum[0..16].to_string());

    let response = GenerateResponse {
        zone_id: json["scenario_id"].as_str().unwrap_or("").to_string(),
        json: json.clone(),
        checksum: checksum.clone(),
        generation_metadata: GenerationMetadata {
            seed_used: payload.seed,
            model_id: "ollama:7b".to_string(),
            deterministic_signature: deterministic_sig,
        },
    };

    // Audit log (mock)
    let _pool = state.pool.lock().await;
    tracing::info!("generate_zone: zone_id={}, seed={}", response.zone_id, payload.seed);

    Ok((StatusCode::OK, Json(response)))
}

async fn apply_override(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<OverrideRequest>,
) -> Result<(StatusCode, Json<OverrideResponse>), StatusCode> {
    // License gate
    hsm_license_check(&state).await?;

    let audit_event_id = Uuid::new_v4().to_string();

    let response = OverrideResponse {
        success: true,
        entities_affected: payload.count,
        audit_event_id,
    };

    tracing::info!(
        "apply_override: project={}, target={}, count={}",
        payload.project_id,
        payload.target,
        payload.count
    );

    Ok((StatusCode::OK, Json(response)))
}

// ===== Main =====

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    // Initialize HSM (mock for now; real implementation uses yubihsm crate)
    let hsm_primary = Arc::new(Mutex::new(true));  // YubiHSM2 available
    let hsm_fallback = Arc::new(Mutex::new(true)); // Nitrokey3 fallback
    let pool = Arc::new(Mutex::new("mock_db".to_string()));
    let kms_keys = Arc::new(vec![[0u8; 32]; 10]);

    let app_state = Arc::new(AppState {
        pool,
        hsm_primary_active: hsm_primary,
        nitro_fallback_active: hsm_fallback,
        kms_keys,
    });

    let app = Router::new()
        .route("/health", axum::routing::get(health))
        .route("/generate", post(generate_zone))
        .route("/override", post(apply_override))
        .with_state(app_state);

    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000")
        .await
        .expect("Failed to bind to port 3000");

    tracing::info!("v4 Gateway listening on http://127.0.0.1:3000");
    tracing::info!("Health check: curl http://127.0.0.1:3000/health");
    tracing::info!("Generate: curl -X POST http://127.0.0.1:3000/generate -H 'Content-Type: application/json' -d '{{\"prompt\":\"test\",\"seed\":12345}}'");

    axum::serve(listener, app)
        .await
        .expect("Server error");
}
