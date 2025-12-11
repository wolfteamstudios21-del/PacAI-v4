type AnyObj = Record<string, any>;

function pruneLowConfidence(obj: AnyObj) {
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val && typeof val === "object" && "confidence" in val && typeof val.confidence === "number") {
      if (val.confidence < 0.5) delete obj[key];
    } else if (val && typeof val === "object") {
      pruneLowConfidence(val);
    }
  }
}

function truncateDescription(obj: AnyObj, field = "description", maxLen = 200) {
  const d = obj[field];
  if (typeof d === "string" && d.length > maxLen) obj[field] = d.slice(0, maxLen) + "...";
}

function quantizeSeed(obj: AnyObj) {
  if (typeof obj.seed === "number") obj.seed = Math.floor(obj.seed);
}

function normalizeCoords(obj: AnyObj) {
  const { x, y, z } = obj;
  if ([x, y, z].every((n) => typeof n === "number")) obj.coords = [x, y, z];
}

export async function compressOutput(expanded: AnyObj): Promise<AnyObj> {
  const output = JSON.parse(JSON.stringify(expanded));
  pruneLowConfidence(output);
  truncateDescription(output);
  quantizeSeed(output);
  normalizeCoords(output);
  return output;
}
