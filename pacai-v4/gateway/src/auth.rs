use anyhow::Result;

pub async fn validate_identity(
    method: &str,
    credential: &str,
    offline_mode: bool,
) -> Result<String> {
    match method {
        "api_key" => {
            if credential.starts_with("sk_") {
                Ok(format!("user_from_api_key"))
            } else {
                Err(anyhow::anyhow!("Invalid API key format"))
            }
        }
        "sso" => {
            if offline_mode {
                Err(anyhow::anyhow!("SSO unavailable in offline mode"))
            } else {
                Ok(format!("user_from_sso"))
            }
        }
        "x509" => {
            if credential.contains("BEGIN CERTIFICATE") {
                Ok(format!("user_from_x509"))
            } else {
                Err(anyhow::anyhow!("Invalid X.509 certificate"))
            }
        }
        _ => Err(anyhow::anyhow!("Unknown identity method")),
    }
}
