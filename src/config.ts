/**
 * The named values of docs/SPEC.md 3. No other module writes these numbers: `game.ts`, `input.ts`
 * and `storage.ts` take what they need as parameters, and `main.ts` passes them from here
 * (product-office Process P-11 § 5 (2)).
 */
export const config = Object.freeze({
  /** Width and height of the square board, in cells (docs/SPEC.md 2.1). */
  gridSize: 20,
  /** Length of the snake in a new game, in cells (docs/SPEC.md 2.1). */
  startLength: 3,
  /** Ticks a second while the game is running (docs/SPEC.md 2.2). */
  ticksPerSecond: 8,
  /** Shortest swipe that turns the snake, in CSS pixels along one axis (docs/SPEC.md 2.7). */
  minSwipe: 30,
  /** The local-storage key of the best score (docs/SPEC.md 2.9). */
  storageKey: "snake-demo.best",
});
