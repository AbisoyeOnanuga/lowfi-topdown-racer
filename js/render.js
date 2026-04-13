import { buildEdges, getWorldBounds } from "./track.js";

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./track.js').Track} track
 * @param {{ scale: number, centerX: number, centerY: number, screenPx?: number }} view
 */
export function drawWorld(ctx, track, view) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(view.scale, view.scale);
  ctx.translate(-view.centerX, -view.centerY);

  view.screenPx = 1 / view.scale;
  const px = view.screenPx;

  const { left, right } = buildEdges(track);
  const n = left.length;

  ctx.fillStyle = "#2c3848";
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const a = left[i];
    const b = right[i];
    const c = right[j];
    const d = left[j];
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.closePath();
    ctx.fill();
  }

  ctx.strokeStyle = "#4a9ee8";
  ctx.lineWidth = 2 * px;
  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y);
  for (let i = 1; i <= n; i++) {
    const p = left[i % n];
    ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(right[0].x, right[0].y);
  for (let i = 1; i <= n; i++) {
    const p = right[i % n];
    ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();

  drawStartLineChecker(ctx, track, px);

  ctx.restore();
}

/**
 * Full-width checker pattern at segment 0 (classic start/finish).
 * @param {number} px screen pixel size in world units (1/scale)
 */
function drawStartLineChecker(ctx, track, px) {
  const { left, right } = buildEdges(track);
  const L = left[0];
  const R = right[0];
  const p0 = track.points[0];
  const p1 = track.points[1];
  let tx = p1.x - p0.x;
  let ty = p1.y - p0.y;
  const tlen = Math.hypot(tx, ty) || 1;
  tx /= tlen;
  ty /= tlen;
  const depth = 22 * px;
  const nAcross = 16;
  const nAlong = 4;
  const ax = (R.x - L.x) / nAcross;
  const ay = (R.y - L.y) / nAcross;
  const dx = tx * (depth / nAlong);
  const dy = ty * (depth / nAlong);
  for (let row = 0; row < nAlong; row++) {
    for (let col = 0; col < nAcross; col++) {
      const parity = (row + col) % 2;
      ctx.fillStyle = parity ? "#f2f2f2" : "#1a1a1a";
      const x0 = L.x + ax * col + dx * row;
      const y0 = L.y + ay * col + dy * row;
      const x1 = x0 + ax;
      const y1 = y0 + ay;
      const x2 = x1 + dx;
      const y2 = y1 + dy;
      const x3 = x0 + dx;
      const y3 = y0 + dy;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x3, y3);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.strokeStyle = "#c9a227";
  ctx.lineWidth = 2 * px;
  ctx.beginPath();
  ctx.moveTo(L.x, L.y);
  ctx.lineTo(R.x, R.y);
  ctx.lineTo(R.x + dx * nAlong, R.y + dy * nAlong);
  ctx.lineTo(L.x + dx * nAlong, L.y + dy * nAlong);
  ctx.closePath();
  ctx.stroke();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./car.js').Car} car
 * @param {boolean} isLeader
 */
export function drawCar(ctx, car, isLeader) {
  const { x, y, angle, colorHue } = car;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const len = 22;
  const wid = 11;
  ctx.fillStyle = `hsl(${colorHue} 70% 52%)`;
  ctx.strokeStyle = isLeader ? "#fff" : "#111";
  ctx.lineWidth = isLeader ? 2 : 1;
  ctx.beginPath();
  ctx.moveTo(len, 0);
  ctx.lineTo(-len * 0.55, wid);
  ctx.lineTo(-len * 0.55, -wid);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/**
 * @param {HTMLCanvasElement} mini
 * @param {import('./track.js').Track} track
 * @param {import('./car.js').Car[]} cars
 */
export function drawMinimap(mini, track, cars) {
  const mctx = mini.getContext("2d");
  const mw = mini.width;
  const mh = mini.height;
  mctx.fillStyle = "#0a0e14";
  mctx.fillRect(0, 0, mw, mh);

  const b = getWorldBounds(track);
  const minX = b.minX;
  const minY = b.minY;
  const maxX = b.maxX;
  const maxY = b.maxY;
  const pad = 20;
  const bw = maxX - minX || 1;
  const bh = maxY - minY || 1;
  const sx = (mw - pad * 2) / bw;
  const sy = (mh - pad * 2) / bh;
  const sc = Math.min(sx, sy);

  const tx = (x) => pad + (x - minX) * sc;
  const ty = (y) => pad + (y - minY) * sc;

  mctx.strokeStyle = "#2a5080";
  mctx.lineWidth = 1;
  mctx.beginPath();
  mctx.moveTo(tx(track.points[0].x), ty(track.points[0].y));
  for (let i = 1; i <= track.points.length; i++) {
    const p = track.points[i % track.points.length];
    mctx.lineTo(tx(p.x), ty(p.y));
  }
  mctx.stroke();

  for (let i = 0; i < cars.length; i++) {
    const c = cars[i];
    mctx.fillStyle = c.isPlayer ? "#6ec0ff" : `hsl(${c.colorHue} 60% 50%)`;
    mctx.beginPath();
    mctx.arc(tx(c.x), ty(c.y), c.isPlayer ? 4 : 3, 0, Math.PI * 2);
    mctx.fill();
  }
}
