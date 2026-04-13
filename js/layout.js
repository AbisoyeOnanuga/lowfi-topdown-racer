/**
 * Fixed 16:9 design (960×540 CSS px). Uniform scale into `#game-stage` — no non-uniform stretch.
 * Canvas backing store uses DPR; HUD/minimap live in the same scaled subtree.
 */
export const DESIGN_W = 960;
export const DESIGN_H = 540;
const MINIMAP_CSS = 120;

/**
 * @param {HTMLElement} stageEl `#game-stage`
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLCanvasElement} minimap
 * @param {HTMLElement | null} scaleWrap `#game-scale-wrap`
 */
export function fitGameCanvases(stageEl, canvas, minimap, scaleWrap) {
  const r = stageEl.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);

  const sx = r.width / DESIGN_W;
  const sy = r.height / DESIGN_H;
  const s = Math.max(0.2, Math.min(Math.min(sx, sy), 4));

  if (scaleWrap) {
    scaleWrap.style.width = `${DESIGN_W}px`;
    scaleWrap.style.height = `${DESIGN_H}px`;
    scaleWrap.style.transform = `scale(${s})`;
  }

  const bufW = Math.max(1, Math.floor(DESIGN_W * dpr));
  const bufH = Math.max(1, Math.floor(DESIGN_H * dpr));
  if (canvas.width !== bufW || canvas.height !== bufH) {
    canvas.width = bufW;
    canvas.height = bufH;
  }
  canvas.style.width = `${DESIGN_W}px`;
  canvas.style.height = `${DESIGN_H}px`;

  const mmBuf = Math.max(32, Math.floor(MINIMAP_CSS * dpr));
  if (minimap.width !== mmBuf || minimap.height !== mmBuf) {
    minimap.width = mmBuf;
    minimap.height = mmBuf;
  }
  minimap.style.width = `${MINIMAP_CSS}px`;
  minimap.style.height = `${MINIMAP_CSS}px`;
}
