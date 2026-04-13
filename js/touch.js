/**
 * On-screen controls for coarse pointers (phones). Uses pointer events so mouse still works.
 * @param {ReturnType<import('./input.js').createInput>} input
 * @param {HTMLElement} root
 */
export function attachTouchRaceControls(input, root) {
  const left = root.querySelector('[data-touch="left"]');
  const right = root.querySelector('[data-touch="right"]');
  const gas = root.querySelector('[data-touch="gas"]');
  const brake = root.querySelector('[data-touch="brake"]');

  /** @type {Set<string>} */
  const active = new Set();

  function syncSteer() {
    let s = 0;
    if (active.has("left")) s -= 1;
    if (active.has("right")) s += 1;
    input.setTouchSteer(s);
  }

  function bind(el, id, onDown, onUp) {
    if (!el) return;
    el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      active.add(id);
      onDown();
    });
    const release = () => {
      active.delete(id);
      onUp();
    };
    el.addEventListener("pointerup", (e) => {
      e.preventDefault();
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      release();
    });
    el.addEventListener("pointercancel", release);
    el.addEventListener("lostpointercapture", release);
  }

  bind(left, "left", syncSteer, syncSteer);
  bind(right, "right", syncSteer, syncSteer);
  bind(
    gas,
    "gas",
    () => {
      input.setTouchAccel(1);
    },
    () => {
      input.setTouchAccel(0);
    }
  );
  bind(
    brake,
    "brake",
    () => {
      input.setTouchBrake(1);
    },
    () => {
      input.setTouchBrake(0);
    }
  );

  return () => {
    input.clearTouch();
    active.clear();
  };
}
