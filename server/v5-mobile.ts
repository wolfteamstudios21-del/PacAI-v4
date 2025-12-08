import { Router, Request, Response } from "express";
import archiver from "archiver";
import { getProject } from "./db";
import { 
  getEngineBundle, 
  getAllEngines, 
  getEngineDisplayName,
  generateUnitySDK, 
  generateGodotSDK, 
  generateBlenderScript, 
  generateWebGPUSDK 
} from "./generation";
import { getProjectState } from "./v5";

const router = Router();

interface MobileExportRequest {
  projectId: string;
  engine?: string;
  includeSDK?: boolean;
}

function generateGLTF(world: any): string {
  const vertices: number[] = [];
  const indices: number[] = [];
  
  if (world?.tiles) {
    for (let y = 0; y < world.tiles.length; y++) {
      for (let x = 0; x < world.tiles[y]?.length || 0; x++) {
        const tile = world.tiles[y][x];
        const height = tile?.height || 0;
        const baseIdx = vertices.length / 3;
        
        vertices.push(x, height, y);
        vertices.push(x + 1, height, y);
        vertices.push(x + 1, height, y + 1);
        vertices.push(x, height, y + 1);
        
        indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
        indices.push(baseIdx, baseIdx + 2, baseIdx + 3);
      }
    }
  }

  return JSON.stringify({
    asset: { version: "2.0", generator: "PacAI v5" },
    scene: 0,
    scenes: [{ name: "PacAI World", nodes: [0] }],
    nodes: [{ name: "Terrain", mesh: 0 }],
    meshes: [{
      name: "TerrainMesh",
      primitives: [{
        attributes: { POSITION: 0 },
        indices: 1,
        mode: 4
      }]
    }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: vertices.length / 3, type: "VEC3" },
      { bufferView: 1, componentType: 5123, count: indices.length, type: "SCALAR" }
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: vertices.length * 4 },
      { buffer: 0, byteOffset: vertices.length * 4, byteLength: indices.length * 2 }
    ],
    buffers: [{ byteLength: vertices.length * 4 + indices.length * 2 }]
  }, null, 2);
}

function generateBlenderImportScript(project: any): string {
  const seed = project?.state?.seed || project?.seed || 12345;
  return `#!/usr/bin/env python3
"""
PacAI v5 - Blender Mobile Import Script
Generated: ${new Date().toISOString()}
Project: ${project?.id || 'unknown'}
"""

import bpy
import json
import os

def import_pacai_world():
    script_dir = os.path.dirname(os.path.realpath(__file__))
    world_path = os.path.join(script_dir, 'world.json')
    gltf_path = os.path.join(script_dir, 'assets', 'scene.gltf')
    
    if os.path.exists(world_path):
        with open(world_path, 'r') as f:
            world = json.load(f)
        print(f"Loaded PacAI world: seed={world.get('seed', ${seed})}")
    
    if os.path.exists(gltf_path):
        bpy.ops.import_scene.gltf(filepath=gltf_path)
        print("Imported GLTF scene")
    
    seed_val = ${seed} % 100
    bpy.ops.mesh.primitive_cube_add(location=(seed_val, 0, 0))
    cube = bpy.context.active_object
    cube.name = "PacAI_Origin"
    
    bpy.ops.object.camera_add(location=(32, -50, 30))
    camera = bpy.context.active_object
    camera.rotation_euler = (1.1, 0, 0)
    
    print("PacAI Blender mobile import: Ready!")
    return {'FINISHED'}

if __name__ == "__main__":
    import_pacai_world()
`;
}

router.post("/v5/export/mobile", async (req: Request, res: Response) => {
  const { projectId, engine = "blender", includeSDK = true } = req.body as MobileExportRequest;

  if (!projectId) {
    return res.status(400).json({ error: "projectId required" });
  }

  const project = await getProject(projectId);
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  // Use shared project state from v5.ts
  const state = getProjectState(projectId);
  const world = state?.result?.world || { tiles: [], weather: { condition: "clear" }, seed: project.seed };
  const entities = state?.entities || [];
  const narrative = state?.result?.narrative || { missions: [] };

  const isMobile = req.headers["user-agent"]?.toLowerCase().includes("mobile") || 
                   req.headers["user-agent"]?.toLowerCase().includes("android") ||
                   req.headers["user-agent"]?.toLowerCase().includes("iphone");

  const engineLower = engine.toLowerCase();
  const bundle = getEngineBundle(engineLower);
  const displayName = getEngineDisplayName(engineLower);

  const zip = archiver("zip", { zlib: { level: 9 } });
  const filename = `pacai-export-${engineLower}-${projectId.slice(0, 8)}.zip`;

  res.set({
    "Content-Type": "application/zip",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Expose-Headers": "Content-Disposition",
    "X-PacAI-Engine": displayName,
    "X-PacAI-Mobile": isMobile ? "true" : "false"
  });

  zip.pipe(res);

  zip.append(JSON.stringify({
    pacai: "v5.3",
    engine: engineLower,
    engine_display: displayName,
    project_id: projectId,
    seed: project.seed,
    generated: new Date().toISOString(),
    world: {
      biome: project.state?.biome || "urban",
      weather: project.state?.weather || "clear",
      entities: entities.length,
      tiles: world.tiles?.length || 0
    },
    narrative: {
      missions: narrative.missions?.length || 0,
      tension: (narrative as any).global_tension ?? 0.5
    }
  }, null, 2), { name: "world.json" });

  zip.append(JSON.stringify(entities, null, 2), { name: "entities.json" });

  if (engineLower === "blender" || engineLower === "unity" || engineLower === "godot") {
    zip.append(generateGLTF(world), { name: "assets/scene.gltf" });
  }

  if (engineLower === "blender") {
    zip.append(generateBlenderImportScript(project), { name: "blender_import.py" });
    if (includeSDK) {
      zip.append(generateBlenderScript(), { name: "sdk/pacai_blender.py" });
    }
  }

  if (engineLower === "unity" && includeSDK) {
    zip.append(generateUnitySDK(), { name: "Assets/Scripts/PacAI/PacAIConstantDraw.cs" });
    zip.append(generateUnitySDK().replace("PacAIConstantDraw", "PacAIOverrideClient"), { name: "Assets/Scripts/PacAI/PacAIOverrideClient.cs" });
  }

  if (engineLower === "godot" && includeSDK) {
    zip.append(generateGodotSDK(), { name: "addons/pacai/pacai_client.gd" });
  }

  if (engineLower === "webgpu" && includeSDK) {
    zip.append(generateWebGPUSDK(), { name: "js/pacai-sdk.js" });
  }

  zip.append(`# PacAI v5 Export - ${displayName}

## Quick Start
1. Extract this ZIP to your project folder
2. Import world.json for world data
3. ${engineLower === "blender" ? "Run blender_import.py in Blender" : "Follow engine-specific setup"}

## Contents
- world.json: World configuration and metadata
- entities.json: All spawned entities with behaviors
- assets/: GLTF models and textures${includeSDK ? "\n- sdk/: PacAI live connection SDK" : ""}

## Live Overrides (Optional)
Connect to wss://pacaiwolfstudio.com/ws for real-time updates.
See sdk/ folder for integration examples.

Generated: ${new Date().toISOString()}
`, { name: "README.md" });

  await zip.finalize();
});

router.get("/v5/export/engines", async (req: Request, res: Response) => {
  const engines = getAllEngines().map(engine => ({
    id: engine,
    name: getEngineDisplayName(engine),
    bundle: getEngineBundle(engine),
    mobile_ready: ["blender", "unity", "godot", "webgpu"].includes(engine)
  }));
  res.json({ engines, mobile_support: true });
});

export default router;
