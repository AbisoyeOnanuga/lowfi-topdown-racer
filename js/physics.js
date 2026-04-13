/**
 * Gradual grip / speed loss when lateral exceeds the inner road margin.
 * Inner edge = halfRoad - 11; past that distance, effects ramp over 100 world units.
 * @param {{ width: number }} track
 * @param {number} lateral signed lateral offset from centerline
 */
export function offTrackFactors(track, lateral) {
  const halfRoad = track.width * 0.5;
  const inner = halfRoad - 11;
  const absLat = Math.abs(lateral);
  if (absLat <= inner) {
    return { grip: 1, speedRetain: 1 };
  }
  const past = absLat - inner;
  const u = Math.min(past / 100, 1);
  const grip = Math.max(0.82, 1 - 0.16 * u * u);
  const speedRetain = 1 - 0.0016 * u;
  return { grip, speedRetain };
}
