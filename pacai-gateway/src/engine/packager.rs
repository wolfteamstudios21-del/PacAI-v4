use serde::{Deserialize, Serialize};
use std::collections::HashMap;

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
