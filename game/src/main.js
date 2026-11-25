// Api Wok Rush — browser wiring: game loop, input, staged ?shot= scenes.
// The loop ticks the engine every animation frame (capped at 250 ms per
// frame so a slow tab cannot skip the whole shift at once).
import { newGame, startGame, addIngredient, serve, clearPlate, tick } from './engine.js';
import { buildStatic, buildCounter, render } from './render.js';
import { makeSound } from './sound.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') || 7);
const shot = params.get('shot');

const g = newGame(seed);
const els = buildStatic(document.getElementById('app'));
const sound = makeSound();
window.__game = g;

const KEY_ING = { 1: 'nasi', 2: 'mie', 3: 'telur', 4: 'ayam', 5: 'cabai', 6: 'sayur' };

function pick(id) {
  const r = addIngredient(g, id);
  if (r.ok) sound.chop();
  else if (r.why === 'wrong-order') sound.bad();
  render(g, els);
}

function doServe() {
  const before = g.coins;
  const r = serve(g);
  if (r.ok) sound.serve();
  else if (r.why === 'no-order') sound.bad();
  render(g, els);
  return r;
}

buildCounter(els, pick);
els.serveBtn.addEventListener('click', doServe);
els.clearBtn.addEventListener('click', () => {
  clearPlate(g);
  render(g, els);
});
els.mute.addEventListener('click', () => {
  els.mute.textContent = sound.toggleMute() ? '✕' : '♪';
});
els.restart.addEventListener('click', () => location.reload());

document.addEventListener('click', (e) => {
  const s = e.target.closest('[data-start]');
  if (s) {
    startGame(g);
    sound.chop();
    render(g, els);
    return;
  }
  if (e.target.closest('[data-restart]')) location.reload();
});

document.addEventListener('keydown', (e) => {
  if (e.key >= '1' && e.key <= '6') {
    pick(KEY_ING[e.key]);
    return;
  }
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    if (g.phase === 'title') {
      startGame(g);
      render(g, els);
    } else {
      doServe();
    }
    return;
  }
  if (e.key === 'Backspace') {
    clearPlate(g);
    render(g, els);
    return;
  }
  if (e.key === 'm' || e.key === 'M') {
    els.mute.textContent = sound.toggleMute() ? '✕' : '♪';
    return;
  }
  if (e.key === 'r' || e.key === 'R') location.reload();
});

// Game loop: 100 ms ticks; the engine owns every rule.
let last = performance.now();
let lastWholeSecond = -1;
function frame(now) {
  const dt = Math.min(250, now - last);
  last = now;
  if (g.phase === 'playing') {
    const wasWon = g.phase;
    tick(g, dt);
    const s = Math.ceil(g.timeLeftMs / 1000);
    if (s !== lastWholeSecond) {
      lastWholeSecond = s;
      if (s <= 10 && s > 0) sound.tick();
    }
    if (g.phase !== wasWon && (g.phase === 'won' || g.phase === 'lost')) {
      if (g.phase === 'won') sound.win();
      else sound.bad();
    }
  }
  render(g, els);
  requestAnimationFrame(frame);
}

if (shot) {
  // Staged scene for screenshots: deterministic, no live loop needed.
  stageShot(g, shot, seed);
  render(g, els);
  window.__shotReady = true;
} else {
  render(g, els);
  window.__shotReady = true;
  requestAnimationFrame(frame);
}
