#[derive(Debug, Clone, PartialEq)]
pub enum Role {
    Admin,
    Instructor,
    Operator,
    Auditor,
    Integrator,
}

impl Role {
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "admin" => Some(Role::Admin),
            "instructor" => Some(Role::Instructor),
            "operator" => Some(Role::Operator),
            "auditor" => Some(Role::Auditor),
            "integrator" => Some(Role::Integrator),
            _ => None,
        }
    }

    pub fn can_access(&self, resource: &str) -> bool {
        match self {
            Role::Admin => true,
            Role::Instructor => {
                !resource.starts_with("/admin/keys")
                    && !resource.starts_with("/admin/license")
            }
            Role::Operator => {
                !resource.starts_with("/admin") && !resource.starts_with("/generate")
            }
            Role::Auditor => resource.starts_with("/audit"),
            Role::Integrator => resource.starts_with("/models") || resource.starts_with("/exporters"),
        }
    }
}

pub struct RbacMiddleware;

impl RbacMiddleware {
    pub fn enforce(user_role: Role, resource: &str) -> Result<(), String> {
        if user_role.can_access(resource) {
            Ok(())
        } else {
            Err(format!("Role {:?} cannot access {}", user_role, resource))
        }
    }
}
