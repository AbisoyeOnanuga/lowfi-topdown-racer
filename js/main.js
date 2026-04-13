import { createInput } from "./input.js";
import { GameSession } from "./game.js";
import { TRACKS } from "./track.js";
import { VEHICLES } from "./vehicles.js";
import { formatRaceTime } from "./timeutil.js";

const el = (id) => document.getElementById(id);

const screens = {
  main: el("menu-main"),
  setup: el("menu-setup"),
  how: el("menu-how"),
  results: el("menu-results"),
};

const hud = el("hud");
const canvas = el("game-canvas");
const minimap = el("minimap");
const startSeq = el("start-sequence");
const startGo = el("start-go");
const lightEls = () => [...document.querySelectorAll(".start-lights .light")];

const input = createInput();
input.attach();

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

/** @type {GameSession | null} */
let session = null;

function bindHud(data) {
  if (!data.hud) return;
  el("hud-speed").textContent = String(data.hud.speed);
  el("hud-lap").textContent = data.hud.lapLabel;
  el("hud-pos").textContent = data.hud.posLabel;
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
    return;
  }
  startSeq.classList.remove("hidden");
  const reds = lights.redsOn ?? 0;
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

  Object.values(screens).forEach((s) => s.classList.add("hidden"));
  hud.classList.remove("hidden");
  startSeq.classList.remove("hidden");
  for (const L of lightEls()) L.classList.remove("on");
  startGo.classList.add("hidden");

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
      hideStartSequence();
      const tbody = el("results-body");
      tbody.innerHTML = "";
      for (const r of results) {
        const tr = document.createElement("tr");
        const timeStr =
          r.time != null ? formatRaceTime(r.time) : "—";
        tr.innerHTML = `<td>${r.place}</td><td>${r.name}</td><td>${timeStr}</td>`;
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
    session.stop();
    session = null;
    hideStartSequence();
    hud.classList.add("hidden");
    showScreen("main");
  }
}

el("btn-start").addEventListener("click", () => {
  fillSelects();
  showScreen("setup");
});

el("btn-how").addEventListener("click", () => showScreen("how"));

el("btn-back-main").addEventListener("click", () => showScreen("main"));

el("btn-how-back").addEventListener("click", () => showScreen("main"));

el("btn-go-race").addEventListener("click", startRace);

el("btn-results-menu").addEventListener("click", () => showScreen("main"));

window.addEventListener("keydown", onKeyDown);

fillSelects();
showScreen("main");
