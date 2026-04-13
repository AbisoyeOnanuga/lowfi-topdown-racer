/**
 * Centerline polylines (closed loops). Width in world units.
 */

function loop(points) {
  return points;
}

/**
 * Closed CCW ellipse as a polyline (first point not duplicated at end).
 * @param {number} segments vertices around the loop
 */
export function ellipsePoints(cx, cy, rx, ry, segments) {
  const pts = [];
  const n = Math.max(8, segments | 0);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    pts.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry });
  }
  return pts;
}

/**
 * Linearly subdivide a closed polyline for smoother mesh (no self-intersection if waypoints are clean).
 * @param {number} nEach segments per original edge (>=1)
 */
function subdivideClosed(waypoints, nEach) {
  const n = waypoints.length;
  const se = Math.max(1, nEach | 0);
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = waypoints[i];
    const b = waypoints[(i + 1) % n];
    for (let k = 0; k < se; k++) {
      const t = k / se;
      out.push({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
      });
    }
  }
  return out;
}

/**
 * F1-inspired GP loop: long start straight, fast right, esses, back straight, hairpin, return.
 * Large world coordinates (~1500×800 span) so camera zoom leaves margin; CCW, non-crossing hull.
 */
function ridgewayGranPrix() {
  const w = [
    { x: 520, y: 920 },
    { x: 780, y: 920 },
    { x: 1040, y: 920 },
    { x: 1320, y: 920 },
    { x: 1560, y: 905 },
    { x: 1720, y: 820 },
    { x: 1800, y: 680 },
    { x: 1820, y: 520 },
    { x: 1760, y: 380 },
    { x: 1620, y: 280 },
    { x: 1420, y: 220 },
    { x: 1160, y: 200 },
    { x: 880, y: 210 },
    { x: 620, y: 260 },
    { x: 420, y: 360 },
    { x: 320, y: 500 },
    { x: 340, y: 660 },
    { x: 420, y: 800 },
  ];
  return subdivideClosed(w, 5);
}

export const TRACKS = [
  {
    id: "oval",
    name: "Training Oval",
    width: 152,
    points: loop(ellipsePoints(720, 405, 430, 268, 28)),
  },
  {
    id: "switchback",
    name: "Speedway",
    width: 148,
    points: loop(ellipsePoints(720, 405, 520, 218, 28)),
  },
  {
    id: "technical",
    name: "Ridgeway Circuit",
    width: 136,
    boundsPad: 140,
    points: loop(ridgewayGranPrix()),
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
