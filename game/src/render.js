// Api Wok Rush — DOM renderer. Purely presentational: it reads the
// engine state and updates the page; all rules live in engine.js.
import { INGREDIENTS, ING_BY_ID, RECIPES, RECIPE_BY_ID, SHIFT } from './config.js';
import { currentRecipe, nextSteps, plateDone, secondsLeft } from './engine.js';

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

function fmtTime(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

let lastOverlayPhase = null;

export function buildStatic(root) {
  root.innerHTML = `
  <header class="topbar">
    <div class="brand"><span class="brand-flame">▲</span> API WOK RUSH <span class="brand-sub">— Dapur Nasi Goreng Kilat</span></div>
    <div class="hud">
      <div class="hud-item timer" id="hud-timer" title="Sisa waktu shift">⏱ 2:30</div>
      <div class="hud-item coins" id="hud-coins" title="Koin">◉ 0 / 120</div>
      <div class="hud-item combo" id="hud-combo" title="Kombo">x1.00</div>
      <div class="hud-item hearts" id="hud-hearts" title="Hati">♥♥♥</div>
      <button class="hud-btn" id="btn-mute" title="Suara (M)">♪</button>
      <button class="hud-btn" id="btn-restart" title="Ulangi (R)">↻</button>
    </div>
  </header>
  <main class="board">
    <section class="orders" aria-label="Order board">
      <h2>ORDER BOARD</h2>
      <div id="tickets" class="tickets"></div>
      <div class="orders-note">Sajikan sebelum pelanggan pergi!</div>
    </section>
    <section class="kitchen" aria-label="Dapur">
      <div class="flame-row">
        <span class="flame-label">API WOK</span>
        <span class="flame-meter" id="flame-meter"></span>
        <span class="flame-hint" id="flame-hint">Api kecil — masak cepat biar api naik!</span>
      </div>
      <div class="stove">
        <div class="burner"><span class="burner-ring"></span><span class="burner-ring r2"></span></div>
        <div class="wok"><div class="wok-food" id="wok-food"></div></div>
        <div class="plate-zone">
          <div class="plate" id="plate"><span class="plate-empty">PIRING KOSONG</span></div>
          <div class="plate-caption" id="plate-caption">Pilih bahan di bawah untuk mulai masak.</div>
          <div class="plate-steps" id="plate-steps"></div>
        </div>
      </div>
      <div class="serve-row">
        <button class="serve-btn" id="btn-serve">SAJIKAN ▸ <span class="key">Enter</span></button>
        <button class="clear-btn" id="btn-clear">Buang <span class="key">Bksp</span></button>
      </div>
      <div class="counter" id="counter"></div>
      <div class="help">Klik bahan atau tekan 1–6 sesuai urutan resep • Sajikan saat piring lengkap • Api padam = piring dingin!</div>
    </section>
    <aside class="side" aria-label="Meja saji">
      <h2>MEJA SAJI</h2>
      <div class="serve-counter" id="serve-counter"><span class="serve-empty">Belum ada hidangan tersaji.</span></div>
      <h2>LOG DAPUR</h2>
      <div class="log" id="log"></div>
      <div class="menu">
        <h2>MENU</h2>
        ${RECIPES.map((r) => `<div class="menu-row"><b>${r.name}</b><span>${r.desc}</span><i>${r.price} koin</i></div>`).join('')}
      </div>
    </aside>
  </main>
  <div class="overlay" id="overlay"></div>`;
  return {
    timer: root.querySelector('#hud-timer'),
    coins: root.querySelector('#hud-coins'),
    combo: root.querySelector('#hud-combo'),
    hearts: root.querySelector('#hud-hearts'),
    mute: root.querySelector('#btn-mute'),
    restart: root.querySelector('#btn-restart'),
    tickets: root.querySelector('#tickets'),
    flameMeter: root.querySelector('#flame-meter'),
    flameHint: root.querySelector('#flame-hint'),
    wokFood: root.querySelector('#wok-food'),
    plate: root.querySelector('#plate'),
    plateCaption: root.querySelector('#plate-caption'),
    plateSteps: root.querySelector('#plate-steps'),
    serveBtn: root.querySelector('#btn-serve'),
    clearBtn: root.querySelector('#btn-clear'),
    counter: root.querySelector('#counter'),
    serveCounter: root.querySelector('#serve-counter'),
    log: root.querySelector('#log'),
    overlay: root.querySelector('#overlay'),
  };
}

export function buildCounter(els, onPick) {
  els.counter.innerHTML = '';
  for (const g of INGREDIENTS) {
    const b = el('button', 'ing', '');
    b.dataset.ing = g.id;
    b.style.setProperty('--ing-bg', g.color);
    b.style.setProperty('--ing-ink', g.ink);
    b.innerHTML = `<span class="ing-mark">${g.mark}</span><span class="ing-name">${g.name}</span><span class="ing-key">${g.key}</span>`;
    b.addEventListener('click', () => onPick(g.id));
    els.counter.appendChild(b);
  }
}

export function render(g, els) {
  // HUD
  els.timer.textContent = `⏱ ${fmtTime(g.timeLeftMs)}`;
  els.timer.classList.toggle('urgent', g.timeLeftMs <= 30000 && g.phase === 'playing');
  els.coins.textContent = `◉ ${g.coins} / ${SHIFT.targetCoins}`;
  els.coins.classList.toggle('done', g.coins >= SHIFT.targetCoins);
  const mult = 1 + Math.min(g.combo, 8) * SHIFT.comboStep;
  els.combo.textContent = g.combo > 0 ? `Kombo ${g.combo} · x${Math.min(mult, SHIFT.comboCap).toFixed(2)}` : 'Kombo —';
  els.hearts.textContent = '♥'.repeat(g.hearts) + '♡'.repeat(Math.max(0, SHIFT.hearts - g.hearts));

  // Flame meter
  els.flameMeter.innerHTML = '';
  for (let i = 0; i < SHIFT.flameMax; i++) {
    const f = el('span', 'flame' + (i < g.flame ? ' lit' : ''), '▲');
    els.flameMeter.appendChild(f);
  }
  els.flameHint.textContent =
    g.flame === 0
      ? 'API PADAM! Tambah bahan cepat-cepat.'
      : g.flame === 3
        ? 'API BESAR! Bonus +6 koin tiap sajian.'
        : `Api level ${g.flame} — bonus +${g.flame * SHIFT.flameBonusCoins} koin tiap sajian.`;

  // Order board
  els.tickets.innerHTML = '';
  if (g.orders.length === 0) {
    els.tickets.appendChild(el('div', 'ticket-empty', 'Belum ada pesanan — siap-siap!'));
  }
  for (const o of g.orders) {
    const r = RECIPE_BY_ID[o.recipeId];
    const t = el('div', 'ticket');
    const pct = Math.max(0, Math.round((o.patienceMs / o.maxPatienceMs) * 100));
    t.innerHTML = `<div class="ticket-head"><b>#${o.id} ${r.name}</b><i>${r.price} koin</i></div>
      <div class="ticket-steps">${r.steps.map((s) => `<span class="dot" style="background:${ING_BY_ID[s].color};color:${ING_BY_ID[s].ink}">${ING_BY_ID[s].name}</span>`).join('<span class="arrow">›</span>')}</div>
      <div class="patience"><span style="width:${pct}%"></span></div>
      <div class="ticket-time">${Math.ceil(o.patienceMs / 1000)} dtk lagi</div>`;
    els.tickets.appendChild(t);
  }

  // Wok + plate
  const dish = currentRecipe(g);
  els.wokFood.textContent = g.plate.length === 0 ? '' : g.plate.map((id) => ING_BY_ID[id].mark).join(' ');
  els.wokFood.classList.toggle('hot', g.flame > 0 && g.plate.length > 0);
  els.plate.innerHTML = '';
  if (g.plate.length === 0) {
    els.plate.appendChild(el('span', 'plate-empty', 'PIRING KOSONG'));
    els.plateCaption.textContent = 'Pilih bahan di bawah untuk mulai masak.';
  } else {
    for (const id of g.plate) {
      const ing = ING_BY_ID[id];
      const chip = el('span', 'plate-chip', `${ing.mark} ${ing.name}`);
      chip.style.background = ing.color;
      chip.style.color = ing.ink;
      els.plate.appendChild(chip);
    }
    els.plateCaption.textContent = dish
      ? `${dish.name} — ${g.plate.length}/${dish.steps.length} langkah`
      : `Meracik… (${g.plate.length} bahan) — lanjutkan urutan resep!`;
  }
  // Step dots: what the plate still needs
  els.plateSteps.innerHTML = '';
  if (dish) {
    dish.steps.forEach((s, i) => {
      const d = el('span', 'step' + (i < g.plate.length ? ' done' : i === g.plate.length ? ' next' : ''), ING_BY_ID[s].name);
      els.plateSteps.appendChild(d);
    });
  } else if (g.plate.length > 0) {
    els.plateSteps.appendChild(el('span', 'step next', '…'));
  }
  const ready = plateDone(g);
  els.serveBtn.disabled = !ready || g.phase !== 'playing';
  els.serveBtn.classList.toggle('ready', ready);
  els.clearBtn.disabled = g.plate.length === 0 || g.phase !== 'playing';

  // Ingredient counter: highlight the next needed ingredients
  const need = g.phase === 'playing' ? nextSteps(g) : [];
  for (const b of els.counter.querySelectorAll('.ing')) {
    b.classList.toggle('next', need.includes(b.dataset.ing));
    b.disabled = g.phase !== 'playing';
  }

  // Serving counter
  els.serveCounter.innerHTML = '';
  if (g.lastServe) {
    const age = g.elapsedMs - g.lastServe.atMs;
    const s = el('div', 'served', '');
    s.innerHTML = `<span class="served-dish">▣ ${g.lastServe.dishName} — SIAP SAJI</span><span class="served-coins">+${g.lastServe.coins} koin</span><span class="served-age">${Math.floor(age / 1000)} dtk lalu</span>`;
    els.serveCounter.appendChild(s);
  } else {
    els.serveCounter.appendChild(el('span', 'serve-empty', 'Belum ada hidangan tersaji.'));
  }

  // Log
  els.log.innerHTML = '';
  for (const line of g.log.slice(-6)) {
    els.log.appendChild(el('div', 'log-line', line));
  }

  // Overlays: rebuild only when the phase changes — rebuilding every
  // frame would detach the start button under the player's cursor.
  if (g.phase !== lastOverlayPhase) {
    lastOverlayPhase = g.phase;
    renderOverlay(g, els);
  }
  if (g.flash) {
    els.plate.classList.remove('flash-ok', 'flash-bad');
    void els.plate.offsetWidth;
    els.plate.classList.add(g.flash === 'ok' ? 'flash-ok' : 'flash-bad');
    g.flash = null;
  }
}

function renderOverlay(g, els) {
  const o = els.overlay;
  if (g.phase === 'title') {
    o.className = 'overlay show';
    o.innerHTML = `<div class="panel">
      <div class="panel-kicker">WARUNG NASI GORENG • SHIFT 150 DETIK</div>
      <h1>API WOK RUSH</h1>
      <p class="panel-tag">Masak secepat kilat, jaga api wok tetap menyala.</p>
      <div class="panel-rules">
        <div><b>1.</b> Baca pesanan di <b>Order Board</b>, lalu klik bahan <b>sesuai urutan resep</b> (atau tekan 1–6).</div>
        <div><b>2.</b> Tiap bahan benar menaikkan <b>Api Wok</b> — sajikan saat api besar untuk bonus koin.</div>
        <div><b>3.</b> Api padam 8 detik tanpa bahan = piring dingin, mulai dari nol. Pelanggan pergi = −1 hati.</div>
        <div><b>Target:</b> ${SHIFT.targetCoins} koin sebelum waktu habis. 3 hati, jangan sampai habis!</div>
      </div>
      <button class="start-btn" data-start>BUKA WARUNG ▸</button>
      <div class="panel-keys">1–6 bahan • Enter sajikan • Backspace buang • M suara • R ulangi</div>
    </div>`;
    return;
  }
  if (g.phase === 'won' || g.phase === 'lost') {
    const won = g.phase === 'won';
    o.className = 'overlay show';
    o.innerHTML = `<div class="panel">
      <div class="panel-kicker">${won ? 'SHIFT SELESAI — TARGET TERCAPAI!' : 'SHIFT SELESAI'}</div>
      <h1>${won ? 'WARUNG LARIS!' : 'WARUNG TUTUP…'}</h1>
      <div class="panel-stars">${'★'.repeat(Math.max(1, g.stars))}${'☆'.repeat(Math.max(0, 3 - Math.max(1, g.stars)))}</div>
      <div class="panel-score"><b>${g.coins}</b> koin • ${g.served} hidangan tersaji • kombo terbaik ${g.bestCombo}</div>
      <p class="panel-tag">${won ? `Target ${SHIFT.targetCoins} koin tercapai — pelanggan pulang kenyang!` : `Target ${SHIFT.targetCoins} koin belum tercapai (${g.coins} koin). Besok coba lagi!`}</p>
      <button class="start-btn" data-restart>MAIN LAGI ▸</button>
    </div>`;
    return;
  }
  o.className = 'overlay';
  o.innerHTML = '';
}
