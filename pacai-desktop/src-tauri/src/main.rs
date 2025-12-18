#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
struct GatewayStatus {
    running: bool,
    url: String,
    version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct LicenseInfo {
    valid: bool,
    tier: String,
    expiry: u64,
    hardware_id: String,
    offline_days_remaining: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct GenerationRequest {
    prompt: String,
    seed: Option<u64>,
    project_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct OverrideRequest {
    project_id: String,
    target_type: String,
    behavior: String,
    parameters: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ExportRequest {
    project_id: String,
    engines: Vec<String>,
    quality: String,
}

#[tauri::command]
async fn check_gateway_status() -> Result<GatewayStatus, String> {
    let client = reqwest::Client::new();
    
    match client.get("http://localhost:3000/health")
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await
    {
        Ok(response) => {
            if response.status().is_success() {
                Ok(GatewayStatus {
                    running: true,
                    url: "http://localhost:3000".into(),
                    version: "6.3.0".into(),
                })
            } else {
                Ok(GatewayStatus {
                    running: false,
                    url: "http://localhost:3000".into(),
                    version: "unknown".into(),
                })
            }
        }
        Err(_) => Ok(GatewayStatus {
            running: false,
            url: "http://localhost:3000".into(),
            version: "unknown".into(),
        }),
    }
}

#[tauri::command]
async fn get_license_info() -> Result<LicenseInfo, String> {
    let client = reqwest::Client::new();
    
    match client.get("http://localhost:3000/v5/license")
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await
    {
        Ok(response) => {
            if response.status().is_success() {
                let data: serde_json::Value = response.json().await
                    .map_err(|e| e.to_string())?;
                
                Ok(LicenseInfo {
                    valid: data["valid"].as_bool().unwrap_or(false),
                    tier: data["tier"].as_str().unwrap_or("unknown").to_string(),
                    expiry: data["expiry"].as_u64().unwrap_or(0),
                    hardware_id: data["hardware_id"].as_str().unwrap_or("unknown").to_string(),
                    offline_days_remaining: data["offline_grace_days"].as_u64().unwrap_or(0) as u32,
                })
            } else {
                Err("Failed to fetch license".into())
            }
        }
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
async fn generate_world(request: GenerationRequest) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    
    let response = client.post("http://localhost:3000/v5/prompt")
        .json(&request)
        .timeout(std::time::Duration::from_secs(60))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    
    if response.status().is_success() {
        response.json().await.map_err(|e| e.to_string())
    } else {
        Err(format!("Generation failed: {}", response.status()))
    }
}

#[tauri::command]
async fn apply_override(request: OverrideRequest) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    
    let response = client.post("http://localhost:3000/v5/override")
        .json(&request)
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    
    if response.status().is_success() {
        response.json().await.map_err(|e| e.to_string())
    } else {
        Err(format!("Override failed: {}", response.status()))
    }
}

#[tauri::command]
async fn export_bundle(request: ExportRequest) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    
    let response = client.post("http://localhost:3000/v5/export")
        .json(&request)
        .timeout(std::time::Duration::from_secs(300))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    
    if response.status().is_success() {
        response.json().await.map_err(|e| e.to_string())
    } else {
        Err(format!("Export failed: {}", response.status()))
    }
}

#[tauri::command]
fn get_app_info() -> serde_json::Value {
    serde_json::json!({
        "name": "PacAI v6.3 Desktop",
        "version": "6.3.0",
        "build": "production",
        "platform": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "features": [
            "offline_first",
            "hardware_root_licensing",
            "multi_engine_export",
            "live_overrides"
        ]
    })
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let window = app.get_window("main").unwrap();
            
            window.set_title("PacAI v6.3 — Enterprise Defense Simulation").unwrap();
            
            app.listen_global("restart-gateway", |_| {
                println!("Gateway restart requested");
            });
            
            app.listen_global("check-license", |_| {
                println!("License check requested");
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            check_gateway_status,
            get_license_info,
            generate_world,
            apply_override,
            export_bundle,
            get_app_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running PacAI Desktop");
}
