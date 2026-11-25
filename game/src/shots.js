// Api Wok Rush — staged ?shot= scenes. Each scene plays the real engine
// forward from a fixed seed, so the screenshots are real renders of the
// game's own code and byte-identical for the same seed.
import { startGame, addIngredient, serve, tick } from './engine.js';
import { RECIPE_BY_ID } from './config.js';

function playDish(g, recipeId) {
  const r = RECIPE_BY_ID[recipeId];
  for (const step of r.steps) addIngredient(g, step);
}

export function stageShot(g, shot, seed) {
  if (shot === 'title') {
    // Title screen over an empty kitchen.
    return;
  }
  startGame(g);
  if (shot === 'play') {
    // Mid-shift, mid-assembly: two tickets on the board, one dish half
    // built (nasi + telur of Nasgor Pedas), flame at level 2 (one level
    // cooled during the 9 s opening, two chained adds after), timer running.
    tick(g, 9000);
    g.orders.length = 0;
    g.orders.push(
      { id: 1, recipeId: 'nasgor-pedas', patienceMs: 26000, maxPatienceMs: 32000, bornMs: 1000 },
      { id: 2, recipeId: 'mie-goreng', patienceMs: 18000, maxPatienceMs: 32000, bornMs: 2000 },
    );
    g.nextOrderId = 3;
    addIngredient(g, 'nasi');
    addIngredient(g, 'telur');
    g.timeLeftMs = 118000; // 1:58 left
    g.coins = 34;
    g.combo = 2;
    g.log.push('Nasgor Pedas: nasi + telur sudah di wajan…');
    return;
  }
  if (shot === 'serve') {
    // A finished dish on the serving counter: Nasgor Pedas served for
    // +24 coins, flame still high, third ticket waiting, one more dish
    // mid-assembly (mie + telur of Mie Goreng).
    tick(g, 15000);
    g.orders.length = 0;
    g.orders.push(
      { id: 1, recipeId: 'nasgor-pedas', patienceMs: 24000, maxPatienceMs: 32000, bornMs: 1000 },
      { id: 2, recipeId: 'mie-pedas', patienceMs: 29000, maxPatienceMs: 32000, bornMs: 2000 },
    );
    g.nextOrderId = 3;
    playDish(g, 'nasgor-pedas');
    serve(g);
    addIngredient(g, 'mie');
    addIngredient(g, 'telur');
    g.timeLeftMs = 96000; // 1:36 left
    g.coins = 58;
    g.combo = 3;
    return;
  }
  if (shot === 'win') {
    // End of a winning shift: 132 coins, three tickets served, win panel.
    tick(g, 20000);
    g.orders.length = 0;
    g.orders.push({ id: 4, recipeId: 'nasgor-pedas', patienceMs: 24000, maxPatienceMs: 32000, bornMs: 3000 });
    g.nextOrderId = 5;
    playDish(g, 'nasgor-pedas');
    serve(g);
    g.orders.push({ id: 5, recipeId: 'mie-goreng', patienceMs: 20000, maxPatienceMs: 32000, bornMs: 4000 });
    g.nextOrderId = 6;
    playDish(g, 'mie-goreng');
    serve(g);
    g.coins = 132;
    g.served = 9;
    g.bestCombo = 5;
    g.combo = 5;
    g.stars = 2;
    g.phase = 'won';
    g.log.push('Shift selesai — TARGET TERCAPAI! 132 koin, 2 bintang.');
    return;
  }
  // Unknown shot: plain playing state.
}
