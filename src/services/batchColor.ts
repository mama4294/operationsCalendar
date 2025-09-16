// Deterministic color generator for batches based on their batch number or id.
// For IDs in the form `YY-CODE-NNN` (e.g. 25-HTS-30) we compute a base hue
// from the CODE and then spread hues widely using the numeric sequence (NNN).
// This makes sequential batch numbers visually distinct.
export function getBatchKey(batch: any): string {
  return String(batch?.cr2b6_batchnumber ?? batch?.cr2b6_batchesid ?? "");
}

function hashStringToInt(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function getBatchColor(batch: any): string {
  const key = getBatchKey(batch) || "";

  // Match patterns like 25-HTS-30 or 24-CIQ-01
  const m = key.match(/^(\d{1,4})-([A-Za-z0-9]+)-(\d{1,6})$/);
  if (m) {
    const yearPart = m[1];
    const codePart = m[2]; // PPP
    const seqPart = parseInt(m[3], 10) || 0; // NN

    // Assign a base hue for each PPP (codePart)
    const baseHue = hashStringToInt(codePart) % 360;

  // For NN, use shade variation: keep hue fixed, vary lightness
  // Use a repeating palette of 7 shades for NN
  const shadeCount = 7;
  const shadeIdx = seqPart % shadeCount;
  // Expanded lightness range: 25% (darkest) to 65% (lightest)
  const minLight = 25;
  const maxLight = 65;
  const lightStep = (maxLight - minLight) / (shadeCount - 1);
  const light = minLight + shadeIdx * lightStep;

    // Saturation: keep similar for PPP, but vary slightly by year
    const satBase = 65 + (parseInt(yearPart.slice(-1), 10) % 10); // 65-74

    return `hsl(${Math.round(baseHue)} ${Math.round(satBase)}% ${Math.round(light)}%)`;
  }

  // Fallback: hash whole key as before but keep wider saturation/lightness
  const fallbackBase = hashStringToInt(key) % 360;
  return `hsl(${fallbackBase} 68% 44%)`;
}
