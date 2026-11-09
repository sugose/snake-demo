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
});
