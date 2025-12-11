import Replicate from "replicate";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

const UPLOADS_DIR = path.join(process.cwd(), "uploads", "3d-models");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export interface Model3DResult {
  id: string;
  prompt: string;
  modelUrl: string;
  thumbnailUrl?: string;
  format: "glb" | "gltf" | "obj";
  generatedAt: number;
  provider: "replicate" | "fallback";
  polyCount?: string;
}

let replicateClient: Replicate | null = null;

function getReplicateClient(): Replicate | null {
  if (!process.env.REPLICATE_API_TOKEN) {
    console.warn("[generation-model] REPLICATE_API_TOKEN not set");
    return null;
  }
  
  if (!replicateClient) {
    replicateClient = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });
  }
  
  return replicateClient;
}

export async function generate3DModel(
  prompt: string,
  format: "glb" | "gltf" | "obj" = "glb"
): Promise<Model3DResult> {
  const id = uuidv4();
  const client = getReplicateClient();

  if (!client) {
    console.log("[generation-model] No Replicate client, using fallback");
    return generateFallbackModel(id, prompt, format);
  }

  try {
    console.log(`[generation-model] Generating 3D model for: "${prompt.slice(0, 50)}..."`);

    const output = await client.run(
      "stability-ai/triposr:e91b24f793da1f2a2e4f08a73c47cc98a9dd9c19c33f1a08a04b22fbeb46cfd0",
      {
        input: {
          image: await generateInputImage(prompt),
          mc_resolution: 256,
          output_format: format,
        },
      }
    ) as any;

    const modelUrl = typeof output === "string" ? output : output?.mesh_url || output?.[0];
    
    if (!modelUrl) {
      throw new Error("No model URL returned from Replicate");
    }

    const filename = `${id}.${format}`;
    const filepath = path.join(UPLOADS_DIR, filename);
    
    const response = await fetch(modelUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(filepath, buffer);

    const localUrl = `/uploads/3d-models/${filename}`;

    console.log(`[generation-model] Generated 3D model: ${id}`);

    return {
      id,
      prompt,
      modelUrl: localUrl,
      format,
      generatedAt: Date.now(),
      provider: "replicate",
      polyCount: "~10k",
    };
  } catch (error: any) {
    console.error("[generation-model] Replicate error:", error.message);
    return generateFallbackModel(id, prompt, format);
  }
}

async function generateInputImage(prompt: string): Promise<string> {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
      <rect width="512" height="512" fill="#808080"/>
      <polygon points="256,100 400,350 112,350" fill="#404040"/>
      <text x="256" y="450" font-family="Arial" font-size="14" fill="#fff" text-anchor="middle">${prompt.slice(0, 30)}</text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function generateFallbackModel(
  id: string,
  prompt: string,
  format: "glb" | "gltf" | "obj"
): Model3DResult {
  const filename = `${id}.${format}`;
  const filepath = path.join(UPLOADS_DIR, filename);
  
  const placeholderGLB = createMinimalGLB(prompt);
  fs.writeFileSync(filepath, placeholderGLB);

  return {
    id,
    prompt,
    modelUrl: `/uploads/3d-models/${filename}`,
    format,
    generatedAt: Date.now(),
    provider: "fallback",
    polyCount: "placeholder",
  };
}

function createMinimalGLB(prompt: string): Buffer {
  const gltfJson = {
    asset: { version: "2.0", generator: "PacAI v6" },
    scene: 0,
    scenes: [{ name: "Scene", nodes: [0] }],
    nodes: [{ name: prompt.slice(0, 32), mesh: 0 }],
    meshes: [{
      name: "Placeholder",
      primitives: [{
        attributes: { POSITION: 0 },
        indices: 1,
      }],
    }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 4, type: "VEC3", max: [1, 1, 0], min: [-1, -1, 0] },
      { bufferView: 1, componentType: 5123, count: 6, type: "SCALAR" },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: 48 },
      { buffer: 0, byteOffset: 48, byteLength: 12 },
    ],
    buffers: [{ byteLength: 60 }],
  };

  const jsonString = JSON.stringify(gltfJson);
  const jsonBuffer = Buffer.from(jsonString);
  const jsonPadding = (4 - (jsonBuffer.length % 4)) % 4;
  const paddedJson = Buffer.concat([jsonBuffer, Buffer.alloc(jsonPadding, 0x20)]);

  const vertices = new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]);
  const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
  const binBuffer = Buffer.concat([
    Buffer.from(vertices.buffer),
    Buffer.from(indices.buffer),
  ]);
  const binPadding = (4 - (binBuffer.length % 4)) % 4;
  const paddedBin = Buffer.concat([binBuffer, Buffer.alloc(binPadding, 0x00)]);

  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546C67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + paddedJson.length + 8 + paddedBin.length, 8);

  const jsonChunkHeader = Buffer.alloc(8);
  jsonChunkHeader.writeUInt32LE(paddedJson.length, 0);
  jsonChunkHeader.writeUInt32LE(0x4E4F534A, 4);

  const binChunkHeader = Buffer.alloc(8);
  binChunkHeader.writeUInt32LE(paddedBin.length, 0);
  binChunkHeader.writeUInt32LE(0x004E4942, 4);

  return Buffer.concat([header, jsonChunkHeader, paddedJson, binChunkHeader, paddedBin]);
}

export async function generate3DModelBatch(
  prompts: { prompt: string; format?: "glb" | "gltf" | "obj" }[]
): Promise<Model3DResult[]> {
  const results: Model3DResult[] = [];
  
  for (const item of prompts) {
    const result = await generate3DModel(item.prompt, item.format);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  return results;
}
