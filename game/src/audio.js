// Dawnwell sound: every effect is synthesised with WebAudio oscillators, so
// the game ships no audio files at all. The context is created lazily on the
// first user gesture, which is when browsers allow sound to start.

export function createAudio() {
  let context = null;
  let master = null;

  function ensureContext() {
    if (context) {
      if (context.state === 'suspended') context.resume();
      return context;
    }
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;
    context = new AudioCtor();
    master = context.createGain();
    master.gain.value = 0.16;
    master.connect(context.destination);
    return context;
  }

  function tone(freqFrom, freqTo, seconds, type, volume, delay) {
    const ctx = ensureContext();
    if (!ctx || !master) return;
    const start = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqFrom, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freqTo), start + seconds);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + seconds + 0.02);
  }

  return {
    unlock() {
      ensureContext();
    },
    catchDrop(combo) {
      const lift = Math.min(combo, 10) * 28;
      tone(620 + lift, 940 + lift, 0.11, 'sine', 0.7, 0);
      tone(1240 + lift, 1560 + lift, 0.08, 'triangle', 0.3, 0.03);
    },
    catchSun() {
      tone(523, 523, 0.1, 'triangle', 0.6, 0);
      tone(659, 659, 0.1, 'triangle', 0.6, 0.09);
      tone(784, 1046, 0.16, 'triangle', 0.7, 0.18);
    },
    hurt() {
      tone(220, 62, 0.28, 'sawtooth', 0.55, 0);
      tone(110, 48, 0.3, 'square', 0.3, 0.02);
    },
    dash() {
      tone(300, 900, 0.12, 'sine', 0.35, 0);
    },
    waveClear() {
      tone(392, 392, 0.09, 'triangle', 0.55, 0);
      tone(523, 523, 0.09, 'triangle', 0.55, 0.08);
      tone(659, 784, 0.14, 'triangle', 0.6, 0.16);
    },
    gameOver() {
      tone(392, 392, 0.16, 'triangle', 0.6, 0);
      tone(330, 330, 0.16, 'triangle', 0.6, 0.16);
      tone(262, 196, 0.34, 'triangle', 0.65, 0.32);
    },
    victory() {
      const notes = [523, 659, 784, 1046, 784, 1046];
      notes.forEach((note, i) => tone(note, note, 0.14, 'triangle', 0.6, i * 0.11));
    },
    click() {
      tone(700, 500, 0.06, 'sine', 0.4, 0);
    },
  };
}
