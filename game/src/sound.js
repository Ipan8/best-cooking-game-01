// Tiny synthesized sound effects (WebAudio, no audio files).
export function makeSound() {
  let ctx = null;
  let muted = false;
  function ac() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        return null;
      }
    }
    if (ctx && ctx.state === 'suspended') void ctx.resume();
    return ctx;
  }
  function blip(freq, dur = 0.09, type = 'sine', gain = 0.12) {
    if (muted) return;
    const c = ac();
    if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur);
  }
  return {
    get muted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    chop() {
      blip(520, 0.07, 'triangle', 0.1);
      setTimeout(() => blip(760, 0.06, 'triangle', 0.08), 55);
    },
    bad() {
      blip(180, 0.16, 'sawtooth', 0.07);
    },
    serve() {
      blip(660, 0.08, 'sine', 0.12);
      setTimeout(() => blip(880, 0.1, 'sine', 0.12), 80);
      setTimeout(() => blip(1320, 0.12, 'sine', 0.1), 160);
    },
    tick() {
      blip(980, 0.05, 'square', 0.05);
    },
    win() {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.14, 'sine', 0.12), i * 110));
    },
  };
}
