import { Car } from "./car.js";
import { updateAI } from "./ai.js";
import {
  arcPosition,
  closestOnTrack,
  getTrack,
  getWorldBounds,
  pointAtArc,
  trackLength,
} from "./track.js";
import { offTrackFactors } from "./physics.js";
import { getVehicle } from "./vehicles.js";
import { drawCar, drawMinimap, drawWorld } from "./render.js";

/** @typedef {{ speedMul: number, aggression: number }} AiProfile */

/** @type {Record<string, AiProfile>} */
export const DIFFICULTY = {
  easy: { speedMul: 0.82, aggression: 0.8 },
  normal: { speedMul: 0.98, aggression: 0.96 },
  hard: { speedMul: 1.1, aggression: 1.08 },
};

const AI_NAMES = ["Vector", "Raster", "Shader"];

export class GameSession {
  /**
   * @param {object} opts
   * @param {HTMLCanvasElement} opts.canvas
   * @param {HTMLCanvasElement} opts.minimap
   * @param {ReturnType<import('./input.js').createInput>} opts.input
   * @param {string} opts.vehicleId
   * @param {string} opts.trackId
   * @param {keyof typeof DIFFICULTY} opts.difficulty
   * @param {number} opts.laps
   * @param {(state: { finished: boolean }) => void} opts.onUpdate
   * @param {(results: { name: string; place: number }[]) => void} opts.onFinish
   */
  constructor(opts) {
    this.canvas = opts.canvas;
    this.minimap = opts.minimap;
    this.input = opts.input;
    this.track = getTrack(opts.trackId);
    this.playerVehicle = getVehicle(opts.vehicleId);
    this.aiProfile = DIFFICULTY[opts.difficulty] ?? DIFFICULTY.normal;
    this.lapsTotal = Math.max(1, Math.min(9, opts.laps | 0));
    this.onUpdate = opts.onUpdate;
    this.onFinish = opts.onFinish;

    this.ctx = this.canvas.getContext("2d");
    /** @type {Car[]} */
    this.cars = [];
    /** @type {number | undefined} */
    this._prevArc = undefined;
    /** @type {number[]} */
    this.lapCount = [];
    /** @type {(number | undefined)[]} */
    this.prevArc = [];
    this.finished = false;
    this.playerPlace = 1;
    this.raceTime = 0;
    this._lastTime = 0;
    this._running = false;
    /** @type {{ scale: number, centerX: number, centerY: number }} */
    this._view = { scale: 1, centerX: 0, centerY: 0 };
  }

  start() {
    this._buildCars();
    const total = trackLength(this.track);
    for (let i = 0; i < this.cars.length; i++) {
      const spacing = 28;
      const s0 = total - 24 - i * spacing;
      const p = pointAtArc(this.track, s0);
      const pNext = pointAtArc(this.track, s0 + 5);
      const ang = Math.atan2(pNext.y - p.y, pNext.x - p.x);
      this.cars[i].x = p.x;
      this.cars[i].y = p.y;
      this.cars[i].angle = ang;
      this.cars[i].speed = 0;
      this.lapCount[i] = 0;
      this.prevArc[i] = arcPosition(
        this.track,
        closestOnTrack(this.track, this.cars[i].x, this.cars[i].y).segIndex,
        closestOnTrack(this.track, this.cars[i].x, this.cars[i].y).t
      );
    }
    this.finished = false;
    this.raceTime = 0;
    this._lastTime = performance.now();
    this._running = true;
    this._updateView();
    requestAnimationFrame((t) => this._loop(t));
  }

  _updateView() {
    const b = getWorldBounds(this.track);
    const bw = b.maxX - b.minX;
    const bh = b.maxY - b.minY;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const scale = Math.min(w / bw, h / bh) * 0.93;
    this._view = {
      scale,
      centerX: (b.minX + b.maxX) / 2,
      centerY: (b.minY + b.maxY) / 2,
    };
  }

  stop() {
    this._running = false;
  }

  _buildCars() {
    const pv = this.playerVehicle;
    this.cars = [
      new Car({
        x: 0,
        y: 0,
        angle: 0,
        vehicle: { ...pv },
        isPlayer: true,
        name: "You",
        colorHue: 210,
      }),
    ];
    const hues = [35, 130, 280];
    for (let i = 0; i < 3; i++) {
      this.cars.push(
        new Car({
          x: 0,
          y: 0,
          angle: 0,
          vehicle: { ...pv },
          isPlayer: false,
          name: AI_NAMES[i],
          colorHue: hues[i],
        })
      );
    }
  }

  _loop(now) {
    if (!this._running) return;
    const dt = Math.min(0.05, (now - this._lastTime) / 1000);
    this._lastTime = now;
    this.raceTime += dt;
    this._step(dt);
    this._render();
    if (this._running) requestAnimationFrame((t) => this._loop(t));
  }

  _step(dt) {
    const track = this.track;

    for (let i = 0; i < this.cars.length; i++) {
      const car = this.cars[i];
      const close = closestOnTrack(track, car.x, car.y);
      const { grip, speedRetain } = offTrackFactors(track, close.lateral);

      if (car.isPlayer) {
        const ins = this.input;
        const steer = ins.steer();
        const accel = ins.accel();
        const brake = ins.brake();
        car.update(
          dt,
          {
            accel: accel > 0 ? 1 : 0,
            steer,
            brake: brake > 0 ? 1 : 0,
          },
          grip
        );
      } else {
        const aiIn = updateAI(car, track, dt, this.aiProfile);
        car.update(dt, aiIn, grip);
      }
      car.speed *= speedRetain;

      const c2 = closestOnTrack(track, car.x, car.y);
      const s = arcPosition(track, c2.segIndex, c2.t);
      const total = trackLength(track);
      const prev = this.prevArc[i];
      if (prev !== undefined && prev > total * 0.72 && s < total * 0.28) {
        this.lapCount[i] = (this.lapCount[i] || 0) + 1;
      }
      this.prevArc[i] = s;
    }

    this._updatePlaces();
    const player = this.cars[0];
    const playerLaps = this.lapCount[0] || 0;
    if (!this.finished && playerLaps >= this.lapsTotal) {
      this.finished = true;
      this._running = false;
      const results = this._buildResults();
      this._emitHud();
      this.onFinish(results);
      return;
    }

    this._emitHud();
  }

  _emitHud() {
    const playerLaps = this.lapCount[0] || 0;
    const curLap = Math.min(playerLaps + 1, this.lapsTotal);
    const speedKmh = Math.round(Math.abs(this.cars[0].speed) * 0.42);
    this.onUpdate({
      finished: this.finished,
      hud: {
        speed: speedKmh,
        lapLabel: `${curLap} / ${this.lapsTotal}`,
        posLabel: `${this.playerPlace} / ${this.cars.length}`,
      },
    });
  }

  _updatePlaces() {
    const track = this.track;
    const total = trackLength(track);
    const progress = this.cars.map((_, i) => {
      const c = this.cars[i];
      const cl = closestOnTrack(track, c.x, c.y);
      const s = arcPosition(track, cl.segIndex, cl.t);
      return (this.lapCount[i] || 0) * total + s;
    });
    const order = progress
      .map((p, idx) => ({ p, idx }))
      .sort((a, b) => b.p - a.p);
    const playerRank = order.findIndex((o) => o.idx === 0) + 1;
    this.playerPlace = playerRank;
  }

  _buildResults() {
    const track = this.track;
    const total = trackLength(track);
    const rows = this.cars.map((car, i) => {
      const cl = closestOnTrack(track, car.x, car.y);
      const s = arcPosition(track, cl.segIndex, cl.t);
      return {
        name: car.name,
        progress: (this.lapCount[i] || 0) * total + s,
      };
    });
    rows.sort((a, b) => b.progress - a.progress);
    return rows.map((r, place) => ({
      name: r.name,
      place: place + 1,
    }));
  }

  _render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, w, h);

    const view = this._view;
    drawWorld(ctx, this.track, view);

    const track = this.track;
    const total = trackLength(track);
    const progress = this.cars.map((c, i) => {
      const cl = closestOnTrack(track, c.x, c.y);
      const s = arcPosition(track, cl.segIndex, cl.t);
      return (this.lapCount[i] || 0) * total + s;
    });
    let best = -1;
    let leader = this.cars[0];
    for (let i = 0; i < this.cars.length; i++) {
      if (progress[i] > best) {
        best = progress[i];
        leader = this.cars[i];
      }
    }
    const sorted = [...this.cars].sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    });
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(view.scale, view.scale);
    ctx.translate(-view.centerX, -view.centerY);
    for (const car of sorted) {
      drawCar(ctx, car, car === leader);
    }
    ctx.restore();

    drawMinimap(this.minimap, this.track, this.cars);
  }
}
