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
    const codePart = m[2];
    const seqPart = parseInt(m[3], 10) || 0;

    // Base hue depends on the CODE part so different codes are separated
    const base = hashStringToInt(codePart) % 360;

    // Choose a multiplier that is coprime with 360 to spread sequential numbers
    // widely across the hue wheel. 47 is prime and works well here.
    const MULT = 47;
    const hue = (base + seqPart * MULT) % 360;

    // Slightly vary saturation/lightness by year or code hash so palettes differ
    const sat = 62 + (hashStringToInt(codePart) % 18); // ~62-79
    const light = 38 + (parseInt(yearPart.slice(-1), 10) % 8); // ~38-45

    return `hsl(${Math.round(hue)} ${Math.round(sat)}% ${Math.round(light)}%)`;
  }

  // Fallback: hash whole key as before but keep wider saturation/lightness
  const fallbackBase = hashStringToInt(key) % 360;
  return `hsl(${fallbackBase} 68% 44%)`;
}
