/** @param {number} t seconds */
export function formatRaceTime(t) {
  if (t == null || Number.isNaN(t) || t < 0) return "—";
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, "0")}`;
}
