# Api Wok Rush

[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/Ipan8/best-cooking-game-01/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/Ipan8/best-cooking-game-01/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![Node](https://img.shields.io/badge/node-%3E%3D22.18-green)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A complete original cooking game for the [make.fun "Make the best cooking game" bounty](https://make.fun/bounty/best-cooking-game-20261125-0137): run a nasi goreng warung for one 150-second shift, in a desktop browser, from static files, with no network request.

## The game

You are the cook at a tiny Indonesian warung. Tickets land on the **order board** — four original dishes, each with its own recipe order:

- **Nasi Goreng** (12 koin): Nasi + Telur + Sayur
- **Nasgor Pedas** (16 koin): Nasi + Telur + Ayam + Cabai
- **Mie Goreng** (14 koin): Mie + Telur + Sayur
- **Mie Ayam Pedas** (18 koin): Mie + Ayam + Cabai + Sayur

Click the ingredients on the counter (or press 1–6) **in the recipe's order** to build the dish on the plate, then hit **SAJIKAN** (Enter). Serving fast pays a speed bonus; serving the same dish again and again builds a **combo** (up to x2.00). A ticket whose patience bar runs out walks away: −5 koin, −1 heart. Three hearts gone, or the clock hitting zero below the 120-koin target, ends the shift.

### The twist: Api Wok

The wok flame (0–3) is the heart of the game. Every ingredient that lands **within 6 seconds of the previous one** stokes the flame one level; serving with a big flame pays **+2 koin per flame level**. But the flame cools one level every 8 seconds idle — and if it dies while a dish is mid-assembly, the dish goes cold and the plate is wiped. Fast, rhythmic cooking wins; dawdling loses the dish.

- **The kitchen**: stove with burner and wok, the plate mid-assembly with step dots, the ingredient counter, the flame meter
- **The order board**: up to 3 tickets with dish, recipe steps, price and a patience bar
- **The timer**: a 150-second shift clock that turns red under 30 seconds
- **The serving counter**: every finished dish lands here with its coins
- **Title, win and loss screens** with stars (1 star at 60 koin, 2 at the 120 target, 3 at 180)
- **Keyboard and mouse**: click ingredients or press 1–6, Enter serves, Backspace clears the plate, M mutes, R restarts
- **Sound**: tiny synthesized WebAudio blips (chop, serve, error, win) — no audio files

## Play it

```sh
node serve.ts   # then open http://localhost:8080
```

No build step, no dependencies, no network: `game/index.html` and its ES modules under `game/src/` are the whole game. Screenshots are taken with `node take-shots.mjs` (Playwright, headless Chromium) while `serve.ts` runs.

## Hand in

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to `/output` and writes `/output/dossier.json` with the vendored make.fun library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`screenshots/` holds four real renders of the game's own code at 1280×720: the title screen, a mid-play kitchen (dish mid-assembly, two tickets, flame lit, timer running), a served dish on the serving counter with the next dish mid-assembly, and the win screen. The `?shot=` scenes are staged by playing the real rules forward from a fixed seed (`game/src/shots.js`), so the same seed always gives the same frame — verified: two runs of `main.ts` write byte-identical output, and the engine self-test (`node test-engine.mjs`) plays full shifts in Node and confirms the win path (28/28 checks), the loss path, the Api Wok chain/cool-down/cold-plate rules, and the flame bonus.

## License

MIT — see [LICENSE](LICENSE).
