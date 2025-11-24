use axum::{
    extract::{State, Json, middleware},
    middleware::Next,
    response::IntoResponse,
    routing::{get, post},
    http::{StatusCode, Request},
    Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;

mod rbac;
mod auth;
mod license;

use rbac::{Role, RbacMiddleware};

#[derive(Clone)]
pub struct AppState {
    instance_uuid: String,
    offline_mode: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct HealthResponse {
    status: String,
    version: String,
    instance_uuid: String,
    offline_mode: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct AuthHandshakeRequest {
    identity_method: String, // "sso" | "x509" | "api_key"
    credential: String,
    offline_mode: Option<bool>,
    client_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct AuthHandshakeResponse {
    session_token: String,
    user: UserInfo,
    license_status: LicenseStatus,
}

#[derive(Debug, Serialize, Deserialize)]
struct UserInfo {
    id: String,
    roles: Vec<String>,
    projects: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct LicenseStatus {
    seats_used: u32,
    seats_max: u32,
    expiry: String,
    capabilities: Vec<String>,
}

async fn health(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let response = HealthResponse {
        status: "healthy".to_string(),
        version: "0.1.0-alpha".to_string(),
        instance_uuid: state.instance_uuid.clone(),
        offline_mode: state.offline_mode,
    };
    (StatusCode::OK, Json(response))
}

async fn auth_handshake(
    State(state): State<Arc<AppState>>,
    Json(req): Json<AuthHandshakeRequest>,
) -> impl IntoResponse {
    match auth::validate_identity(&req.identity_method, &req.credential, state.offline_mode).await {
        Ok(user_id) => {
            let response = AuthHandshakeResponse {
                session_token: format!("jwt_token_{}", Uuid::new_v4()),
                user: UserInfo {
                    id: user_id,
                    roles: vec!["operator".to_string(), "auditor".to_string()],
                    projects: vec![],
                },
                license_status: LicenseStatus {
                    seats_used: 1,
                    seats_max: 10,
                    expiry: "2026-12-31".to_string(),
                    capabilities: vec!["generate".to_string(), "export:ue5".to_string()],
                },
            };
            (StatusCode::OK, Json(response))
        }
        Err(_) => (StatusCode::UNAUTHORIZED, Json(serde_json::json!({"error": "Authentication failed"}))),
    }
}

async fn rbac_middleware<B>(
    req: Request<B>,
    next: Next,
) -> Result<impl IntoResponse, StatusCode> {
    // Extract role from headers (stub for now)
    let role = req
        .headers()
        .get("X-User-Role")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("operator");

    // Check if user has permission (stub)
    let path = req.uri().path();
    if path.starts_with("/admin") && role != "admin" {
        return Err(StatusCode::FORBIDDEN);
    }

    Ok(next.run(req).await)
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let instance_uuid = Uuid::new_v4().to_string();
    let offline_mode = std::env::var("OFFLINE_MODE")
        .unwrap_or_default()
        .to_lowercase() == "true";

    let state = Arc::new(AppState {
        instance_uuid,
        offline_mode,
    });

    let app = Router::new()
        .route("/health", get(health))
        .route("/auth/handshake", post(auth_handshake))
        .with_state(state)
        .layer(middleware::from_fn(rbac_middleware));

    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000")
        .await
        .expect("Failed to bind to port 3000");

    tracing::info!("v4 Gateway listening on http://127.0.0.1:3000");

    axum::serve(listener, app)
        .await
        .expect("Server error");
}
