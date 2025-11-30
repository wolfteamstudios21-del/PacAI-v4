use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use axum::{
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::Response,
};

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
            "generate", "override", "export", "audit:read", "license:manage", 
            "users:manage", "project:create", "project:read", "project:update", 
            "project:delete", "system:configure"
        ]);
        m.insert("operator", vec![
            "generate", "override", "export", "audit:read",
            "project:read", "project:update"
        ]);
        m.insert("lifetime", vec![
            "generate", "override", "export", "audit:read",
            "project:create", "project:read", "project:update"
        ]);
        m.insert("creator", vec![
            "generate", "export",
            "project:create", "project:read", "project:update"
        ]);
        m.insert("demo", vec![
            "generate",
            "project:read"
        ]);
        m.insert("auditor", vec![
            "audit:read",
            "project:read"
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

pub fn get_role_permissions(role: &str) -> Vec<&'static str> {
    ROLE_PERMISSIONS.get(role).cloned().unwrap_or_default()
}

pub fn get_all_roles() -> Vec<&'static str> {
    vec!["admin", "operator", "lifetime", "creator", "demo", "auditor"]
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
        "operator" => TierLimits {
            generations_per_week: 500,
            exports_per_day: 100,
            max_projects: 50,
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
        "auditor" => TierLimits {
            generations_per_week: 0,
            exports_per_day: 0,
            max_projects: 0,
            watermark: false,
            priority_queue: false,
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

pub fn require_permission(role: &str, permission: &str) -> Result<(), RbacError> {
    if can(role, permission) {
        Ok(())
    } else {
        Err(RbacError::PermissionDenied {
            role: role.to_string(),
            permission: permission.to_string(),
        })
    }
}

pub async fn require_generate(request: Request, next: Next) -> Result<Response, StatusCode> {
    let role = extract_role_from_request(&request);
    if can(&role, "generate") {
        Ok(next.run(request).await)
    } else {
        Err(StatusCode::FORBIDDEN)
    }
}

pub async fn require_export(request: Request, next: Next) -> Result<Response, StatusCode> {
    let role = extract_role_from_request(&request);
    if can(&role, "export") {
        Ok(next.run(request).await)
    } else {
        Err(StatusCode::FORBIDDEN)
    }
}

pub async fn require_override(request: Request, next: Next) -> Result<Response, StatusCode> {
    let role = extract_role_from_request(&request);
    if can(&role, "override") {
        Ok(next.run(request).await)
    } else {
        Err(StatusCode::FORBIDDEN)
    }
}

pub async fn require_audit_read(request: Request, next: Next) -> Result<Response, StatusCode> {
    let role = extract_role_from_request(&request);
    if can(&role, "audit:read") {
        Ok(next.run(request).await)
    } else {
        Err(StatusCode::FORBIDDEN)
    }
}

pub async fn require_admin(request: Request, next: Next) -> Result<Response, StatusCode> {
    let role = extract_role_from_request(&request);
    if role == "admin" {
        Ok(next.run(request).await)
    } else {
        Err(StatusCode::FORBIDDEN)
    }
}

fn extract_role_from_request(request: &Request) -> String {
    request
        .headers()
        .get("x-pacai-role")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("demo")
        .to_string()
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_admin_has_all_permissions() {
        assert!(can("admin", "generate"));
        assert!(can("admin", "export"));
        assert!(can("admin", "override"));
        assert!(can("admin", "license:manage"));
        assert!(can("admin", "users:manage"));
    }

    #[test]
    fn test_auditor_read_only() {
        assert!(can("auditor", "audit:read"));
        assert!(can("auditor", "project:read"));
        assert!(!can("auditor", "generate"));
        assert!(!can("auditor", "export"));
    }

    #[test]
    fn test_demo_limited() {
        assert!(can("demo", "generate"));
        assert!(can("demo", "project:read"));
        assert!(!can("demo", "export"));
        assert!(!can("demo", "override"));
    }

    #[test]
    fn test_tier_limits() {
        let admin = get_tier_limits("admin");
        assert_eq!(admin.generations_per_week, u32::MAX);
        
        let demo = get_tier_limits("demo");
        assert_eq!(demo.generations_per_week, 2);
        assert!(demo.watermark);
    }
}
