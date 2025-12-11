import { insertGalleryItem } from "../db/gallery";
import { choosePreview } from "../lib/preview";

type License = "cc0" | "cc-by" | "commercial";

function resolveLicense(source: "system" | "user" | "web"): License {
  if (source === "system") return "cc0";
  if (source === "web") return "cc-by";
  return "commercial";
}

export async function addToGallery(
  kind: "vehicle" | "weapon" | "creature",
  title: string,
  meta: any,
  owner = "system",
  source: "system" | "user" | "web" = "system"
) {
  const license = resolveLicense(source);
  const tags = [
    kind,
    meta?.faction || meta?.biome || meta?.style || "neutral",
    ...(meta?.abilities || []),
    meta?.visuals?.silhouette || "",
  ].filter(Boolean);

  const imageBase64 = await choosePreview(meta, tags);
  const item = await insertGalleryItem({
    kind,
    title,
    tags,
    license,
    owner,
    imageBase64,
    meta,
  });

  console.log(`[autofill] Added ${kind} "${title}" to gallery (id=${item.id}, license=${license})`);
  return item;
}
