use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoleConfig {
    pub role: String,
    pub permissions: Vec<String>,
    pub tier_limit: Option<u32>,
    pub rate_limit_per_hour: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Permission {
    pub action: String,
    pub resource: String,
}

lazy_static::lazy_static! {
    static ref ROLE_PERMISSIONS: HashMap<&'static str, Vec<&'static str>> = {
        let mut m = HashMap::new();
        m.insert("admin", vec![
            "generate", "override", "export", "audit", "license", 
            "users:manage", "projects:delete", "system:configure"
        ]);
        m.insert("lifetime", vec![
            "generate", "override", "export", "audit",
            "projects:create", "projects:read", "projects:update"
        ]);
        m.insert("creator", vec![
            "generate", "override", "export",
            "projects:create", "projects:read", "projects:update"
        ]);
        m.insert("demo", vec![
            "generate",
            "projects:read"
        ]);
        m
    };
}

pub fn can(role: &str, permission: &str) -> bool {
    match ROLE_PERMISSIONS.get(role) {
        Some(perms) => perms.contains(&permission),
        None => false,
    }
}

pub fn get_tier_limits(tier: &str) -> TierLimits {
    match tier {
        "admin" | "lifetime" => TierLimits {
            generations_per_week: u32::MAX,
            exports_per_day: u32::MAX,
            max_projects: u32::MAX,
            watermark: false,
            priority_queue: true,
        },
        "creator" => TierLimits {
            generations_per_week: 100,
            exports_per_day: 50,
            max_projects: 25,
            watermark: false,
            priority_queue: true,
        },
        "demo" | "free" | _ => TierLimits {
            generations_per_week: 2,
            exports_per_day: 1,
            max_projects: 3,
            watermark: true,
            priority_queue: false,
        },
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct TierLimits {
    pub generations_per_week: u32,
    pub exports_per_day: u32,
    pub max_projects: u32,
    pub watermark: bool,
    pub priority_queue: bool,
}

pub fn validate_action(role: &str, action: &str, resource: &str) -> Result<(), RbacError> {
    let permission = format!("{}:{}", action, resource);
    
    if can(role, &permission) || can(role, action) {
        Ok(())
    } else {
        Err(RbacError::PermissionDenied {
            role: role.to_string(),
            permission,
        })
    }
}

#[derive(Debug, thiserror::Error)]
pub enum RbacError {
    #[error("Permission denied: role '{role}' cannot perform '{permission}'")]
    PermissionDenied { role: String, permission: String },
    
    #[error("Tier limit exceeded: {message}")]
    TierLimitExceeded { message: String },
    
    #[error("Invalid role: {role}")]
    InvalidRole { role: String },
}
