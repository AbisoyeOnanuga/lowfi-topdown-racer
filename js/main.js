import { createInput } from "./input.js";
import { GameSession } from "./game.js";
import { TRACKS } from "./track.js";
import { VEHICLES } from "./vehicles.js";
import { formatRaceTime } from "./timeutil.js";
import { getBestLap, tryRecordBestLap } from "./bestlap.js";
import { createArcadeAudio } from "./audio.js";
import { fitGameCanvases } from "./layout.js";
import { attachTouchRaceControls } from "./touch.js";

const el = (id) => document.getElementById(id);

const screens = {
  main: el("menu-main"),
  setup: el("menu-setup"),
  how: el("menu-how"),
  results: el("menu-results"),
};

const app = el("app");
const gameStage = el("game-stage");
const hud = el("hud");
const canvas = el("game-canvas");
const minimap = el("minimap");
const startSeq = el("start-sequence");
const startGo = el("start-go");
const touchControls = el("touch-controls");
const lightEls = () => [...document.querySelectorAll(".start-lights .light")];

const input = createInput();
input.attach();

const audio = createArcadeAudio();
/** @type {number} */
let lastLightReds = 0;
let lastShowGo = false;

/** @type {(() => void) | null} */
let detachTouch = null;

/** @type {GameSession | null} */
let session = null;

function syncLayout() {
  const stage = gameStage || app;
  if (!stage) return;
  fitGameCanvases(stage, canvas, minimap);
  session?.resize();
}

function updateHudHintMode() {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.innerWidth < 900;
  const keysEl = document.querySelector(".hud-hint-keys");
  const touchEl = document.querySelector(".hud-hint-touch");
  if (keysEl) keysEl.classList.toggle("hidden", coarse || narrow);
  if (touchEl) touchEl.classList.toggle("hidden", !(coarse || narrow));
}

function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.add("hidden"));
  if (name && screens[name]) screens[name].classList.remove("hidden");
  if (name === "main" || name === "setup" || name === "how" || name === "results") {
    hud.classList.add("hidden");
  }
}

function hideStartSequence() {
  startSeq.classList.add("hidden");
  startGo.classList.add("hidden");
  for (const L of lightEls()) {
    L.classList.remove("on");
  }
}

function fillSelects() {
  const vSel = el("select-vehicle");
  const tSel = el("select-track");
  vSel.innerHTML = "";
  tSel.innerHTML = "";
  for (const v of VEHICLES) {
    const o = document.createElement("option");
    o.value = v.id;
    o.textContent = v.name;
    vSel.appendChild(o);
  }
  for (const t of TRACKS) {
    const o = document.createElement("option");
    o.value = t.id;
    o.textContent = t.name;
    tSel.appendChild(o);
  }
}

function quitToMenu() {
  if (!session) return;
  session.stop();
  session = null;
  input.clearTouch();
  if (detachTouch) {
    detachTouch();
    detachTouch = null;
  }
  if (touchControls) {
    touchControls.classList.remove("active");
    touchControls.setAttribute("aria-hidden", "true");
  }
  hud.classList.remove("touch-mode");
  document.body.classList.remove("race-active");
  if (app) app.classList.remove("app--racing");
  audio.stopEngine();
  lastLightReds = 0;
  lastShowGo = false;
  hideStartSequence();
  hud.classList.add("hidden");
  showScreen("main");
}

function maybeShowRotateHint() {
  const hint = el("rotate-hint");
  if (!hint) return;
  if (window.matchMedia("(orientation: landscape)").matches) return;
  try {
    if (sessionStorage.getItem("lowfi-dismiss-rotate") === "1") return;
  } catch {
    /* ignore */
  }
  hint.classList.remove("hidden");
}

function bindHud(data) {
  if (!data.hud) return;
  const phase = data.phase;
  if (phase === "racing") {
    audio.ensure();
    const ot =
      typeof data.hud.offTrack === "number" ? data.hud.offTrack : 0;
    audio.setEngineFromSpeed(data.hud.speed, ot);
  } else {
    audio.stopEngine();
  }
  el("hud-speed").textContent = String(data.hud.speed);
  el("hud-lap").textContent = data.hud.lapLabel;
  el("hud-pos").textContent = data.hud.posLabel;
  const waitEl = el("hud-wait");
  if (waitEl) {
    waitEl.classList.toggle("hidden", !data.hud.waitingForField);
  }
  const timeEl = el("hud-time");
  if (timeEl && data.hud.timeLabel != null) {
    timeEl.textContent = data.hud.timeLabel;
  }
  const body = el("hud-lb-body");
  if (body && data.hud.leaderboard) {
    body.innerHTML = "";
    for (const r of data.hud.leaderboard) {
      const tr = document.createElement("tr");
      const short =
        r.name.length > 9 ? `${r.name.slice(0, 8)}…` : r.name;
      tr.innerHTML = `<td>${r.place}</td><td title="${r.name}">${short}</td><td>${r.laps}/${r.lapsTotal}</td>`;
      body.appendChild(tr);
    }
  }
}

function bindLights(lights) {
  if (!lights) return;
  if (!lights.active) {
    hideStartSequence();
    lastLightReds = 0;
    lastShowGo = false;
    return;
  }
  audio.ensure();
  const reds = lights.redsOn ?? 0;
  if (reds > lastLightReds) {
    audio.playLightTick();
  }
  lastLightReds = reds;
  if (lights.showGo && !lastShowGo) {
    audio.playGo();
  }
  lastShowGo = !!lights.showGo;
  startSeq.classList.remove("hidden");
  const list = lightEls();
  for (let i = 0; i < list.length; i++) {
    list[i].classList.toggle("on", i < reds);
  }
  if (lights.showGo) {
    startGo.classList.remove("hidden");
  } else {
    startGo.classList.add("hidden");
  }
}

function startRace() {
  const vehicleId = el("select-vehicle").value;
  const trackId = el("select-track").value;
  const difficulty = el("select-difficulty").value;
  const laps = Number(el("input-laps").value) || 3;

  audio.ensure();
  lastLightReds = 0;
  lastShowGo = false;

  syncLayout();
  updateHudHintMode();

  const useTouchUi =
    window.matchMedia("(pointer: coarse)").matches ||
    window.innerWidth < 900;

  Object.values(screens).forEach((s) => s.classList.add("hidden"));
  hud.classList.remove("hidden");
  if (useTouchUi) hud.classList.add("touch-mode");
  document.body.classList.add("race-active");
  if (app) app.classList.add("app--racing");
  startSeq.classList.remove("hidden");
  for (const L of lightEls()) L.classList.remove("on");
  startGo.classList.add("hidden");

  if (touchControls) {
    touchControls.classList.add("active");
    touchControls.setAttribute("aria-hidden", "false");
    detachTouch = attachTouchRaceControls(input, touchControls);
  }

  maybeShowRotateHint();

  session = new GameSession({
    canvas,
    minimap,
    input,
    vehicleId,
    trackId,
    difficulty,
    laps,
    onUpdate: (state) => {
      bindHud(state);
      if (state.lights) bindLights(state.lights);
    },
    onFinish: (results) => {
      session = null;
      input.clearTouch();
      if (detachTouch) {
        detachTouch();
        detachTouch = null;
      }
      if (touchControls) {
        touchControls.classList.remove("active");
        touchControls.setAttribute("aria-hidden", "true");
      }
      hud.classList.remove("touch-mode");
      document.body.classList.remove("race-active");
      if (app) app.classList.remove("app--racing");
      audio.stopEngine();
      hideStartSequence();
      lastLightReds = 0;
      lastShowGo = false;
      const tbody = el("results-body");
      tbody.innerHTML = "";
      const player = results.find((r) => r.name === "You");
      const pb = tryRecordBestLap(trackId, player?.time ?? null);
      const recordEl = el("results-record");
      if (recordEl) {
        recordEl.classList.toggle("hidden", !pb.improved);
        recordEl.textContent = pb.improved
          ? "New track record saved locally."
          : "";
      }
      for (const r of results) {
        const tr = document.createElement("tr");
        const timeStr =
          r.time != null ? formatRaceTime(r.time) : "—";
        tr.innerHTML = `<td>${r.place}</td><td>${r.name}</td><td>${timeStr}</td>`;
        if (r.name === "You") tr.classList.add("results-you");
        tbody.appendChild(tr);
      }
      el("results-title").textContent = "Results";
      hud.classList.add("hidden");
      showScreen("results");
    },
  });
  session.start();
}

function onKeyDown(e) {
  if (session && (e.code === "Space" || e.code.startsWith("Arrow"))) {
    e.preventDefault();
  }
  if (e.code === "Escape" && session) {
    e.preventDefault();
    quitToMenu();
  }
}

function refreshSetupBest() {
  const line = el("setup-best");
  if (!line) return;
  const tid = el("select-track").value;
  const best = getBestLap(tid);
  line.textContent = best != null
    ? `Track record (this browser): ${formatRaceTime(best)}`
    : "No track record yet — finish a race to set one.";
}

el("btn-start").addEventListener("click", () => {
  fillSelects();
  refreshSetupBest();
  showScreen("setup");
});

el("select-track").addEventListener("change", refreshSetupBest);

el("btn-how").addEventListener("click", () => showScreen("how"));

el("btn-back-main").addEventListener("click", () => showScreen("main"));

el("btn-how-back").addEventListener("click", () => showScreen("main"));

el("btn-go-race").addEventListener("click", startRace);

el("btn-results-menu").addEventListener("click", () => showScreen("main"));

const hudQuit = el("hud-quit");
if (hudQuit) {
  hudQuit.addEventListener("click", () => quitToMenu());
}

const dismissRotate = el("rotate-hint-dismiss");
if (dismissRotate) {
  dismissRotate.addEventListener("click", () => {
    const hint = el("rotate-hint");
    if (hint) hint.classList.add("hidden");
    try {
      sessionStorage.setItem("lowfi-dismiss-rotate", "1");
    } catch {
      /* ignore */
    }
  });
}

const btnMute = el("btn-audio-mute");
if (btnMute) {
  const syncMuteLabel = () => {
    btnMute.textContent = audio.muted ? "Audio: off" : "Audio: on";
    btnMute.setAttribute("aria-pressed", audio.muted ? "true" : "false");
  };
  syncMuteLabel();
  btnMute.addEventListener("click", () => {
    audio.toggleMute();
    syncMuteLabel();
  });
}

window.addEventListener("keydown", onKeyDown);

let resizeT = 0;
window.addEventListener("resize", () => {
  clearTimeout(resizeT);
  resizeT = window.setTimeout(() => {
    syncLayout();
    updateHudHintMode();
  }, 90);
});
window.addEventListener("orientationchange", () => {
  window.setTimeout(() => {
    syncLayout();
    updateHudHintMode();
  }, 150);
});

fillSelects();
syncLayout();
updateHudHintMode();
showScreen("main");
