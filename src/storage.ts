/**
 * The best score (docs/SPEC.md 2.9 (3), (4), 3).
 *
 * The store is reached only through a getter that may throw, such as one
 * returning `window.localStorage`. Every access to it, the getter included,
 * happens inside the error handling, so a store that is missing, refused or
 * failing never stops the game.
 */

/** The part of the Web Storage interface the best score needs. */
export interface ScoreStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** A whole number from 0 up, written in plain digits with no leading zero. */
const PLAIN_DIGITS = /^(?:0|[1-9][0-9]*)$/;

/**
 * Reads the best score stored under `key`. A value counts only if it is
 * written in plain digits with no leading zero and is at most `max`;
 * anything else, a missing value, or any error reads as 0.
 */
export function readBest(getStore: () => ScoreStore, key: string, max: number): number {
  try {
    const raw = getStore().getItem(key);
    if (raw === null || !PLAIN_DIGITS.test(raw)) {
      return 0;
    }
    const value = Number(raw);
    return value <= max ? value : 0;
  } catch {
    return 0;
  }
}

/**
 * Writes `score` under `key` in plain digits. A score that is not a whole
 * number from 0 to `max` is not written, and the store is then not touched.
 * Any error is swallowed: the best score then lasts only as long as the page.
 */
export function writeBest(
  getStore: () => ScoreStore,
  key: string,
  score: number,
  max: number,
): void {
  if (!Number.isInteger(score) || score < 0 || score > max) {
    return;
  }
  try {
    getStore().setItem(key, BigInt(score).toString());
  } catch {
    // Storage refused or failed; the game goes on without saving.
  }
}
