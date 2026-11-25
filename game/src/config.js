// Nasi Goreng Rush — menu, ingredients and shift rules.
// All art, names and recipes are original, invented for this game.

export const INGREDIENTS = [
  { id: 'nasi',  name: 'Nasi',  key: '1', color: '#f2e8cf', ink: '#5b4636', mark: '◐' },
  { id: 'mie',   name: 'Mie',   key: '2', color: '#f6c453', ink: '#5b3a00', mark: '≋' },
  { id: 'telur', name: 'Telur', key: '3', color: '#ffe9a8', ink: '#7a5200', mark: '●' },
  { id: 'ayam',  name: 'Ayam',  key: '4', color: '#e07856', ink: '#fff7ec', mark: '▲' },
  { id: 'cabai', name: 'Cabai', key: '5', color: '#c0392b', ink: '#ffffff', mark: '◆' },
  { id: 'sayur', name: 'Sayur', key: '6', color: '#4e9b47', ink: '#ffffff', mark: '✿' },
];

export const ING_BY_ID = Object.fromEntries(INGREDIENTS.map((g) => [g.id, g]));

export const RECIPES = [
  {
    id: 'nasgor',
    name: 'Nasi Goreng',
    price: 12,
    steps: ['nasi', 'telur', 'sayur'],
    desc: 'Nasi + telur + sayur',
  },
  {
    id: 'nasgor-pedas',
    name: 'Nasgor Pedas',
    price: 16,
    steps: ['nasi', 'telur', 'ayam', 'cabai'],
    desc: 'Nasi + telur + ayam + cabai',
  },
  {
    id: 'mie-goreng',
    name: 'Mie Goreng',
    price: 14,
    steps: ['mie', 'telur', 'sayur'],
    desc: 'Mie + telur + sayur',
  },
  {
    id: 'mie-pedas',
    name: 'Mie Ayam Pedas',
    price: 18,
    steps: ['mie', 'ayam', 'cabai', 'sayur'],
    desc: 'Mie + ayam + cabai + sayur',
  },
];

export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map((r) => [r.id, r]));

export const SHIFT = {
  seconds: 150,          // one shift lasts 150 seconds
  targetCoins: 120,      // reach this to win the shift
  star3Coins: 180,       // three stars
  maxOrders: 3,          // tickets on the board at once
  orderEveryMs: 12000,   // a new ticket roughly every 12 s
  patienceMs: 32000,     // a ticket walks out after 32 s
  wrongIngredientPenaltyMs: 2000,
  wrongServePenaltyMs: 5000,
  expirePenaltyCoins: 5,
  hearts: 3,             // expired / wrong-serve tickets cost a heart
  comboStep: 0.25,       // +25% per combo step, capped below
  comboCap: 2.0,
  flameMax: 3,           // Api Wok: 0..3, +1 per correct ingredient
  flameDecayMs: 8000,    // flame drops one level every 8 s idle
  flameChainMs: 6000,    // flame only climbs when the next ingredient lands within 6 s
  flameBonusCoins: 2,    // +2 coins per flame level on every serve
};
