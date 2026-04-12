/** Mutable keyboard state for player 1 */
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
    /** Returns -1 left, 1 right */
    steer() {
      let v = 0;
      if (keys.has("ArrowLeft") || keys.has("KeyA")) v -= 1;
      if (keys.has("ArrowRight") || keys.has("KeyD")) v += 1;
      return v;
    },
    accel() {
      let v = 0;
      if (keys.has("ArrowUp") || keys.has("KeyW")) v += 1;
      if (keys.has("KeyZ") || keys.has("Space")) v += 1;
      return v;
    },
    brake() {
      let v = 0;
      if (keys.has("ArrowDown") || keys.has("KeyS")) v += 1;
      if (keys.has("KeyX")) v += 1;
      return v;
    },
  };
}
