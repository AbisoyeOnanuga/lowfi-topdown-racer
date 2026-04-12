import { angleDiff, clamp } from "./math.js";
import {
  arcPosition,
  closestOnTrack,
  pointAtArc,
  trackLength,
} from "./track.js";

/**
 * @param {import('./car.js').Car} car
 * @param {import('./track.js').Track} track
 * @param {number} dt
 * @param {{ speedMul: number, aggression: number }} profile
 */
export function updateAI(car, track, dt, profile) {
  const total = trackLength(track);
  const close = closestOnTrack(track, car.x, car.y);
  const myArc = arcPosition(track, close.segIndex, close.t);

  const lookahead = 80 + car.aiLookahead * profile.aggression;
  const targetArc = myArc + lookahead;
  const tp = pointAtArc(track, targetArc);
  const dx = tp.x - car.x;
  const dy = tp.y - car.y;
  const targetAngle = Math.atan2(dy, dx);

  /** Slow down if pointed away from track tangent */
  const tangent = Math.atan2(
    track.points[(close.segIndex + 1) % track.points.length].y -
      track.points[close.segIndex].y,
    track.points[(close.segIndex + 1) % track.points.length].x -
      track.points[close.segIndex].x
  );
  const misalign = Math.abs(angleDiff(tangent, car.angle));
  const cornerSlow = clamp(1 - misalign / 1.8, 0.35, 1);

  const steer = car.steerToward(targetAngle, 0.92 + 0.08 * profile.aggression);

  const maxSp = car.vehicle.maxSpeed * profile.speedMul * cornerSlow;
  const spdRatio = Math.abs(car.speed) / (car.vehicle.maxSpeed || 1);
  let accel = spdRatio < 0.95 ? 1 : 0.15;
  if (Math.abs(car.speed) > maxSp) accel = -0.6;

  /** Nudge away from inner wall if too far lateral */
  const halfW = track.width * 0.5;
  const lat = close.lateral;
  const steerBias = clamp(-lat / (halfW * 0.9), -0.35, 0.35);

  return {
    accel: accel * 0.95,
    steer: clamp(steer + steerBias, -1, 1),
    brake: 0,
  };
}
