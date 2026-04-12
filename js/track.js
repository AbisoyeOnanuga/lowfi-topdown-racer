/**
 * Centerline polylines (closed loops). Width in world units.
 * Coordinates chosen so canvas 960x540 fits with margin when camera follows player.
 */

function loop(points) {
  return points;
}

export const TRACKS = [
  {
    id: "oval",
    name: "Training Oval",
    width: 100,
    points: loop([
      { x: 480, y: 120 },
      { x: 720, y: 120 },
      { x: 820, y: 270 },
      { x: 720, y: 420 },
      { x: 480, y: 420 },
      { x: 240, y: 270 },
    ]),
  },
  {
    id: "switchback",
    name: "Switchback",
    width: 88,
    points: loop([
      { x: 200, y: 400 },
      { x: 400, y: 400 },
      { x: 520, y: 280 },
      { x: 680, y: 400 },
      { x: 780, y: 200 },
      { x: 600, y: 120 },
      { x: 400, y: 200 },
      { x: 280, y: 120 },
      { x: 120, y: 280 },
    ]),
  },
  {
    id: "technical",
    name: "Technical",
    width: 82,
    points: loop([
      { x: 480, y: 100 },
      { x: 700, y: 160 },
      { x: 820, y: 320 },
      { x: 720, y: 440 },
      { x: 520, y: 380 },
      { x: 400, y: 460 },
      { x: 200, y: 380 },
      { x: 140, y: 240 },
      { x: 320, y: 140 },
    ]),
  },
];

export function getTrack(id) {
  return TRACKS.find((t) => t.id === id) ?? TRACKS[0];
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
