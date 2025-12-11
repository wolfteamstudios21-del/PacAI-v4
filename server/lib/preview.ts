import crypto from "crypto";

export function silhouetteFromTags(tags: string[], w = 512, h = 512) {
  const seed = crypto.createHash("sha256").update(tags.join("|")).digest("hex").slice(0, 6);
  const color = `#${seed}`;
  const pathSeed = parseInt(seed, 16) % 200 + 50;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect width="${w}" height="${h}" fill="#0b0b0b"/>
      <g fill="${color}">
        <path d="M ${w / 2} ${h / 4} L ${w / 2 + pathSeed} ${h / 2} L ${w / 2} ${h - h / 4} L ${w / 2 - pathSeed} ${h / 2} Z"/>
      </g>
      <text x="50%" y="${h - 24}" text-anchor="middle" fill="#ffffff" font-size="18" font-family="monospace">${tags[0] || "pacai"}</text>
    </svg>`;
  return Buffer.from(svg).toString("base64");
}

export async function choosePreview(meta: any, fallbackTags: string[]) {
  const tags = Array.from(new Set([
    ...(meta?.visuals?.palette ? [meta.visuals.palette] : []),
    ...(meta?.abilities || []),
    ...(meta?.tags || []),
    ...fallbackTags
  ]))
    .filter(Boolean)
    .slice(0, 6);

  return silhouetteFromTags(tags);
}
