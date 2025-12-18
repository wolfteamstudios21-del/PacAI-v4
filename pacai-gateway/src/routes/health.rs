use axum::{
    response::{Json, sse::{Event, Sse}},
};
use serde::{Deserialize, Serialize};
use std::convert::Infallible;
use tokio_stream::StreamExt as _;
use futures::stream::{self, Stream};

#[derive(Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub version: String,
    pub mode: String,
    pub uptime_seconds: u64,
    pub features: Vec<String>,
}

pub async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "operational".into(),
        version: "6.3.0".into(),
        mode: "production".into(),
        uptime_seconds: 0,
        features: vec![
            "hardware_root_licensing".into(),
            "offline_first".into(),
            "deterministic_generation".into(),
            "hash_chained_audit".into(),
            "multi_engine_export".into(),
            "scif_compatible".into(),
        ],
    })
}

#[derive(Serialize)]
pub struct AuditEvent {
    pub id: String,
    pub timestamp: String,
    pub event_type: String,
    pub actor: String,
    pub action: String,
    pub resource: String,
    pub prev_hash: String,
    pub hash: String,
}

pub async fn audit_stream() -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let stream = stream::repeat_with(|| {
        let event = AuditEvent {
            id: uuid::Uuid::new_v4().to_string(),
            timestamp: chrono::Utc::now().to_rfc3339(),
            event_type: "system".into(),
            actor: "gateway".into(),
            action: "heartbeat".into(),
            resource: "system".into(),
            prev_hash: "0".repeat(64),
            hash: hex::encode(sha2::Sha256::digest(b"heartbeat")),
        };
        Event::default().json_data(event).unwrap()
    })
    .map(Ok)
    .throttle(std::time::Duration::from_secs(5));

    Sse::new(stream)
}

use sha2::Digest;
use futures;
use tokio_stream;
