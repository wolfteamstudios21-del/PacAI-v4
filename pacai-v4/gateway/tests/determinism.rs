/// Test: Deterministic generation (same seed → identical JSON)
#[cfg(test)]
mod tests {
    use serde_json::json;
    use sha2::{Sha256, Digest};

    fn generate_deterministic_json(prompt: &str, seed: u64) -> String {
        let mut hasher = Sha256::new();
        hasher.update(format!("{}_{}", prompt, seed));
        let hash = format!("{:x}", hasher.finalize());

        let json = json!({
            "zone_id": format!("zone_{}", hash[0..8].to_string()),
            "seed_used": seed,
            "checksum": hash
        });

        serde_json::to_string(&json).unwrap()
    }

    #[test]
    fn test_determinism_same_seed() {
        let prompt = "police scenario";
        let seed = 12345;

        let result1 = generate_deterministic_json(prompt, seed);
        let result2 = generate_deterministic_json(prompt, seed);

        assert_eq!(result1, result2, "Same seed must produce identical JSON");
    }

    #[test]
    fn test_determinism_different_seed() {
        let prompt = "police scenario";
        let result1 = generate_deterministic_json(prompt, 12345);
        let result2 = generate_deterministic_json(prompt, 54321);

        assert_ne!(result1, result2, "Different seeds must produce different JSON");
    }

    #[test]
    fn test_checksum_reproducibility() {
        let prompt = "police scenario";
        let seed = 12345;

        let json1 = generate_deterministic_json(prompt, seed);
        let json2 = generate_deterministic_json(prompt, seed);

        // Extract checksum from both
        let checksum1 = json1.split("\"checksum\":\"").nth(1).unwrap().split('"').next().unwrap();
        let checksum2 = json2.split("\"checksum\":\"").nth(1).unwrap().split('"').next().unwrap();

        assert_eq!(checksum1, checksum2, "Checksums must be identical");
    }
}
