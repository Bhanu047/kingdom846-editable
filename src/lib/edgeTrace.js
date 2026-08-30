// The War Room's approach trace: the call panel's own border, draining.
//
// Lives in its own module rather than beside the component so the geometry can
// be tested in node. The one thing that can break here breaks SILENTLY -- if
// the returned length stops matching the path's real length, the dash pattern
// wraps and lights two disconnected stretches of border at once, which still
// looks like a countdown and is not one.

// The call panel's corner radius (14px) less its 1px border. The trace is
// positioned against the padding box, so that is the radius it must follow to
// sit exactly on the edge.
export const EDGE_R = 13
// Half the stroke width, so the line sits on the edge rather than half off it.
export const EDGE_INSET = 1.25

/**
 * The panel outline as TWO MIRRORED ARMS -- each starting at top centre and
 * ending at bottom centre, one down the right flank and one down the left --
 * together with the length they share.
 *
 * Drawn in real pixels rather than a normalised viewBox. The first attempt
 * used `<rect pathLength="100">` in a `0 0 100 100` box with
 * `preserveAspectRatio="none"`, which failed twice over: the corner radius
 * came out as stretched ovals that did not follow the panel, and Chromium
 * ignores `pathLength` on `<rect>`, so the dash pattern wrapped and lit two
 * disconnected stretches of border. Measuring the panel and returning the
 * exact length removes both -- no normalisation to be ignored, no aspect
 * distortion, and the dash maths is plain arithmetic.
 *
 * Two arms rather than one lap, because the trace has to be readable without
 * being read. One lap starting from a corner is unjudgeable in peripheral
 * vision: half gone and two thirds gone are both "some of the border is lit".
 * Mirrored arms leave a symmetric gap at the bottom that widens as the seconds
 * go, and the width of a gap is something the eye measures for free.
 */
export function edgeGeometry(width, height) {
  const x0 = EDGE_INSET, y0 = EDGE_INSET
  const x1 = width - EDGE_INSET, y1 = height - EDGE_INSET
  const w = x1 - x0, h = y1 - y0
  // Clamped so a panel narrower or shorter than two radii still yields a
  // closed shape rather than arcs that cross each other.
  const r = Math.max(0, Math.min(EDGE_R, w / 2, h / 2))
  const cx = x0 + w / 2

  // sweep 1 turns clockwise, 0 anticlockwise -- the only difference between
  // the arms, which are reflections of each other in the vertical axis.
  const arm = (edgeX, sweep) => {
    const corner = sweep ? x1 - r : x0 + r
    return [
      `M ${cx} ${y0}`,
      `H ${corner}`,
      `A ${r} ${r} 0 0 ${sweep} ${edgeX} ${y0 + r}`,
      `V ${y1 - r}`,
      `A ${r} ${r} 0 0 ${sweep} ${corner} ${y1}`,
      `H ${cx}`,
    ].join(' ')
  }

  return {
    arms: [arm(x1, 1), arm(x0, 0)],
    // half the top edge + a quarter-circle + a flank + a quarter-circle +
    // half the bottom edge, which is exactly half the rounded rectangle.
    length: (w - 2 * r) + (h - 2 * r) + Math.PI * r,
  }
}
