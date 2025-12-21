import { randomUUID } from "crypto";

export type PreviewStatus = "pending" | "generating" | "ready" | "failed";

export interface GalleryItem {
  id: string;
  kind: "vehicle" | "weapon" | "creature" | "concept" | "model" | "world" | "npc" | "simulation" | "war.simulation";
  title: string;
  tags: string[];
  license: "cc0" | "cc-by" | "commercial";
  owner: string;
  imageBase64?: string;
  modelUrl?: string;
  meta: Record<string, any>;
  createdAt: number;
  
  // Preview system - visual representation
  previewImageUrl?: string;
  previewThumbnailUrl?: string;
  previewStatus: PreviewStatus;
  previewAltText?: string;
  previewFallbackTier: number; // 0=AI generated, 1=concept art, 2=icon fallback
  generationPrompt?: string;
  
  // War simulation specific
  planetName?: string;
  escalationLevel?: number;
  simulationPhase?: string;
}

const gallery: GalleryItem[] = [];

export async function insertGalleryItem(item: Omit<GalleryItem, "id" | "createdAt" | "previewStatus" | "previewFallbackTier">): Promise<GalleryItem> {
  const row: GalleryItem = { 
    id: randomUUID(), 
    createdAt: Date.now(), 
    previewStatus: "pending",
    previewFallbackTier: 2,
    ...item 
  };
  gallery.push(row);
  return row;
}

export async function updateGalleryItemPreview(
  id: string, 
  previewData: { 
    previewImageUrl?: string; 
    previewThumbnailUrl?: string;
    previewStatus: PreviewStatus;
    previewAltText?: string;
    previewFallbackTier: number;
  }
): Promise<GalleryItem | null> {
  const item = gallery.find((g) => g.id === id);
  if (item) {
    Object.assign(item, previewData);
    return item;
  }
  return null;
}

export async function listGalleryItems(kind?: GalleryItem["kind"]) {
  return kind ? gallery.filter((g) => g.kind === kind) : gallery;
}

export async function getGalleryItem(id: string) {
  return gallery.find((g) => g.id === id) || null;
}

export async function deleteGalleryItem(id: string) {
  const idx = gallery.findIndex((g) => g.id === id);
  if (idx >= 0) {
    gallery.splice(idx, 1);
    return true;
  }
  return false;
}

export async function countGalleryItems(kind?: GalleryItem["kind"]) {
  return kind ? gallery.filter((g) => g.kind === kind).length : gallery.length;
}
