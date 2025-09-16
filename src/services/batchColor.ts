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
    const codePart = m[2].toUpperCase(); // PPP
    const seqPart = parseInt(m[3], 10) || 0; // NN

    // Fluid UI color palette (avoid red)
    const fluidColors: Record<string, string> = {
      HTS: "#0078D4", // Fluent blue
      CIQ: "#16C60C", // Fluent green
      MIA: "#00B7C3", // Fluent teal
    };
    let baseColor = fluidColors[codePart];

    // For NN, use shade variation: vary lightness in HSL for each base color
    if (baseColor) {
      // Convert hex to HSL
      function hexToHsl(hex: string): { h: number; s: number; l: number } {
        const num = parseInt(hex.replace("#", ""), 16);
        let r = (num >> 16) & 0xff;
        let g = (num >> 8) & 0xff;
        let b = num & 0xff;
        r /= 255;
        g /= 255;
        b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;
        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r:
              h = (g - b) / d + (g < b ? 6 : 0);
              break;
            case g:
              h = (b - r) / d + 2;
              break;
            case b:
              h = (r - g) / d + 4;
              break;
          }
          h /= 6;
        }
        return {
          h: Math.round(h * 360),
          s: Math.round(s * 100),
          l: Math.round(l * 100),
        };
      }
      const hsl = hexToHsl(baseColor);
      const shadeCount = 7;
      const shadeIdx = seqPart % shadeCount;
      // Lightness range: 30% to 70%
      const minLight = 30;
      const maxLight = 70;
      const lightStep = (maxLight - minLight) / (shadeCount - 1);
      const light = minLight + shadeIdx * lightStep;
      return `hsl(${hsl.h}, ${hsl.s}%, ${Math.round(light)}%)`;
    }

    // Default: use Fluid UI accent color palette for other codes
    const accentColors = [
      "#0078D4", // blue
      "#16C60C", // green
      "#00B7C3", // teal
      "#FFB900", // yellow
      "#8E8CD8", // purple
      "#E81123", // red (skip)
      "#F7630C", // orange
      "#B4009E", // magenta
      "#2D7D9A", // cyan
      "#A80000", // dark red (skip)
      "#5C2D91", // dark purple
      "#FF8C00", // dark orange
    ];
    // Remove red and dark red
    const safeColors = accentColors.filter((c) => c !== "#E81123" && c !== "#A80000");
    const baseIdx = hashStringToInt(codePart) % safeColors.length;
    const baseAccent = safeColors[baseIdx];
    // Shade variation
    const shadeCount = 7;
    const shadeIdx = seqPart % shadeCount;
    const mix = 0.15 + 0.12 * shadeIdx;
    function mixColor(hex: string, percent: number): string {
      const num = parseInt(hex.replace("#", ""), 16);
      const r = (num >> 16) & 0xff;
      const g = (num >> 8) & 0xff;
      const b = num & 0xff;
      const newR = Math.round(r + (255 - r) * percent);
      const newG = Math.round(g + (255 - g) * percent);
      const newB = Math.round(b + (255 - b) * percent);
      return `rgb(${newR},${newG},${newB})`;
    }
    return mixColor(baseAccent, mix);
  }

  // Fallback: hash whole key as before but keep wider saturation/lightness
  const fallbackBase = hashStringToInt(key) % 360;
  return `hsl(${fallbackBase} 68% 44%)`;
}
