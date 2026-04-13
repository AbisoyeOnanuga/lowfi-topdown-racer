/**
 * Off-track: grass/dirt saps speed and grip. Uses `dt` so decay is frame-rate independent.
 * @param {{ width: number }} track
 * @param {number} lateral signed lateral offset from centerline
 * @param {number} dt frame delta seconds
 */
/**
 * 0 on asphalt, 1 at max off-track distance used by grip decay (matches `offTrackFactors`).
 * @param {{ width: number }} track
 * @param {number} lateral
 */
export function offTrackSeverity(track, lateral) {
  const halfRoad = track.width * 0.5;
  const inner = halfRoad - 9;
  const absLat = Math.abs(lateral);
  if (absLat <= inner) return 0;
  const past = absLat - inner;
  return Math.min(past / 52, 1);
}

export function offTrackFactors(track, lateral, dt) {
  const halfRoad = track.width * 0.5;
  const inner = halfRoad - 9;
  const absLat = Math.abs(lateral);
  if (absLat <= inner) {
    return { grip: 1, speedRetain: 1, speedCapMul: 1 };
  }
  const past = absLat - inner;
  const u = Math.min(past / 52, 1);

  /** Steering falls apart quickly in the dirt */
  const grip = Math.max(0.28, 1 - 0.72 * Math.pow(u, 0.75));

  /**
   * Exponential speed bleed: v *= exp(-k * dt) each frame → exp(-k) per second at 60 Hz.
   * k scales up sharply with u so deep off-track is punishing.
   */
  const k = 0.42 * u + 1.05 * u * u;
  const speedRetain = Math.exp(-k * dt);

  /**
   * Hard ceiling on how fast tyres can push on loose surface (stops “full throttle in grass”).
   * At max u, roughly 40% of car max speed.
   */
  const speedCapMul = 0.38 + 0.62 * (1 - u) * (1 - u);

  return { grip, speedRetain, speedCapMul };
}
