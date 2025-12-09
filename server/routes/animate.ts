import { Router, Response } from "express";
import { TierRequest, getTierLimits } from "../middleware/tiers";
import { v4 as uuidv4 } from "uuid";

const router = Router();

interface Rig {
  id: string;
  type: 'humanoid' | 'creature' | 'vehicle' | 'prop';
  bones: number;
  joints: { name: string; parent: string | null; position: [number, number, number] }[];
  constraints: string[];
}

interface Animation {
  id: string;
  rigId: string;
  motionType: string;
  duration: number;
  fps: number;
  keyframes: number;
  layers: string[];
  loopable: boolean;
}

const MOTION_TYPES = [
  'idle', 'walk', 'run', 'sprint', 'crouch', 'crawl',
  'jump', 'fall', 'climb', 'swim', 'fly',
  'aim', 'fire', 'reload', 'throw', 'melee',
  'salute', 'wave', 'point', 'cover', 'prone',
  'death', 'hit_react', 'stagger'
];

const HUMANOID_SKELETON = [
  { name: 'root', parent: null, position: [0, 0, 0] as [number, number, number] },
  { name: 'pelvis', parent: 'root', position: [0, 1, 0] as [number, number, number] },
  { name: 'spine_01', parent: 'pelvis', position: [0, 1.1, 0] as [number, number, number] },
  { name: 'spine_02', parent: 'spine_01', position: [0, 1.25, 0] as [number, number, number] },
  { name: 'spine_03', parent: 'spine_02', position: [0, 1.4, 0] as [number, number, number] },
  { name: 'neck', parent: 'spine_03', position: [0, 1.55, 0] as [number, number, number] },
  { name: 'head', parent: 'neck', position: [0, 1.7, 0] as [number, number, number] },
  { name: 'clavicle_l', parent: 'spine_03', position: [-0.15, 1.5, 0] as [number, number, number] },
  { name: 'upperarm_l', parent: 'clavicle_l', position: [-0.3, 1.45, 0] as [number, number, number] },
  { name: 'lowerarm_l', parent: 'upperarm_l', position: [-0.55, 1.2, 0] as [number, number, number] },
  { name: 'hand_l', parent: 'lowerarm_l', position: [-0.75, 1, 0] as [number, number, number] },
  { name: 'clavicle_r', parent: 'spine_03', position: [0.15, 1.5, 0] as [number, number, number] },
  { name: 'upperarm_r', parent: 'clavicle_r', position: [0.3, 1.45, 0] as [number, number, number] },
  { name: 'lowerarm_r', parent: 'upperarm_r', position: [0.55, 1.2, 0] as [number, number, number] },
  { name: 'hand_r', parent: 'lowerarm_r', position: [0.75, 1, 0] as [number, number, number] },
  { name: 'thigh_l', parent: 'pelvis', position: [-0.1, 0.9, 0] as [number, number, number] },
  { name: 'calf_l', parent: 'thigh_l', position: [-0.1, 0.5, 0] as [number, number, number] },
  { name: 'foot_l', parent: 'calf_l', position: [-0.1, 0.1, 0.05] as [number, number, number] },
  { name: 'thigh_r', parent: 'pelvis', position: [0.1, 0.9, 0] as [number, number, number] },
  { name: 'calf_r', parent: 'thigh_r', position: [0.1, 0.5, 0] as [number, number, number] },
  { name: 'foot_r', parent: 'calf_r', position: [0.1, 0.1, 0.05] as [number, number, number] }
];

function generateRig(assetId: string, type: 'humanoid' | 'creature' | 'vehicle' | 'prop' = 'humanoid'): Rig {
  const skeleton = type === 'humanoid' ? HUMANOID_SKELETON : HUMANOID_SKELETON.slice(0, 10);
  
  return {
    id: `rig_${assetId}_${Date.now()}`,
    type,
    bones: skeleton.length,
    joints: skeleton,
    constraints: type === 'humanoid' 
      ? ['ik_leg_l', 'ik_leg_r', 'ik_arm_l', 'ik_arm_r', 'look_at']
      : ['root_motion']
  };
}

function generateMotion(rig: Rig, motionType: string): Animation {
  const durations: Record<string, number> = {
    idle: 2.0, walk: 1.0, run: 0.6, sprint: 0.4,
    crouch: 0.8, crawl: 1.5, jump: 0.8, fall: 1.0,
    aim: 0.3, fire: 0.2, reload: 2.5, throw: 0.8,
    salute: 1.5, wave: 1.2, death: 2.0, hit_react: 0.5
  };
  
  const duration = durations[motionType] || 1.0;
  const fps = 30;
  const keyframes = Math.ceil(duration * fps);
  
  return {
    id: `anim_${motionType}_${Date.now()}`,
    rigId: rig.id,
    motionType,
    duration,
    fps,
    keyframes,
    layers: ['base'],
    loopable: ['idle', 'walk', 'run', 'sprint', 'crouch', 'crawl', 'swim', 'fly'].includes(motionType)
  };
}

router.post("/v5/animate", async (req: TierRequest, res: Response) => {
  try {
    const { 
      assetId, 
      motionType = "walk", 
      overrideEvent,
      rigType = "humanoid",
      user = "anonymous"
    } = req.body;
    
    if (!assetId) {
      return res.status(400).json({ error: "assetId is required" });
    }
    
    if (!MOTION_TYPES.includes(motionType)) {
      return res.status(400).json({
        error: `Invalid motion type: ${motionType}`,
        available: MOTION_TYPES
      });
    }
    
    const tier = req.userTier || 'free';
    const limits = getTierLimits(tier);
    
    const requestedAnimations = overrideEvent ? 2 : 1;
    if (requestedAnimations > limits.animations) {
      return res.status(403).json({
        error: "Tier limit exceeded for animations",
        limit: limits.animations,
        requested: requestedAnimations,
        tier,
        upgrade: tier === 'free' ? 'Upgrade to Pro for layered animations' : undefined
      });
    }
    
    const rig = generateRig(assetId, rigType as 'humanoid' | 'creature' | 'vehicle' | 'prop');
    const animation = generateMotion(rig, motionType);
    
    if (overrideEvent && MOTION_TYPES.includes(overrideEvent)) {
      animation.layers.push(overrideEvent);
    }
    
    const rigJson = JSON.stringify(rig, null, 2);
    const animFbxBase64 = Buffer.from(JSON.stringify({
      format: 'fbx',
      version: '7.4',
      animation,
      curves: animation.keyframes,
      placeholder: true,
      note: 'Mock FBX - integrate with actual animation pipeline for production'
    })).toString('base64');
    
    res.json({
      success: true,
      rig: {
        id: rig.id,
        type: rig.type,
        bones: rig.bones,
        constraints: rig.constraints,
        json: rigJson
      },
      animation: {
        id: animation.id,
        motionType: animation.motionType,
        duration: animation.duration,
        fps: animation.fps,
        keyframes: animation.keyframes,
        layers: animation.layers,
        loopable: animation.loopable,
        fbxBase64: animFbxBase64
      },
      tier,
      exportFormats: ['fbx', 'gltf', 'bvh', 'unity', 'unreal']
    });
    
  } catch (error) {
    console.error("Animation generation error:", error);
    res.status(500).json({ error: "Animation generation failed" });
  }
});

router.get("/v5/animate/motions", (req, res) => {
  res.json({
    motions: MOTION_TYPES,
    categories: {
      locomotion: ['idle', 'walk', 'run', 'sprint', 'crouch', 'crawl', 'jump', 'fall', 'climb', 'swim', 'fly'],
      combat: ['aim', 'fire', 'reload', 'throw', 'melee'],
      emotes: ['salute', 'wave', 'point'],
      reactions: ['death', 'hit_react', 'stagger', 'cover', 'prone']
    },
    rigTypes: ['humanoid', 'creature', 'vehicle', 'prop'],
    tierLimits: {
      free: { animations: 1, layers: 1 },
      pro: { animations: 5, layers: 3 },
      enterprise: { animations: 'unlimited', layers: 'unlimited' }
    }
  });
});

export default router;
