/** Mutable keyboard + touch state for player 1 */
export function createInput() {
  const keys = new Set();
  const down = (e) => {
    keys.add(e.code);
    keys.add(e.key);
  };
  const up = (e) => {
    keys.delete(e.code);
    keys.delete(e.key);
  };

  /** @type {{ steer: number, accel: number, brake: number }} */
  const touch = { steer: 0, accel: 0, brake: 0 };

  function keyboardSteer() {
    let v = 0;
    if (keys.has("ArrowLeft") || keys.has("KeyA")) v -= 1;
    if (keys.has("ArrowRight") || keys.has("KeyD")) v += 1;
    return v;
  }

  function keyboardAccel() {
    let v = 0;
    if (keys.has("ArrowUp") || keys.has("KeyW")) v += 1;
    if (keys.has("KeyZ") || keys.has("Space")) v += 1;
    return v;
  }

  function keyboardBrake() {
    let v = 0;
    if (keys.has("ArrowDown") || keys.has("KeyS")) v += 1;
    if (keys.has("KeyX")) v += 1;
    return v;
  }

  return {
    keys,
    attach() {
      window.addEventListener("keydown", down);
      window.addEventListener("keyup", up);
    },
    detach() {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      keys.clear();
    },
    /** @param {number} s -1..1 */
    setTouchSteer(s) {
      touch.steer = Math.max(-1, Math.min(1, s));
    },
    setTouchAccel(v) {
      touch.accel = v > 0 ? 1 : 0;
    },
    setTouchBrake(v) {
      touch.brake = v > 0 ? 1 : 0;
    },
    clearTouch() {
      touch.steer = 0;
      touch.accel = 0;
      touch.brake = 0;
    },
    /** Returns -1 left, 1 right */
    steer() {
      const k = keyboardSteer();
      const t = touch.steer;
      if (t !== 0) return t;
      return k;
    },
    accel() {
      return Math.max(keyboardAccel(), touch.accel);
    },
    brake() {
      return Math.max(keyboardBrake(), touch.brake);
    },
  };
}
