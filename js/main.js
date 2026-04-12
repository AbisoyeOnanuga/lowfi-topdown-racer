import { createInput } from "./input.js";
import { GameSession } from "./game.js";
import { TRACKS } from "./track.js";
import { VEHICLES } from "./vehicles.js";

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

const input = createInput();
input.attach();

function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.add("hidden"));
  if (name && screens[name]) screens[name].classList.remove("hidden");
  if (name === "main" || name === "setup" || name === "how" || name === "results") {
    hud.classList.add("hidden");
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
}

function startRace() {
  const vehicleId = el("select-vehicle").value;
  const trackId = el("select-track").value;
  const difficulty = el("select-difficulty").value;
  const laps = Number(el("input-laps").value) || 3;

  Object.values(screens).forEach((s) => s.classList.add("hidden"));
  hud.classList.remove("hidden");

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
    },
    onFinish: (results) => {
      session = null;
      const list = el("results-list");
      list.innerHTML = "";
      for (const r of results) {
        const li = document.createElement("li");
        li.textContent = `${r.place}. ${r.name}`;
        list.appendChild(li);
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
