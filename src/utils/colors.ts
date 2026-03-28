/**
 * Standard wire color normalization utilities.
 * Shared between plan and legacy harness tools.
 */

export const STANDARD_COLORS: Record<string, string> = {
  black:  '#000000',
  brown:  '#A52A2A',
  red:    '#FF0000',
  orange: '#FFA500',
  yellow: '#FFFF00',
  green:  '#00FF00',
  blue:   '#0000FF',
  violet: '#8A2BE2',
  gray:   '#808080',
  white:  '#FFFFFF',
  pink:   '#FFC0CB',
};

const VALID_HEX = new Set(Object.values(STANDARD_COLORS));
const NAME_TO_HEX = STANDARD_COLORS;
const HEX_TO_NAME = Object.fromEntries(
  Object.entries(STANDARD_COLORS).map(([name, hex]) => [hex.toUpperCase(), name]),
);

/**
 * Normalize a color value to a valid standard hex.
 * Accepts: hex (#FF0000), name (red), or close variants.
 * Returns the corrected hex, undefined if empty, or null if unrecognizable.
 */
export function normalizeColorToHex(value: string | undefined): string | undefined | null {
  if (!value) return undefined;
  const upper = value.toUpperCase().trim();

  // Already valid hex
  if (VALID_HEX.has(upper)) return upper;

  // Name → hex
  const lower = value.toLowerCase().trim();
  if (NAME_TO_HEX[lower]) return NAME_TO_HEX[lower];

  // Hex that's valid format but not standard — try case-insensitive match
  if (upper.startsWith('#') && HEX_TO_NAME[upper]) return upper;

  return null;
}

/**
 * Normalize a color value to a valid standard name.
 * Returns the corrected name, undefined if empty, or null if unrecognizable.
 */
export function normalizeColorToName(value: string | undefined): string | undefined | null {
  if (!value) return undefined;
  const lower = value.toLowerCase().trim();

  // Already a valid name
  if (NAME_TO_HEX[lower]) return lower;

  // Hex → name
  const upper = value.toUpperCase().trim();
  if (HEX_TO_NAME[upper]) return HEX_TO_NAME[upper];

  return null;
}
