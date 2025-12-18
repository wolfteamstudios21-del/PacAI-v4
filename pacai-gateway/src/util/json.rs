use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

pub fn merge_json(base: &Value, overlay: &Value) -> Value {
    match (base, overlay) {
        (Value::Object(base_map), Value::Object(overlay_map)) => {
            let mut result = base_map.clone();
            for (key, value) in overlay_map {
                result.insert(
                    key.clone(),
                    if let Some(base_value) = base_map.get(key) {
                        merge_json(base_value, value)
                    } else {
                        value.clone()
                    },
                );
            }
            Value::Object(result)
        }
        (_, overlay) => overlay.clone(),
    }
}

pub fn extract_field<T: for<'de> Deserialize<'de>>(json: &Value, path: &str) -> Option<T> {
    let parts: Vec<&str> = path.split('.').collect();
    let mut current = json;
    
    for part in parts {
        current = current.get(part)?;
    }
    
    serde_json::from_value(current.clone()).ok()
}

pub fn set_field(json: &mut Value, path: &str, value: Value) -> Result<(), JsonError> {
    let parts: Vec<&str> = path.split('.').collect();
    let mut current = json;
    
    for (i, part) in parts.iter().enumerate() {
        if i == parts.len() - 1 {
            if let Value::Object(map) = current {
                map.insert(part.to_string(), value);
                return Ok(());
            }
            return Err(JsonError::InvalidPath(path.to_string()));
        }
        
        current = current.get_mut(*part)
            .ok_or_else(|| JsonError::InvalidPath(path.to_string()))?;
    }
    
    Err(JsonError::InvalidPath(path.to_string()))
}

pub fn validate_schema(json: &Value, required_fields: &[&str]) -> Result<(), JsonError> {
    for field in required_fields {
        if extract_field::<Value>(json, field).is_none() {
            return Err(JsonError::MissingField(field.to_string()));
        }
    }
    Ok(())
}

pub fn create_world_json(
    id: &str,
    name: &str,
    seed: u64,
    entities: &Value,
    terrain: &Value,
) -> Value {
    json!({
        "version": "6.3.0",
        "format": "pacai_world_v6",
        "id": id,
        "name": name,
        "seed": seed,
        "generated_at": chrono::Utc::now().to_rfc3339(),
        "entities": entities,
        "terrain": terrain,
        "metadata": {
            "generator": "PacAI v6.3 Gateway",
            "deterministic": true
        }
    })
}

#[derive(Debug, thiserror::Error)]
pub enum JsonError {
    #[error("Invalid JSON path: {0}")]
    InvalidPath(String),
    
    #[error("Missing required field: {0}")]
    MissingField(String),
    
    #[error("Type mismatch at path: {0}")]
    TypeMismatch(String),
    
    #[error("Serialization error: {0}")]
    SerializationError(String),
}
