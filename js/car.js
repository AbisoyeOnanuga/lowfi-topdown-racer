import { angleDiff, clamp, wrapAngle } from "./math.js";

export class Car {
  /**
   * @param {object} opts
   * @param {number} opts.x
   * @param {number} opts.y
   * @param {number} opts.angle
   * @param {{ accel: number; brake: number; maxSpeed: number; turnGrip: number; drag: number }} opts.vehicle
   * @param {boolean} [opts.isPlayer]
   * @param {string} opts.name
   * @param {number} [opts.colorHue] 0-360
   */
  constructor(opts) {
    this.x = opts.x;
    this.y = opts.y;
    this.angle = opts.angle;
    this.speed = 0;
    this.vehicle = opts.vehicle;
    this.isPlayer = !!opts.isPlayer;
    this.name = opts.name;
    this.colorHue = opts.colorHue ?? 200;
    /** AI: current target arc offset from car arc */
    this.aiLookahead = 120;
  }

  reset(x, y, angle) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = 0;
  }

  /**
   * @param {number} dt seconds
   * @param {{ accel: number, steer: number, brake: number }} input -1..1
   * @param {number} gripScale extra multiplier on turn (e.g. off-track)
   */
  update(dt, input, gripScale = 1) {
    const v = this.vehicle;
    const accel = input.accel * v.accel;
    const brake = input.brake * v.brake;

    this.speed += accel * dt;
    if (brake > 0) {
      this.speed -= brake * dt;
    }
    this.speed *= Math.pow(v.drag, dt * 60);

    const spd = Math.abs(this.speed);
    const maxS = v.maxSpeed;
    this.speed = clamp(this.speed, -maxS * 0.35, maxS);

    const turnRate =
      input.steer * v.turnGrip * gripScale * (0.45 + 0.55 * Math.min(spd / maxS, 1));

    this.angle = wrapAngle(this.angle + turnRate * dt);

    const cs = Math.cos(this.angle);
    const sn = Math.sin(this.angle);
    this.x += cs * this.speed * dt;
    this.y += sn * this.speed * dt;
  }

  /** Steer toward world angle `targetAngle` with strength 0..1 */
  steerToward(targetAngle, strength = 1) {
    const diff = angleDiff(this.angle, targetAngle);
    const steer = clamp(diff * 3.5, -1, 1) * strength;
    return steer;
  }
}
