// Api Wok Rush — engine self-test in Node (no browser needed).
// Plays full shifts through the real rules and asserts the win path, the
// loss path, the Api Wok twist and the order rules.
import { newGame, startGame, addIngredient, serve, clearPlate, tick, plateDone } from './game/src/engine.js';
import { SHIFT, RECIPES } from './game/src/config.js';

let pass = 0;
let fail = 0;
function check(name, cond, extra = '') {
  if (cond) {
    pass++;
    console.log(`  ok   ${name}`);
  } else {
    fail++;
    console.log(`  FAIL ${name} ${extra}`);
  }
}

function serveOne(g, recipeId) {
  const r = RECIPES.find((x) => x.id === recipeId);
  // Make sure a ticket for it exists.
  if (!g.orders.some((o) => o.recipeId === recipeId)) {
    g.orders.push({ id: 999, recipeId, patienceMs: 30000, maxPatienceMs: 32000, bornMs: 0 });
  }
  for (const s of r.steps) {
    const res = addIngredient(g, s);
    if (!res.ok) return res;
  }
  return serve(g);
}

console.log('== 1. correct assembly + serve earns coins ==');
{
  const g = newGame(7);
  startGame(g);
  tick(g, 5000); // first ticket arrives
  const first = g.orders[0].recipeId;
  const before = g.coins;
  const r = serveOne(g, first);
  check('serve succeeds', r.ok === true, JSON.stringify(r));
  check('coins increase', g.coins > before, `${before} -> ${g.coins}`);
  check('served counts', g.served === 1);
  check('combo grows', g.combo === 1);
}

console.log('== 2. wrong ingredient order is refused, costs time ==');
{
  const g = newGame(7);
  startGame(g);
  const t0 = g.timeLeftMs;
  const r = addIngredient(g, 'ayam'); // every recipe starts with nasi/mie
  check('wrong first ingredient refused', r.ok === false);
  check('time penalty applied', g.timeLeftMs === t0 - SHIFT.wrongIngredientPenaltyMs);
  check('plate stays empty', g.plate.length === 0);
  check('mistake counted', g.mistakes === 1);
}

console.log('== 3. Api Wok: flame climbs on correct steps, cools idle, wipes a cold plate ==');
{
  const g = newGame(7);
  startGame(g);
  check('flame starts at 1', g.flame === 1);
  addIngredient(g, 'nasi');
  check('flame climbs to 2', g.flame === 2);
  addIngredient(g, 'telur');
  check('flame climbs to 3', g.flame === 3);
  tick(g, SHIFT.flameDecayMs);
  check('flame cools to 2 after 8 s idle', g.flame === 2);
  check('plate survives one cool-down', g.plate.length === 2);
  tick(g, SHIFT.flameDecayMs * 2); // flame 2 -> 0, plate goes cold
  check('flame reaches 0', g.flame === 0);
  check('cold plate is wiped', g.plate.length === 0, `plate=${g.plate.length}`);
}

console.log('== 4. serving a dish nobody ordered costs a heart ==');
{
  const g = newGame(7);
  startGame(g);
  g.orders.length = 0; // no tickets at all
  for (const s of ['nasi', 'telur', 'sayur']) addIngredient(g, s);
  check('plate done', plateDone(g) === true);
  const r = serve(g);
  check('serve refused without an order', r.ok === false && r.why === 'no-order');
  check('heart lost', g.hearts === SHIFT.hearts - 1);
}

console.log('== 5. expired ticket costs coins + a heart ==');
{
  const g = newGame(7);
  startGame(g);
  tick(g, 5000);
  const n = g.orders.length;
  check('ticket arrived', n >= 1);
  g.coins = 20;
  tick(g, 40000); // patience (32 s) runs out — every live ticket expires
  check('tickets expired', g.expired >= 1, `expired=${g.expired}`);
  check('coins penalised per expiry', g.coins === 20 - g.expired * SHIFT.expirePenaltyCoins, `coins=${g.coins} expired=${g.expired}`);
  check('hearts lost per expiry', g.hearts === Math.max(0, SHIFT.hearts - g.expired), `hearts=${g.hearts}`);
}

console.log('== 6. win path: serving well reaches the target before time runs out ==');
{
  const g = newGame(11);
  startGame(g);
  let guard = 0;
  while (g.phase === 'playing' && guard++ < 200) {
    tick(g, 1000);
    if (g.orders.length > 0) {
      const r = serveOne(g, g.orders[0].recipeId);
      if (!r.ok) clearPlate(g);
    }
  }
  check('shift ends won', g.phase === 'won', `phase=${g.phase} coins=${g.coins} served=${g.served}`);
  check('coins reach target', g.coins >= SHIFT.targetCoins, `coins=${g.coins}`);
}

console.log('== 7. loss path: doing nothing loses the shift ==');
{
  const g = newGame(3);
  startGame(g);
  tick(g, SHIFT.seconds * 1000 + 1000);
  check('idle shift is lost', g.phase === 'lost', `phase=${g.phase}`);
}

console.log('== 8. flame bonus: a fast chained serve pays more than a slow one ==');
{
  const cold = newGame(7);
  startGame(cold);
  cold.flame = 0;
  tick(cold, 5000);
  const recipe = RECIPES.find((x) => x.id === cold.orders[0].recipeId);
  // Slow cook: 7 s between steps, so the flame never chains up.
  for (const s of recipe.steps) {
    addIngredient(cold, s);
    tick(cold, 7000);
  }
  const r1 = serve(cold);
  const hot = newGame(7);
  startGame(hot);
  tick(hot, 5000);
  const r2 = serveOne(hot, hot.orders[0].recipeId); // chained, flame 3
  check('slow serve earns less than fast serve', r2.earned > r1.earned, `slow=${r1.earned} fast=${r2.earned}`);
  check('slow cook flame stayed low', cold.flame === 1, `flame=${cold.flame}`);
  check('fast cook flame hit 3', hot.flame === 3, `flame=${hot.flame}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
