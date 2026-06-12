export type SchematicLabelAnchor = { x: number; y: number };

export type StackSchematicLabelOptions = {
  /** Vertical gap between the anchor point and its label. */
  baseOffset?: number;
  /** Labels never render above this y (keeps text inside the viewBox). */
  minY?: number;
  /** Vertical step used when a label must move to avoid a neighbour. */
  lineHeight?: number;
  /** Horizontal distance within which two labels are considered overlapping. */
  xRadius?: number;
  maxY?: number;
};

/**
 * Stacks schematic-map labels vertically when several anchors sit close
 * together, so 3+ nearby markers stay readable instead of overprinting.
 * Pure and order-stable: the n-th result is the label y for the n-th anchor.
 */
export function stackSchematicLabelYs(
  anchors: SchematicLabelAnchor[],
  { baseOffset = 3, minY = 7, lineHeight = 4, xRadius = 24, maxY = 97 }: StackSchematicLabelOptions = {},
): number[] {
  const placed: SchematicLabelAnchor[] = [];
  return anchors.map(({ x, y }) => {
    let labelY = Math.max(y - baseOffset, minY);
    while (labelY <= maxY && placed.some((other) => Math.abs(other.x - x) < xRadius && Math.abs(other.y - labelY) < lineHeight)) {
      labelY += lineHeight;
    }
    placed.push({ x, y: labelY });
    return labelY;
  });
}
