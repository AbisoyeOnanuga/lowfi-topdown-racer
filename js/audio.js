const MUTE_KEY = "lowfi-racer-audio-muted";

/** Procedural bleeps — no asset files, Web Audio only. */
export function createArcadeAudio() {
  /** @type {AudioContext | null} */
  let ctx = null;
  /** @type {GainNode | null} */
  let master = null;
  /** @type {OscillatorNode | null} */
  let engineOsc = null;
  /** @type {GainNode | null} */
  let engineGain = null;

  /** @type {AudioBufferSourceNode | null} */
  let rumbleSrc = null;
  /** @type {GainNode | null} */
  let rumbleGain = null;
  /** @type {BiquadFilterNode | null} */
  let rumbleFilter = null;
  /** @type {AudioBuffer | null} */
  let rumbleBuffer = null;

  let muted = false;
  try {
    muted = localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    muted = false;
  }

  function masterLinear() {
    if (muted) return 0;
    const coarse =
      typeof window !== "undefined" &&
      window.matchMedia?.("(pointer: coarse)")?.matches;
    return coarse ? 0.2 : 0.17;
  }

  function ensure() {
    if (ctx) return;
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = masterLinear();
    master.connect(ctx.destination);
  }

  /** Required on many mobile browsers after a tap / pointer event. */
  async function resumeContext() {
    ensure();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
  }

  function getRumbleBuffer() {
    ensure();
    if (!ctx || rumbleBuffer) return rumbleBuffer;
    const len = Math.floor(ctx.sampleRate * 0.32);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      brown = 0.985 * brown + 0.018 * white;
      d[i] = brown;
    }
    rumbleBuffer = buf;
    return rumbleBuffer;
  }

  function ensureRumbleChain() {
    ensure();
    if (!ctx || !master || rumbleSrc) return;
    const buf = getRumbleBuffer();
    if (!buf) return;
    rumbleSrc = ctx.createBufferSource();
    rumbleSrc.buffer = buf;
    rumbleSrc.loop = true;
    rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = "lowpass";
    rumbleFilter.frequency.value = 220;
    rumbleFilter.Q.value = 0.7;
    rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0;
    rumbleSrc.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(master);
    rumbleSrc.start();
  }

  function stopRumble() {
    if (rumbleSrc && ctx) {
      try {
        rumbleSrc.stop();
      } catch {
        /* already stopped */
      }
    }
    rumbleSrc = null;
    rumbleGain = null;
    rumbleFilter = null;
  }

  function beep(freq, dur, type = "square", vol = 0.35) {
    if (!ctx || !master) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = vol;
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g);
    g.connect(master);
    o.start();
    o.stop(ctx.currentTime + dur + 0.02);
  }

  return {
    ensure,
    get muted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      try {
        localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
      } catch {
        /* ignore */
      }
      if (master) master.gain.value = masterLinear();
      return muted;
    },
    resumeContext,
    playLightTick() {
      ensure();
      void resumeContext();
      beep(520, 0.05, "square", 0.22);
    },
    playGo() {
      ensure();
      void resumeContext();
      if (!ctx || !master) return;
      const t0 = ctx.currentTime;
      [440, 554, 659].forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "square";
        o.frequency.value = f;
        g.gain.value = 0.28;
        g.gain.setValueAtTime(0.28, t0 + i * 0.06);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + i * 0.06 + 0.12);
        o.connect(g);
        g.connect(master);
        o.start(t0 + i * 0.06);
        o.stop(t0 + i * 0.06 + 0.15);
      });
    },
    /**
     * @param {number} speedKmh
     * @param {number} [offTrack] 0–1 severity when tyres leave asphalt (moving only)
     */
    setEngineFromSpeed(speedKmh, offTrack = 0) {
      ensure();
      void resumeContext();
      if (!ctx || !master) return;
      const n = Math.min(1, Math.max(0, speedKmh / 420));
      const idle = 0.08;
      const eff = Math.max(idle, n);
      const ot = Math.min(1, Math.max(0, offTrack));
      const moving = speedKmh > 12;
      /** Softer engine in dirt; rumble carries texture instead of a harsh saw. */
      const surfaceDuck = 1 - ot * 0.42;

      if (!engineOsc) {
        engineOsc = ctx.createOscillator();
        engineGain = ctx.createGain();
        engineOsc.type = "sawtooth";
        engineOsc.connect(engineGain);
        engineGain.connect(master);
        engineGain.gain.value = muted ? 0 : 0.048 * eff * surfaceDuck;
        engineOsc.frequency.value = 48 + n * 98;
        engineOsc.start();
      } else {
        const targetFreq = 48 + n * 98;
        const targetGain = muted ? 0 : 0.048 * eff * surfaceDuck;
        engineOsc.frequency.setTargetAtTime(targetFreq, ctx.currentTime, 0.04);
        engineGain.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.05);
      }

      const rumbleAmt =
        moving && ot > 0.04
          ? ot * Math.min(1, (speedKmh - 12) / 200) * 0.55
          : 0;

      if (rumbleAmt > 0.002) {
        ensureRumbleChain();
        if (rumbleGain && rumbleFilter && ctx) {
          const g = muted ? 0 : rumbleAmt * 0.16;
          rumbleGain.gain.setTargetAtTime(g, ctx.currentTime, 0.06);
          rumbleFilter.frequency.setTargetAtTime(160 + ot * 140, ctx.currentTime, 0.08);
        }
      } else {
        if (rumbleGain && ctx) {
          rumbleGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
        }
      }
    },
    stopEngine() {
      if (engineOsc && ctx) {
        try {
          engineOsc.stop();
        } catch {
          /* already stopped */
        }
      }
      engineOsc = null;
      engineGain = null;
      stopRumble();
    },
  };
}
