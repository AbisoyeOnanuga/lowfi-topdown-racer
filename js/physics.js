/**
 * Gradual grip / speed loss when lateral exceeds the inner road margin.
 * Inner edge = halfRoad - 10; past that, effects ramp over ~88 world units.
 * @param {{ width: number }} track
 * @param {number} lateral signed lateral offset from centerline
 */
export function offTrackFactors(track, lateral) {
  const halfRoad = track.width * 0.5;
  const inner = halfRoad - 10;
  const absLat = Math.abs(lateral);
  if (absLat <= inner) {
    return { grip: 1, speedRetain: 1 };
  }
  const past = absLat - inner;
  const u = Math.min(past / 88, 1);
  const grip = Math.max(0.76, 1 - 0.22 * u * u);
  const speedRetain = 1 - 0.0022 * u;
  return { grip, speedRetain };
}
