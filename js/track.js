/**
 * Centerline polylines (closed loops). Width = full road width in world units.
 * Layouts take cues from classic top-down / arcade racers (short-oval stadium circuits,
 * flowing GP-style linkages, tight hillclimb esses) — original geometry, no 1:1 copies.
 * Smooth arcs + Catmull–Rom; no self-crossing loops.
 */

function loop(points) {
  return points;
}

/**
 * Closed CCW ellipse, first point at top.
 * @param {number} segments vertex count around the loop (high = smoother)
 */
export function ellipsePoints(cx, cy, rx, ry, segments) {
  const pts = [];
  const n = Math.max(24, segments | 0);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    pts.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry });
  }
  return pts;
}

/**
 * One quadrant of a circle (y-down screen): angle 0 = east, π/2 = south.
 * @param {number} a0 start angle (rad)
 * @param {number} a1 end angle (rad)
 */
function arcSamples(cx, cy, r, a0, a1, n) {
  const pts = [];
  const steps = Math.max(6, n | 0);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = a0 + t * (a1 - a0);
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return pts;
}

/**
 * Rounded rectangle centerline, CCW from bottom-left of inner straight (after BL fillet).
 * Large corner radius + dense arc facets = smooth bends.
 */
function roundedRectLoop(cx, cy, halfW, halfH, cornerR, segStraight, segCorner) {
  const x0 = cx - halfW;
  const x1 = cx + halfW;
  const y0 = cy - halfH;
  const y1 = cy + halfH;
  const r = Math.min(cornerR, halfW * 0.95, halfH * 0.95);
  const ss = Math.max(4, segStraight | 0);
  const sc = Math.max(8, segCorner | 0);
  const pts = [];

  const xbl = x0 + r;
  const xbr = x1 - r;

  for (let i = 0; i <= ss; i++) {
    const t = i / ss;
    pts.push({ x: xbl + t * (xbr - xbl), y: y1 });
  }
  const cbr = { x: xbr, y: y1 - r };
  pts.push(...arcSamples(cbr.x, cbr.y, r, Math.PI / 2, 0, sc).slice(1));

  for (let i = 1; i <= ss; i++) {
    const t = i / ss;
    pts.push({ x: x1, y: y1 - r - t * (y1 - r - (y0 + r)) });
  }
  const ctr = { x: x1 - r, y: y0 + r };
  pts.push(...arcSamples(ctr.x, ctr.y, r, 0, -Math.PI / 2, sc).slice(1));

  for (let i = 1; i <= ss; i++) {
    const t = i / ss;
    pts.push({ x: xbr - t * (xbr - xbl), y: y0 });
  }
  const ctl = { x: xbl, y: y0 + r };
  pts.push(...arcSamples(ctl.x, ctl.y, r, -Math.PI / 2, -Math.PI, sc).slice(1));

  for (let i = 1; i <= ss; i++) {
    const t = i / ss;
    pts.push({ x: x0, y: y0 + r + t * (y1 - r - (y0 + r)) });
  }
  const cbl = { x: x0 + r, y: y1 - r };
  pts.push(...arcSamples(cbl.x, cbl.y, r, Math.PI, Math.PI / 2, sc).slice(1));

  if (pts.length > 1) {
    const a = pts[0];
    const b = pts[pts.length - 1];
    if (Math.hypot(a.x - b.x, a.y - b.y) < 0.5) {
      pts.pop();
    }
  }
  return pts;
}

/**
 * Catmull–Rom segment between p1→p2 with neighbours p0,p3. t ∈ [0,1].
 */
function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x:
      0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y:
      0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}

/**
 * Closed Catmull–Rom spline through control points (no duplicate closing vertex).
 * @param {number} samplesPerEdge samples along each control edge (high = smoother)
 */
export function catmullRomClosed(controls, samplesPerEdge) {
  const n = controls.length;
  const spe = Math.max(8, samplesPerEdge | 0);
  const out = [];
  for (let i = 0; i < n; i++) {
    const p0 = controls[(i - 1 + n) % n];
    const p1 = controls[i];
    const p2 = controls[(i + 1) % n];
    const p3 = controls[(i + 2) % n];
    for (let k = 0; k < spe; k++) {
      const t = k / spe;
      out.push(catmull(p0, p1, p2, p3, t));
    }
  }
  return out;
}

/**
 * Flowing GP: long start straight, climb, fast esses, return — circuit-racer pacing.
 */
function trackHarborGp() {
  const hull = [
    { x: 340, y: 880 },
    { x: 620, y: 900 },
    { x: 960, y: 890 },
    { x: 1320, y: 820 },
    { x: 1560, y: 660 },
    { x: 1660, y: 420 },
    { x: 1520, y: 200 },
    { x: 1180, y: 120 },
    { x: 760, y: 140 },
    { x: 420, y: 260 },
    { x: 280, y: 480 },
    { x: 360, y: 720 },
  ];
  return catmullRomClosed(hull, 28);
}

/**
 * Tight hillclimb rhythm: switchbacks and a late hairpin — technical, readable corners.
 */
function trackSummitPass() {
  const hull = [
    { x: 560, y: 900 },
    { x: 900, y: 880 },
    { x: 1240, y: 760 },
    { x: 1380, y: 520 },
    { x: 1260, y: 280 },
    { x: 960, y: 160 },
    { x: 600, y: 200 },
    { x: 360, y: 380 },
    { x: 300, y: 600 },
    { x: 420, y: 800 },
  ];
  return catmullRomClosed(hull, 30);
}

export const TRACKS = [
  {
    id: "oval",
    name: "Short Track Oval",
    width: 152,
    points: loop(
      roundedRectLoop(720, 405, 455, 228, 92, 18, 20)
    ),
  },
  {
    id: "switchback",
    name: "Harbor GP",
    width: 148,
    boundsPad: 120,
    points: loop(trackHarborGp()),
  },
  {
    id: "technical",
    name: "Summit Pass",
    width: 136,
    boundsPad: 130,
    points: loop(trackSummitPass()),
  },
];

export function getTrack(id) {
  let resolved = id;
  if (id === "speedway") resolved = "switchback";
  else if (id === "ridge") resolved = "technical";
  return TRACKS.find((t) => t.id === resolved) ?? TRACKS[0];
}

/** Unit tangent and normal at vertex i (forward along loop). */
export function segmentBasis(track, i) {
  const pts = track.points;
  const n = pts.length;
  const p0 = pts[i];
  const p1 = pts[(i + 1) % n];
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const len = Math.hypot(dx, dy) || 1;
  const tx = dx / len;
  const ty = dy / len;
  const nx = -ty;
  const ny = tx;
  return { tx, ty, nx, ny, len };
}

/** Total approximate length along centerline. */
export function trackLength(track) {
  let L = 0;
  const pts = track.points;
  for (let i = 0; i < pts.length; i++) {
    const { len } = segmentBasis(track, i);
    L += len;
  }
  return L;
}

/**
 * Closest point on polyline to (x,y). Returns segment index, t in [0,1], distance,
 * projected arc length from start of segment i, and lateral signed offset (left positive).
 */
export function closestOnTrack(track, x, y) {
  const pts = track.points;
  const n = pts.length;
  let bestD2 = Infinity;
  let bestI = 0;
  let bestT = 0;
  let bestSegLen = 1;
  let bestLateral = 0;

  for (let i = 0; i < n; i++) {
    const p0 = pts[i];
    const p1 = pts[(i + 1) % n];
    const abx = p1.x - p0.x;
    const aby = p1.y - p0.y;
    const segLen = Math.hypot(abx, aby) || 1;
    const t = clamp01(((x - p0.x) * abx + (y - p0.y) * aby) / (segLen * segLen));
    const px = p0.x + abx * t;
    const py = p0.y + aby * t;
    const d2 = (x - px) ** 2 + (y - py) ** 2;
    if (d2 < bestD2) {
      bestD2 = d2;
      bestI = i;
      bestT = t;
      bestSegLen = segLen;
      const nx = -aby / segLen;
      const ny = abx / segLen;
      bestLateral = (x - px) * nx + (y - py) * ny;
    }
  }
  return {
    segIndex: bestI,
    t: bestT,
    dist: Math.sqrt(bestD2),
    segLen: bestSegLen,
    lateral: bestLateral,
  };
}

function clamp01(t) {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/** Arc length from track start to projection point (for lap timing). */
export function arcPosition(track, segIndex, t) {
  let s = 0;
  for (let i = 0; i < segIndex; i++) {
    s += segmentBasis(track, i).len;
  }
  s += segmentBasis(track, segIndex).len * t;
  return s;
}

/** Point on centerline at arc length `s` (loops modulo total length). */
export function pointAtArc(track, s) {
  const total = trackLength(track);
  if (total <= 0) return { x: 0, y: 0 };
  s = ((s % total) + total) % total;
  const pts = track.points;
  let acc = 0;
  for (let i = 0; i < pts.length; i++) {
    const { len } = segmentBasis(track, i);
    if (acc + len >= s) {
      const t = len > 0 ? (s - acc) / len : 0;
      const p0 = pts[i];
      const p1 = pts[(i + 1) % pts.length];
      return {
        x: p0.x + (p1.x - p0.x) * t,
        y: p0.y + (p1.y - p0.y) * t,
        segIndex: i,
        t,
      };
    }
    acc += len;
  }
  const p = pts[0];
  return { x: p.x, y: p.y, segIndex: 0, t: 0 };
}

/** Build left/right edge polylines for drawing. */
export function buildEdges(track) {
  const pts = track.points;
  const n = pts.length;
  const w = track.width * 0.5;
  const left = [];
  const right = [];
  for (let i = 0; i < n; i++) {
    const { nx, ny } = segmentBasis(track, i);
    const p = pts[i];
    left.push({ x: p.x + nx * w, y: p.y + ny * w });
    right.push({ x: p.x - nx * w, y: p.y - ny * w });
  }
  return { left, right };
}

const DEFAULT_BOUNDS_PAD = 96;

/**
 * Axis-aligned bounds from road edges plus padding (for camera / minimap).
 * Optional `track.boundsPad` for long circuits that need extra framing margin.
 * @param {typeof TRACKS[number]} track
 */
export function getWorldBounds(track) {
  const pad =
    typeof track.boundsPad === "number" ? track.boundsPad : DEFAULT_BOUNDS_PAD;
  const { left, right } = buildEdges(track);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of left) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  for (const p of right) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return {
    minX: minX - pad,
    minY: minY - pad,
    maxX: maxX + pad,
    maxY: maxY + pad,
  };
}
