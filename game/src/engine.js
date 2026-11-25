// Nasi Goreng Rush — pure game engine (no DOM, no timers of its own).
// The browser drives it with tick(ms); Node tests drive it the same way,
// so the rules below are exactly the rules the screenshots show.
//
// State machine: title -> playing -> won | lost. While playing the cook
// assembles one dish at a time on the plate: ingredients must be added in
// the recipe's order for the dish the cook has started. The first
// ingredient picks the dish (every recipe starts with nasi or mie, and the
// second step disambiguates); a wrong ingredient sizzles, costs time and
// breaks the combo. SERVE delivers the finished plate to the earliest
// ticket that ordered that dish; serving a dish nobody ordered is a
// mistake. A ticket whose patience runs out walks out: -5 coins, -1 heart.
//
// THE TWIST — API WOK: the wok flame (0..3) climbs one level per correct
// ingredient, but only when it lands within 6 s of the previous one (a
// chain), and cools one level every 8 s idle. Serving with a high flame
// pays +2 coins per flame level; if the flame dies while a plate is
// mid-assembly, the dish goes cold and the plate is wiped. Fast, rhythmic
// cooking is the whole game: never let the wok go cold.

import { ING_BY_ID, RECIPES, RECIPE_BY_ID, SHIFT } from './config.js';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function newGame(seed = 1) {
  const rng = mulberry32(seed);
  return {
    seed,
    rng,
    phase: 'title', // title | playing | won | lost
    timeLeftMs: SHIFT.seconds * 1000,
    elapsedMs: 0,
    coins: 0,
    combo: 0,
    bestCombo: 0,
    hearts: SHIFT.hearts,
    served: 0,
    mistakes: 0,
    expired: 0,
    orders: [], // {id, recipeId, patienceMs, maxPatienceMs, bornMs}
    nextOrderId: 1,
    orderTimerMs: 4000, // first ticket arrives quickly
    plate: [], // ingredient ids already on the plate, in order
    dishId: null, // recipe the plate is building, once disambiguated
    candidates: RECIPES.map((r) => r.id), // recipes still matching the plate
    flame: 1, // Api Wok level 0..3; +1 per chained correct ingredient, -1 per 8 s idle
    flameTimerMs: SHIFT.flameDecayMs,
    lastAddMs: null, // elapsedMs of the last correct ingredient (chain timing)
    log: ['Selamat datang di Dapur Kilat! Klik MULAI untuk buka warung.'],
    lastServe: null, // {dishName, coins, atMs} shown on the serving counter
    flash: null, // 'ok' | 'bad' | null, consumed by the renderer
    stars: 0,
  };
}

export function startGame(g) {
  g.phase = 'playing';
  g.log.push('Shift dimulai — 150 detik, target 120 koin!');
}

function pushLog(g, line) {
  g.log.push(line);
  if (g.log.length > 6) g.log.shift();
}

function spawnOrder(g) {
  if (g.orders.length >= SHIFT.maxOrders) return;
  const pick = RECIPES[Math.floor(g.rng() * RECIPES.length)];
  g.orders.push({
    id: g.nextOrderId++,
    recipeId: pick.id,
    patienceMs: SHIFT.patienceMs,
    maxPatienceMs: SHIFT.patienceMs,
    bornMs: g.elapsedMs,
  });
  pushLog(g, `Pesanan baru: ${pick.name}.`);
}

export function currentRecipe(g) {
  return g.dishId ? RECIPE_BY_ID[g.dishId] : null;
}

// What the plate still needs next, for the dish being built (or the
// possible first steps when nothing is on the plate yet).
export function nextSteps(g) {
  if (g.plate.length === 0) return ['nasi', 'mie'];
  if (g.dishId) {
    const r = RECIPE_BY_ID[g.dishId];
    return r.steps.slice(g.plate.length, g.plate.length + 1);
  }
  // Still ambiguous: the recipes matching the plate so far.
  const out = new Set();
  for (const id of g.candidates) {
    const r = RECIPE_BY_ID[id];
    if (r.steps.length > g.plate.length) out.add(r.steps[g.plate.length]);
  }
  return [...out];
}

export function addIngredient(g, ingId) {
  if (g.phase !== 'playing') return { ok: false, why: 'not-playing' };
  if (!ING_BY_ID[ingId]) return { ok: false, why: 'unknown-ingredient' };
  const need = nextSteps(g);
  if (!need.includes(ingId)) {
    g.mistakes += 1;
    g.combo = 0;
    g.timeLeftMs = Math.max(0, g.timeLeftMs - SHIFT.wrongIngredientPenaltyMs);
    g.flash = 'bad';
    pushLog(g, `${ING_BY_ID[ingId].name} salah urutan! -2 detik.`);
    return { ok: false, why: 'wrong-order', need };
  }
  g.plate.push(ingId);
  // Stoke the wok — but only a chained add (within 6 s of the previous
  // one) raises the flame; a slow cook keeps the flame where it is.
  const chained = g.lastAddMs === null || g.elapsedMs - g.lastAddMs <= SHIFT.flameChainMs;
  if (chained) g.flame = Math.min(SHIFT.flameMax, g.flame + 1);
  g.lastAddMs = g.elapsedMs;
  g.flameTimerMs = SHIFT.flameDecayMs;
  g.candidates = g.candidates.filter((id) => {
    const r = RECIPE_BY_ID[id];
    return r.steps.length > g.plate.length - 1 && r.steps[g.plate.length - 1] === ingId;
  });
  if (g.candidates.length === 1) g.dishId = g.candidates[0];
  if (g.dishId && g.plate.length === RECIPE_BY_ID[g.dishId].steps.length) {
    g.flash = 'ok';
    pushLog(g, `${RECIPE_BY_ID[g.dishId].name} siap disajikan! Tekan SAJIKAN.`);
  } else {
    g.flash = 'ok';
  }
  return { ok: true, dishId: g.dishId, done: !!g.dishId && g.plate.length === RECIPE_BY_ID[g.dishId].steps.length };
}

export function plateDone(g) {
  return !!g.dishId && g.plate.length === RECIPE_BY_ID[g.dishId].steps.length;
}

export function serve(g) {
  if (g.phase !== 'playing') return { ok: false, why: 'not-playing' };
  if (!plateDone(g)) return { ok: false, why: 'plate-not-ready' };
  const dish = RECIPE_BY_ID[g.dishId];
  const idx = g.orders.findIndex((o) => o.recipeId === dish.id);
  if (idx === -1) {
    // A finished dish nobody ordered: the customer shakes their head.
    g.mistakes += 1;
    g.combo = 0;
    g.hearts = Math.max(0, g.hearts - 1);
    g.timeLeftMs = Math.max(0, g.timeLeftMs - SHIFT.wrongServePenaltyMs);
    g.flash = 'bad';
    pushLog(g, `Tidak ada yang pesan ${dish.name}! -1 hati, -5 detik.`);
    g.plate = [];
    g.dishId = null;
    g.candidates = RECIPES.map((r) => r.id);
    if (g.hearts === 0) endShift(g, 'lost');
    return { ok: false, why: 'no-order' };
  }
  const order = g.orders[idx];
  g.orders.splice(idx, 1);
  const speedBonus = Math.round((order.patienceMs / order.maxPatienceMs) * 6);
  const mult = 1 + Math.min(g.combo, 8) * SHIFT.comboStep;
  const flameBonus = g.flame * SHIFT.flameBonusCoins;
  const earned = Math.round((dish.price + speedBonus) * Math.min(mult, SHIFT.comboCap)) + flameBonus;
  g.coins += earned;
  g.combo += 1;
  g.bestCombo = Math.max(g.bestCombo, g.combo);
  g.served += 1;
  g.lastServe = { dishName: dish.name, coins: earned, atMs: g.elapsedMs };
  g.flash = 'ok';
  pushLog(g, `${dish.name} tersaji! +${earned} koin (kombo x${mult.toFixed(2)}, api +${flameBonus}).`);
  g.plate = [];
  g.dishId = null;
  g.candidates = RECIPES.map((r) => r.id);
  if (g.coins >= SHIFT.star3Coins) g.stars = 3;
  else if (g.coins >= SHIFT.targetCoins) g.stars = 2;
  else if (g.coins >= 60) g.stars = 1;
  return { ok: true, earned, orderId: order.id };
}

export function clearPlate(g) {
  if (g.phase !== 'playing') return;
  if (g.plate.length === 0) return;
  g.plate = [];
  g.dishId = null;
  g.candidates = RECIPES.map((r) => r.id);
  pushLog(g, 'Piring dibersihkan, mulai dari awal.');
}

export function tick(g, ms) {
  if (g.phase !== 'playing') return;
  g.elapsedMs += ms;
  g.timeLeftMs = Math.max(0, g.timeLeftMs - ms);
  // Api Wok cools down: one flame level every 8 s idle. A cold wok while
  // a dish is mid-assembly wipes the plate — the dish goes cold.
  g.flameTimerMs -= ms;
  while (g.flameTimerMs <= 0) {
    g.flameTimerMs += SHIFT.flameDecayMs;
    if (g.flame > 0) g.flame -= 1;
    if (g.flame === 0 && g.plate.length > 0) {
      g.plate = [];
      g.dishId = null;
      g.candidates = RECIPES.map((r) => r.id);
      g.flash = 'bad';
      pushLog(g, 'Api padam — hidangan jadi dingin, piring dikosongkan!');
    }
  }
  // New tickets.
  g.orderTimerMs -= ms;
  if (g.orderTimerMs <= 0) {
    spawnOrder(g);
    g.orderTimerMs = SHIFT.orderEveryMs;
  }
  // Patience runs out.
  for (let i = g.orders.length - 1; i >= 0; i--) {
    const o = g.orders[i];
    o.patienceMs -= ms;
    if (o.patienceMs <= 0) {
      const r = RECIPE_BY_ID[o.recipeId];
      g.orders.splice(i, 1);
      g.expired += 1;
      g.mistakes += 1;
      g.combo = 0;
      g.coins = Math.max(0, g.coins - SHIFT.expirePenaltyCoins);
      g.hearts = Math.max(0, g.hearts - 1);
      g.flash = 'bad';
      pushLog(g, `${r.name} keburu pergi! -5 koin, -1 hati.`);
      if (g.hearts === 0) {
        endShift(g, 'lost');
        return;
      }
    }
  }
  if (g.timeLeftMs <= 0) {
    endShift(g, g.coins >= SHIFT.targetCoins ? 'won' : 'lost');
  }
}

function endShift(g, phase) {
  g.phase = phase;
  if (phase === 'won') {
    g.stars = g.coins >= SHIFT.star3Coins ? 3 : g.coins >= SHIFT.targetCoins ? 2 : 1;
    pushLog(g, `Shift selesai — TARGET TERCAPAI! ${g.coins} koin, ${g.stars} bintang.`);
  } else {
    pushLog(g, `Shift selesai — ${g.coins} koin, target ${SHIFT.targetCoins}. Coba lagi!`);
  }
}

export function secondsLeft(g) {
  return Math.ceil(g.timeLeftMs / 1000);
}
