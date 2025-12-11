import { randomUUID } from "crypto";

export interface GalleryItem {
  id: string;
  kind: "vehicle" | "weapon" | "creature" | "concept" | "model";
  title: string;
  tags: string[];
  license: "cc0" | "cc-by" | "commercial";
  owner: string;
  imageBase64?: string;
  modelUrl?: string;
  meta: Record<string, any>;
  createdAt: number;
}

const gallery: GalleryItem[] = [];

export async function insertGalleryItem(item: Omit<GalleryItem, "id" | "createdAt">): Promise<GalleryItem> {
  const row: GalleryItem = { id: randomUUID(), createdAt: Date.now(), ...item };
  gallery.push(row);
  return row;
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
