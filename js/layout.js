/**
 * Size canvases to the game stage element and devicePixelRatio.
 * @param {HTMLElement} stageEl  `#game-stage` while racing; falls back to `#app` in menus.
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLCanvasElement} minimap
 */
export function fitGameCanvases(stageEl, canvas, minimap) {
  const r = stageEl.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(320, Math.floor(r.width * dpr));
  const h = Math.max(180, Math.floor(r.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const mmLogical = Math.min(120, Math.max(64, Math.floor(r.width * 0.21)));
  const mmPx = Math.max(64, Math.floor(mmLogical * dpr));
  if (minimap.width !== mmPx || minimap.height !== mmPx) {
    minimap.width = mmPx;
    minimap.height = mmPx;
  }
  minimap.style.width = `${mmLogical}px`;
  minimap.style.height = `${mmLogical}px`;
}
