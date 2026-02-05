export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
}

export function extractColorsFromImage(
  imageData: ImageData,
  sampleSize: number = 10
): ThemeColors {
  const pixels = imageData.data;
  const colorCounts: Map<string, number> = new Map();

  // Sample pixels across the image
  for (let i = 0; i < pixels.length; i += 4 * sampleSize) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = pixels[i + 3];

    // Skip transparent pixels
    if (a < 128) continue;

    // Skip near-white and near-black pixels
    const brightness = (r + g + b) / 3;
    if (brightness > 240 || brightness < 15) continue;

    // Quantize colors to reduce noise (round to nearest 16)
    const qr = Math.round(r / 16) * 16;
    const qg = Math.round(g / 16) * 16;
    const qb = Math.round(b / 16) * 16;

    const colorKey = `${qr},${qg},${qb}`;
    colorCounts.set(colorKey, (colorCounts.get(colorKey) || 0) + 1);
  }

  // Sort by frequency
  const sortedColors = Array.from(colorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([color]) => {
      const [r, g, b] = color.split(",").map(Number);
      return rgbToHex(r, g, b);
    });

  // Get distinct colors for primary, secondary, accent
  const distinctColors = getDistinctColors(sortedColors, 3);

  return {
    primary: distinctColors[0] || "#6B46C1", // fallback purple
    secondary: distinctColors[1] || "#ED64A6", // fallback pink
    accent: distinctColors[2] || "#F6AD55", // fallback orange
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const hex = x.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")
  );
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function colorDistance(hex1: string, hex2: string): number {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
      Math.pow(c1.g - c2.g, 2) +
      Math.pow(c1.b - c2.b, 2)
  );
}

function getDistinctColors(colors: string[], count: number): string[] {
  if (colors.length === 0) return [];

  const distinct: string[] = [colors[0]];
  const minDistance = 60; // Minimum color distance for "distinctness"

  for (const color of colors.slice(1)) {
    if (distinct.length >= count) break;

    const isDistinct = distinct.every(
      (d) => colorDistance(color, d) > minDistance
    );
    if (isDistinct) {
      distinct.push(color);
    }
  }

  return distinct;
}
