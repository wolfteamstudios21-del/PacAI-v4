use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::File;
use std::io::{Read, Write};
use std::path::Path;
use walkdir::WalkDir;
use sha2::{Sha384, Digest};
use zip::{ZipWriter, write::SimpleFileOptions};
use ed25519_dalek::{SigningKey, Signature, Signer, VerifyingKey};
use rand::rngs::OsRng;
use anyhow::{Result, Context};
use chrono::Utc;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportManifest {
    pub pacai: String,
    pub generated: String,
    pub seed: String,
    pub checksums: HashMap<String, String>,
    pub exports: Vec<String>,
    pub signature_algorithm: String,
    pub public_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineBundle {
    pub engine: String,
    pub version: String,
    pub files: Vec<String>,
    pub size_bytes: u64,
    pub structure: FolderStructure,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FolderStructure {
    pub root: String,
    pub folders: Vec<String>,
    pub required_files: Vec<String>,
}

pub fn sign_with_keypair(manifest_bytes: &[u8], signing_key: &SigningKey) -> Signature {
    signing_key.sign(manifest_bytes)
}

pub fn verify_signature(manifest_bytes: &[u8], signature: &Signature, verifying_key: &VerifyingKey) -> bool {
    verifying_key.verify_strict(manifest_bytes, signature).is_ok()
}

pub fn create_dev_keypair() -> SigningKey {
    SigningKey::generate(&mut OsRng)
}

pub fn build_export_zone(
    zone_dir: &Path,
    output_zip: &Path,
    seed: &str,
    exports: &[&str],
    signing_key: &SigningKey,
) -> Result<ExportManifest> {
    let mut checksums = HashMap::new();

    for entry in WalkDir::new(zone_dir).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            let p = entry.path();
            let rel = p.strip_prefix(zone_dir)
                .context("Failed to strip prefix")?
                .to_string_lossy()
                .to_string();
            let mut f = File::open(p)?;
            let mut buf = Vec::new();
            f.read_to_end(&mut buf)?;
            let mut hasher = Sha384::new();
            hasher.update(&buf);
            let digest = hasher.finalize();
            checksums.insert(rel, hex::encode(digest));
        }
    }

    let verifying_key = signing_key.verifying_key();
    let public_key_hex = hex::encode(verifying_key.to_bytes());

    let manifest = ExportManifest {
        pacai: "v5.0.0".to_string(),
        generated: Utc::now().to_rfc3339(),
        seed: seed.to_string(),
        checksums: checksums.clone(),
        exports: exports.iter().map(|s| s.to_string()).collect(),
        signature_algorithm: "Ed25519".to_string(),
        public_key: Some(public_key_hex),
    };
    let manifest_bytes = serde_json::to_vec_pretty(&manifest)?;

    let sig = sign_with_keypair(&manifest_bytes, signing_key);
    let sig_hex = hex::encode(sig.to_bytes());

    let file = File::create(output_zip)?;
    let mut zip = ZipWriter::new(file);
    let options = SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    for entry in WalkDir::new(zone_dir).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            let p = entry.path();
            let rel = p.strip_prefix(zone_dir)
                .context("Failed to strip prefix")?
                .to_string_lossy()
                .to_string();
            let mut f = File::open(p)?;
            let mut buf = Vec::new();
            f.read_to_end(&mut buf)?;
            zip.start_file(&rel, options)?;
            zip.write_all(&buf)?;
        }
    }

    zip.start_file("manifest.json", options)?;
    zip.write_all(&manifest_bytes)?;

    zip.start_file("manifest.sig", options)?;
    zip.write_all(sig_hex.as_bytes())?;

    zip.finish()?;
    
    Ok(manifest)
}

pub fn verify_export_bundle(zip_path: &Path, public_key_bytes: &[u8; 32]) -> Result<bool> {
    let file = File::open(zip_path)?;
    let mut archive = zip::ZipArchive::new(file)?;
    
    let mut manifest_bytes = Vec::new();
    {
        let mut manifest_file = archive.by_name("manifest.json")?;
        manifest_file.read_to_end(&mut manifest_bytes)?;
    }
    
    let mut sig_hex = String::new();
    {
        let mut sig_file = archive.by_name("manifest.sig")?;
        sig_file.read_to_string(&mut sig_hex)?;
    }
    
    let sig_bytes = hex::decode(&sig_hex)?;
    let sig_array: [u8; 64] = sig_bytes.try_into()
        .map_err(|_| anyhow::anyhow!("Invalid signature length"))?;
    let signature = Signature::from_bytes(&sig_array);
    
    let verifying_key = VerifyingKey::from_bytes(public_key_bytes)?;
    
    if !verify_signature(&manifest_bytes, &signature, &verifying_key) {
        return Ok(false);
    }
    
    let manifest: ExportManifest = serde_json::from_slice(&manifest_bytes)?;
    
    for (rel_path, expected_hash) in &manifest.checksums {
        let mut file_bytes = Vec::new();
        {
            let mut file = archive.by_name(rel_path)?;
            file.read_to_end(&mut file_bytes)?;
        }
        
        let mut hasher = Sha384::new();
        hasher.update(&file_bytes);
        let actual_hash = hex::encode(hasher.finalize());
        
        if &actual_hash != expected_hash {
            return Ok(false);
        }
    }
    
    Ok(true)
}

pub fn get_engine_bundle(engine: &str) -> EngineBundle {
    match engine.to_lowercase().as_str() {
        "ue5" | "unreal" => unreal_bundle(),
        "unity" => unity_bundle(),
        "godot" => godot_bundle(),
        "roblox" => roblox_bundle(),
        "blender" => blender_bundle(),
        "cryengine" => cryengine_bundle(),
        "source2" => source2_bundle(),
        "webgpu" => webgpu_bundle(),
        "visionos" => visionos_bundle(),
        _ => generic_bundle(engine),
    }
}

fn unreal_bundle() -> EngineBundle {
    EngineBundle {
        engine: "Unreal Engine 5".into(),
        version: "5.3".into(),
        files: vec![
            "Content/Maps/GeneratedMap.umap".into(),
            "Content/Blueprints/NPCs/BP_NPC_Base.uasset".into(),
            "Content/Blueprints/AI/BT_Combat.uasset".into(),
            "Content/Blueprints/AI/BT_Patrol.uasset".into(),
            "Content/DataTables/DT_WorldConfig.uasset".into(),
            "Content/DataTables/DT_EntitySpawns.uasset".into(),
            "Content/Meshes/SM_Terrain.uasset".into(),
            "Content/Materials/M_Terrain_Base.uasset".into(),
            "Content/Textures/T_Terrain_Diffuse.uasset".into(),
            "Config/world.json".into(),
        ],
        size_bytes: 52_428_800,
        structure: FolderStructure {
            root: "Export/UE5".into(),
            folders: vec![
                "Content/Maps".into(),
                "Content/Blueprints/NPCs".into(),
                "Content/Blueprints/AI".into(),
                "Content/DataTables".into(),
                "Content/Meshes".into(),
                "Content/Materials".into(),
                "Content/Textures".into(),
                "Config".into(),
            ],
            required_files: vec!["world.json".into(), "GeneratedMap.umap".into()],
        },
    }
}

fn unity_bundle() -> EngineBundle {
    EngineBundle {
        engine: "Unity".into(),
        version: "2023.2".into(),
        files: vec![
            "Assets/Scenes/GeneratedScene.unity".into(),
            "Assets/Scripts/AI/NPCController.cs".into(),
            "Assets/Scripts/AI/BehaviorTree.cs".into(),
            "Assets/Scripts/World/TerrainManager.cs".into(),
            "Assets/Prefabs/NPC_Base.prefab".into(),
            "Assets/Prefabs/POI_Base.prefab".into(),
            "Assets/Materials/Terrain.mat".into(),
            "Assets/Textures/Terrain_Albedo.png".into(),
            "Assets/World/world.json".into(),
            "ProjectSettings/ProjectSettings.asset".into(),
        ],
        size_bytes: 41_943_040,
        structure: FolderStructure {
            root: "Export/Unity".into(),
            folders: vec![
                "Assets/Scenes".into(),
                "Assets/Scripts/AI".into(),
                "Assets/Scripts/World".into(),
                "Assets/Prefabs".into(),
                "Assets/Materials".into(),
                "Assets/Textures".into(),
                "Assets/World".into(),
                "ProjectSettings".into(),
            ],
            required_files: vec!["world.json".into(), "GeneratedScene.unity".into()],
        },
    }
}

fn godot_bundle() -> EngineBundle {
    EngineBundle {
        engine: "Godot".into(),
        version: "4.2".into(),
        files: vec![
            "project.godot".into(),
            "scenes/main.tscn".into(),
            "scenes/npc.tscn".into(),
            "scenes/poi.tscn".into(),
            "scripts/ai.gd".into(),
            "scripts/npc_controller.gd".into(),
            "scripts/world_manager.gd".into(),
            "resources/terrain.tres".into(),
            "world.json".into(),
        ],
        size_bytes: 15_728_640,
        structure: FolderStructure {
            root: "Export/Godot".into(),
            folders: vec![
                "scenes".into(),
                "scripts".into(),
                "resources".into(),
            ],
            required_files: vec!["project.godot".into(), "world.json".into(), "main.tscn".into()],
        },
    }
}

fn roblox_bundle() -> EngineBundle {
    EngineBundle {
        engine: "Roblox".into(),
        version: "2024".into(),
        files: vec![
            "scripts/npc_ai.lua".into(),
            "scripts/patrol_system.lua".into(),
            "scripts/world_loader.lua".into(),
            "models/npc_base.rbxm".into(),
            "models/terrain.rbxm".into(),
            "world.json".into(),
        ],
        size_bytes: 8_388_608,
        structure: FolderStructure {
            root: "Export/Roblox".into(),
            folders: vec![
                "scripts".into(),
                "models".into(),
            ],
            required_files: vec!["world.json".into(), "npc_ai.lua".into()],
        },
    }
}

fn blender_bundle() -> EngineBundle {
    EngineBundle {
        engine: "Blender".into(),
        version: "4.0".into(),
        files: vec![
            "scene.blend".into(),
            "textures/terrain_diffuse.png".into(),
            "textures/terrain_normal.png".into(),
            "rigs/npc_rig.blend".into(),
            "animations/walk.blend".into(),
            "animations/idle.blend".into(),
            "world.json".into(),
        ],
        size_bytes: 104_857_600,
        structure: FolderStructure {
            root: "Export/Blender".into(),
            folders: vec![
                "textures".into(),
                "rigs".into(),
                "animations".into(),
            ],
            required_files: vec!["scene.blend".into(), "world.json".into()],
        },
    }
}

fn cryengine_bundle() -> EngineBundle {
    EngineBundle {
        engine: "CryEngine".into(),
        version: "5.7".into(),
        files: vec![
            "Levels/GeneratedLevel/level.cry".into(),
            "Levels/GeneratedLevel/leveldata.xml".into(),
            "Assets/Objects/npc_base.cgf".into(),
            "Assets/Materials/terrain.mtl".into(),
            "Assets/Textures/terrain_diff.dds".into(),
            "Scripts/AI/npc_behavior.lua".into(),
            "world.json".into(),
        ],
        size_bytes: 78_643_200,
        structure: FolderStructure {
            root: "Export/CryEngine".into(),
            folders: vec![
                "Levels/GeneratedLevel".into(),
                "Assets/Objects".into(),
                "Assets/Materials".into(),
                "Assets/Textures".into(),
                "Scripts/AI".into(),
            ],
            required_files: vec!["level.cry".into(), "world.json".into()],
        },
    }
}

fn source2_bundle() -> EngineBundle {
    EngineBundle {
        engine: "Source 2".into(),
        version: "2024".into(),
        files: vec![
            "maps/generated.vmap".into(),
            "maps/generated.vmdl".into(),
            "scripts/ai.vscript".into(),
            "scripts/npc_controller.vscript".into(),
            "materials/terrain.vmat".into(),
            "textures/terrain_color.vtex".into(),
            "world.json".into(),
        ],
        size_bytes: 62_914_560,
        structure: FolderStructure {
            root: "Export/Source2".into(),
            folders: vec![
                "maps".into(),
                "scripts".into(),
                "materials".into(),
                "textures".into(),
            ],
            required_files: vec!["generated.vmap".into(), "world.json".into()],
        },
    }
}

fn webgpu_bundle() -> EngineBundle {
    EngineBundle {
        engine: "WebGPU".into(),
        version: "1.0".into(),
        files: vec![
            "index.html".into(),
            "js/main.js".into(),
            "js/renderer.js".into(),
            "js/world-loader.js".into(),
            "shaders/terrain.wgsl".into(),
            "shaders/entity.wgsl".into(),
            "wasm/physics.wasm".into(),
            "assets/world.json".into(),
        ],
        size_bytes: 5_242_880,
        structure: FolderStructure {
            root: "Export/WebGPU".into(),
            folders: vec![
                "js".into(),
                "shaders".into(),
                "wasm".into(),
                "assets".into(),
            ],
            required_files: vec!["index.html".into(), "world.json".into()],
        },
    }
}

fn visionos_bundle() -> EngineBundle {
    EngineBundle {
        engine: "visionOS".into(),
        version: "1.0".into(),
        files: vec![
            "PacAIWorld.reality".into(),
            "Models/terrain.usdz".into(),
            "Models/npc_base.usdz".into(),
            "Audio/spatial_ambience.wav".into(),
            "Audio/npc_dialogue.wav".into(),
            "Scripts/WorldManager.swift".into(),
            "Scripts/NPCController.swift".into(),
            "world.json".into(),
        ],
        size_bytes: 31_457_280,
        structure: FolderStructure {
            root: "Export/visionOS".into(),
            folders: vec![
                "Models".into(),
                "Audio".into(),
                "Scripts".into(),
            ],
            required_files: vec!["PacAIWorld.reality".into(), "world.json".into()],
        },
    }
}

fn generic_bundle(engine: &str) -> EngineBundle {
    EngineBundle {
        engine: engine.to_string(),
        version: "1.0".into(),
        files: vec![
            "world.json".into(),
            "entities.json".into(),
            "terrain.json".into(),
        ],
        size_bytes: 1_048_576,
        structure: FolderStructure {
            root: format!("Export/{}", engine),
            folders: vec![],
            required_files: vec!["world.json".into()],
        },
    }
}

pub fn get_all_engines() -> Vec<&'static str> {
    vec![
        "ue5", "unity", "godot", "roblox", "blender", 
        "cryengine", "source2", "webgpu", "visionos"
    ]
}

pub fn estimate_export_time(engines: &[String], quality: &str) -> u32 {
    let base_time = match quality {
        "high" => 60,
        "medium" => 30,
        "low" => 15,
        _ => 30,
    };
    
    (engines.len() as u32) * base_time
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn test_create_dev_keypair() {
        let key = create_dev_keypair();
        let verifying_key = key.verifying_key();
        assert_eq!(verifying_key.to_bytes().len(), 32);
    }

    #[test]
    fn test_sign_and_verify() {
        let key = create_dev_keypair();
        let message = b"test manifest content";
        let signature = sign_with_keypair(message, &key);
        let verifying_key = key.verifying_key();
        assert!(verify_signature(message, &signature, &verifying_key));
    }
}
