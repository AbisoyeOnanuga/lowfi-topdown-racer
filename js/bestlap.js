/** Local best race time per track (seconds) — no server, fits the small static build. */
const STORAGE_KEY = "lowfi-racer-best-v1";

/** @param {string} trackId */
export function getBestLap(trackId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    const v = o[trackId];
    return typeof v === "number" && v > 0 && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

/**
 * @param {string} trackId
 * @param {number | null | undefined} timeSeconds
 * @returns {{ improved: boolean, previous: number | null }}
 */
export function tryRecordBestLap(trackId, timeSeconds) {
  if (timeSeconds == null || !Number.isFinite(timeSeconds) || timeSeconds <= 0) {
    return { improved: false, previous: null };
  }
  const previous = getBestLap(trackId);
  if (previous != null && timeSeconds >= previous - 1e-9) {
    return { improved: false, previous };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const o = raw ? JSON.parse(raw) : {};
    o[trackId] = timeSeconds;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(o));
  } catch {
    /* ignore quota / privacy mode */
  }
  return { improved: true, previous };
}
