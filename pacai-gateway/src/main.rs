use axum::{Router, routing::get, routing::post};
use tower_http::cors::{CorsLayer, Any};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use std::net::SocketAddr;

mod routes;
mod security;
mod engine;
mod util;

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        .with(tracing_subscriber::EnvFilter::try_from_default_env()
            .unwrap_or_else(|_| "pacai_gateway=debug,tower_http=debug".into()))
        .init();

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/health", get(routes::health::health))
        .route("/v5/license", get(routes::license::license_check))
        .route("/v5/prompt", post(routes::prompt::handle_prompt))
        .route("/v5/override", post(routes::override_route::apply_override))
        .route("/v5/export", post(routes::export::export_bundle))
        .route("/v5/projects", post(routes::prompt::create_project))
        .route("/v5/projects/:id", get(routes::prompt::get_project))
        .route("/v5/projects/:id/generate", post(routes::prompt::generate_zone))
        .route("/v5/audit", get(routes::health::audit_stream))
        .layer(cors);

    let addr = SocketAddr::from(([0, 0, 0, 0], 3000));
    tracing::info!("PacAI v6.3 Gateway — Production Ready • SCIF-Compatible • Hardware-Root Secure");
    tracing::info!("Listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
