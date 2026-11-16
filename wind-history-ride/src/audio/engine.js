// src/audio/engine.js — STUB (silent). Replaced by the procedural soundtrack engine.
// Interface contract used by main.js:
//   createAudioEngine() -> { init(): Promise, isReady(), onReady(cb), onEnded(cb),
//     play(t): Promise, pause(), seek(t), isPlaying(), getCurrentTime(),
//     setVolume(v), getVolume(), setMuted(b), isMuted(), toggleMute() }

export function createAudioEngine() {
  let playing = false;
  let startWall = 0;
  let startT = 0;
  let vol = 0.9;
  let muted = false;
  return {
    async init() {},
    isReady: () => false,
    onReady() {},
    onEnded() {},
    async play(t) {
      playing = true;
      startT = t;
      startWall = performance.now();
    },
    pause() {
      playing = false;
    },
    seek(t) {
      startT = t;
      startWall = performance.now();
    },
    isPlaying: () => false,
    getCurrentTime: () => startT + (playing ? (performance.now() - startWall) / 1000 : 0),
    setVolume(v) {
      vol = v;
    },
    getVolume: () => vol,
    setMuted(b) {
      muted = b;
    },
    isMuted: () => muted,
    toggleMute() {
      muted = !muted;
    },
  };
}
