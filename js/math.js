export const TAU = Math.PI * 2;

export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function wrapAngle(a) {
  a %= TAU;
  if (a < 0) a += TAU;
  return a;
}

export function angleDiff(a, b) {
  let d = wrapAngle(b - a);
  if (d > Math.PI) d -= TAU;
  return d;
}

export function dist(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.hypot(dx, dy);
}
