/**
 * Shared geometry for the architecture diagrams. Every diagram uses a 360
 * unit wide viewBox and a vertical layout, so text stays readable when the
 * SVG shrinks to phone width (about 0.9 px per unit at 360 px).
 */

export const DIAGRAM_WIDTH = 360;

/** Baseline of a box title, from the top of the box. */
export const TITLE_OFFSET = 21;
/** Gap from the title baseline to the first detail line. */
export const FIRST_LINE_GAP = 18;
export const LINE_HEIGHT = 16;
const BOTTOM_PADDING = 13;

/** Height of a box with a title and `lines` detail lines. */
export function boxHeight(lines: number): number {
  const detail = lines > 0 ? FIRST_LINE_GAP + (lines - 1) * LINE_HEIGHT : 0;
  return TITLE_OFFSET + detail + BOTTOM_PADDING;
}

export type DiagramVariant = "default" | "accent" | "warn";
