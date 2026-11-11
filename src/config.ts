/**
 * The named values of docs/SPEC.md 3. No other module writes these numbers: `game.ts`, `input.ts`
 * and `storage.ts` take what they need as parameters, and `main.ts` passes them from here
 * (product-office Process P-11 § 5 (2)).
 */
export const config = Object.freeze({
  /** Width and height of the square board, in cells (docs/SPEC.md 2.1). */
  gridSize: 20,
  /** Length of the snake in a new game, in segments (docs/SPEC.md 2.1). */
  startLength: 3,
  /** Shortest swipe that turns the snake, in CSS pixels along one axis (docs/SPEC.md 2.7). */
  minSwipe: 30,
  /** The local-storage key of the best score (docs/SPEC.md 2.9). */
  storageKey: "snake-demo.best",
  /** Dots eaten on a level that clear it (docs/SPEC.md 2.10 (1)). */
  dotsPerLevel: 5,
  /** Delay between ticks on level 1, in milliseconds (docs/SPEC.md 2.10 (2)). */
  firstDelay: 125,
  /** How much shorter the delay is on each next level, in milliseconds (docs/SPEC.md 2.10 (2)). */
  delayStep: 5,
  /** The delay never gets shorter than this, in milliseconds (docs/SPEC.md 2.10 (2)). */
  shortestDelay: 50,
  /** Cells straight ahead of a start that lie on the board, free of obstacles (docs/SPEC.md 2.11). */
  clearAhead: 8,
  /** Every level whose number this divides is special (docs/SPEC.md 2.12 (1)). */
  specialEvery: 5,
  /** Shield layers at the start of a special level (docs/SPEC.md 2.12 (3)). */
  shieldLayers: 3,
  /** Turns allowed on a special level (docs/SPEC.md 2.12 (6)). */
  maxTurns: 20,
  /** Seconds to clear a special level in (docs/SPEC.md 2.12 (7)). */
  specialSeconds: 30,
  /** The obstacles of a special level jump each time this many seconds pass (docs/SPEC.md 2.12 (9)). */
  jumpSeconds: 3,
  /** Cells straight ahead of the head that a jumping obstacle never lands on (docs/SPEC.md 2.12 (9)). */
  clearAheadOfHead: 2,
  /** The "Special Level" text is shown, then hidden, this long each, in ms (docs/SPEC.md 2.12 (11)). */
  bannerBlinkMs: 250,
  /** The "Special Level" text goes this long after a special level is laid out, in ms (docs/SPEC.md 2.12 (11)). */
  bannerMs: 3000,
  /** The Copy button shows "✓ Copied!" this long after a copy, in ms (docs/SPEC.md 2.13 (6)). */
  copiedMs: 2000,
  /** The highest start level `?level=N` accepts (docs/SPEC.md 2.14 (2)). */
  maxStartLevel: 99,
  /** The factors the Slow button steps through, in order, then round to the first (docs/SPEC.md 2.14 (5)). */
  slowFactors: Object.freeze([1, 2, 4]),
  /** Width and height of the Slow button, in CSS pixels (docs/SPEC.md 2.14 (5)). */
  slowButtonSize: 24,
  /** Entries the high score list holds (docs/SPEC.md 2.15 (1)). */
  scoreEntries: 10,
  /** Letters in a name of the high score list, each from A to Z (docs/SPEC.md 2.15 (1)). */
  nameLetters: 3,
  /** The local-storage key of the high score list (docs/SPEC.md 2.15 (1)). */
  scoresStorageKey: "snake-demo.scores",
  /** The local-storage key of the level records (docs/SPEC.md 2.18 (5)). */
  recordsStorageKey: "snake-demo.records",
  /** The most turns a level record can hold (docs/SPEC.md 2.18 (5)). */
  maxRecordTurns: 99999,
  /** The longest time a level record can hold, in milliseconds (docs/SPEC.md 2.18 (5)). */
  maxRecordTimeMs: 99999999,
  /** The whole-number scales of the pixel letters, CSS pixels per font pixel (docs/SPEC.md 2.16 (1)). */
  pixelScales: Object.freeze([1, 2, 3]),
  /** Height of the band that rolls down the panel, in CSS pixels (docs/SPEC.md 2.16 (4)). */
  bandHeight: 40,
  /** The band rolls down the panel once in this many ms (docs/SPEC.md 2.16 (4)). */
  rollMs: 8000,
  /** How far the picture shifts sideways, in CSS pixels (docs/SPEC.md 2.16 (4)). */
  shiftPixels: 2,
  /** How long each sideways shift lasts, in ms (docs/SPEC.md 2.16 (4)). */
  shiftMs: 120,
  /** The cycle of the sideways shifts, in ms (docs/SPEC.md 2.16 (4)). */
  shiftCycleMs: 7000,
  /** When in the cycle the picture shifts sideways, in ms (docs/SPEC.md 2.16 (4)). */
  shiftAtMs: Object.freeze([900, 3300, 5600]),
  /** The period of the blinking cursor, in ms: shown half of it, hidden half (docs/SPEC.md 2.16 (4)). */
  cursorMs: 500,
  /** Height of a scanline, in CSS pixels (docs/SPEC.md 2.16 (3)). */
  scanlineHeight: 1,
  /** A scanline every this many CSS pixels (docs/SPEC.md 2.16 (3)). */
  scanlinePitch: 3,
  /** Opacity of the scanlines, in percent (docs/SPEC.md 2.16 (3)). */
  scanlineOpacityPercent: 25,
  /** Blur of the glow of a drawn text, in CSS pixels (docs/SPEC.md 2.16 (3)). */
  glowBlur: 4,
  /** The band is the background mixed with this many percent white (docs/SPEC.md 2.16 (2), (4)). */
  bandWhitePercent: 6,
});
