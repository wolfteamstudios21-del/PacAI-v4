use serde::Serialize;
use sha2::{Sha256, Digest};
use std::sync::atomic::{AtomicU64, Ordering};

static AUDIT_COUNTER: AtomicU64 = AtomicU64::new(0);
static mut PREV_HASH: Option<String> = None;

#[derive(Debug, Clone, Serialize)]
pub struct AuditEntry {
    pub sequence: u64,
    pub timestamp: String,
    pub event_type: AuditEventType,
    pub actor: String,
    pub action: String,
    pub resource: String,
    pub details: Option<serde_json::Value>,
    pub prev_hash: String,
    pub hash: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum AuditEventType {
    Auth,
    Generate,
    Override,
    Export,
    License,
    System,
    Error,
}

impl AuditEntry {
    pub fn new(
        event_type: AuditEventType,
        actor: &str,
        action: &str,
        resource: &str,
        details: Option<serde_json::Value>,
    ) -> Self {
        let sequence = AUDIT_COUNTER.fetch_add(1, Ordering::SeqCst);
        let timestamp = chrono::Utc::now().to_rfc3339();
        
        let prev_hash = unsafe {
            PREV_HASH.clone().unwrap_or_else(|| "0".repeat(64))
        };
        
        let hash_input = format!(
            "{}:{}:{}:{}:{}:{}:{}",
            sequence,
            timestamp,
            format!("{:?}", event_type),
            actor,
            action,
            resource,
            prev_hash
        );
        
        let hash = hex::encode(Sha256::digest(hash_input.as_bytes()));
        
        unsafe {
            PREV_HASH = Some(hash.clone());
        }
        
        Self {
            sequence,
            timestamp,
            event_type,
            actor: actor.to_string(),
            action: action.to_string(),
            resource: resource.to_string(),
            details,
            prev_hash,
            hash,
        }
    }
}

pub fn log_auth(actor: &str, action: &str, success: bool) -> AuditEntry {
    AuditEntry::new(
        AuditEventType::Auth,
        actor,
        action,
        "auth",
        Some(serde_json::json!({ "success": success })),
    )
}

pub fn log_generate(actor: &str, project_id: &str, seed: u64) -> AuditEntry {
    AuditEntry::new(
        AuditEventType::Generate,
        actor,
        "generate",
        project_id,
        Some(serde_json::json!({ "seed": seed })),
    )
}

pub fn log_override(actor: &str, project_id: &str, target: &str, behavior: &str) -> AuditEntry {
    AuditEntry::new(
        AuditEventType::Override,
        actor,
        "override",
        project_id,
        Some(serde_json::json!({ 
            "target": target,
            "behavior": behavior 
        })),
    )
}

pub fn log_export(actor: &str, project_id: &str, engines: &[String]) -> AuditEntry {
    AuditEntry::new(
        AuditEventType::Export,
        actor,
        "export",
        project_id,
        Some(serde_json::json!({ "engines": engines })),
    )
}

pub fn log_license(actor: &str, action: &str, tier: &str) -> AuditEntry {
    AuditEntry::new(
        AuditEventType::License,
        actor,
        action,
        "license",
        Some(serde_json::json!({ "tier": tier })),
    )
}

pub fn log_system(action: &str, details: serde_json::Value) -> AuditEntry {
    AuditEntry::new(
        AuditEventType::System,
        "system",
        action,
        "system",
        Some(details),
    )
}

pub fn log_error(actor: &str, action: &str, error: &str) -> AuditEntry {
    AuditEntry::new(
        AuditEventType::Error,
        actor,
        action,
        "error",
        Some(serde_json::json!({ "error": error })),
    )
}

pub fn verify_chain(entries: &[AuditEntry]) -> bool {
    if entries.is_empty() {
        return true;
    }
    
    for i in 1..entries.len() {
        if entries[i].prev_hash != entries[i - 1].hash {
            tracing::error!(
                "Audit chain broken at sequence {}: expected {}, got {}",
                entries[i].sequence,
                entries[i - 1].hash,
                entries[i].prev_hash
            );
            return false;
        }
    }
    
    true
}

pub fn format_log_line(entry: &AuditEntry) -> String {
    format!(
        "[{}] seq={} type={:?} actor={} action={} resource={} hash={}...",
        entry.timestamp,
        entry.sequence,
        entry.event_type,
        entry.actor,
        entry.action,
        entry.resource,
        &entry.hash[..16]
    )
}
