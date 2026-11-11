/**
 * The playtest options of the query string (docs/SPEC.md 2.14, 3): the start level of `?level=N`,
 * whether `?slow` is on, and whether the page is a playtest page. Pure functions: the highest start
 * level and the slow factors are passed in (docs/SPEC.md 3), and nothing here reads the page's
 * address; `main.ts` does that once, when the page loads.
 */

/** What the query string asks for (docs/SPEC.md 2.14). */
export interface PlaytestOptions {
  /** The valid start level of `level`, or `null` when it is missing or not valid. */
  readonly startLevel: number | null;
  /** True when `slow` is in the query string, with any value or none. */
  readonly slow: boolean;
  /** True for a page with a valid `level` or with `slow` (docs/SPEC.md 2.14 (4)). */
  readonly playtest: boolean;
}

/** A whole number written with the characters 0 to 9 only and no leading zero (docs/SPEC.md 2.14 (2)). */
const START_LEVEL = /^[1-9][0-9]*$/;

/**
 * Reads `search`, the query string as `location.search` gives it, as `URLSearchParams` reads it
 * (docs/SPEC.md 2.14 (1)): a name given twice takes its first value, and names other than `level`
 * and `slow` are ignored. A `level` counts only when its value is written with the characters 0 to 9
 * only, with no leading zero, and is from 1 to `maxLevel`; anything else is ignored, as if it were
 * not there. `slow` counts with any value or none. Throws a RangeError if `maxLevel` is not a whole
 * number of at least 1.
 */
export function readQuery(search: string, maxLevel: number): PlaytestOptions {
  if (!Number.isInteger(maxLevel) || maxLevel < 1) {
    throw new RangeError(`highest start level ${maxLevel}; expected a whole number of at least 1`);
  }
  const params = new URLSearchParams(search);
  const written = params.get("level");
  const level = written !== null && START_LEVEL.test(written) ? Number(written) : null;
  const startLevel = level !== null && level <= maxLevel ? level : null;
  const slow = params.has("slow");
  return { startLevel, slow, playtest: startLevel !== null || slow };
}

/**
 * The factor a level or a game starts at (docs/SPEC.md 2.14 (5)): the first of `factors`. Throws a
 * RangeError for no factors.
 */
export function firstSlowFactor(factors: readonly number[]): number {
  const first = factors[0];
  if (first === undefined) throw new RangeError("no slow factors");
  return first;
}

/**
 * The factor after one press of the Slow button (docs/SPEC.md 2.14 (5)): the next of `factors`, and
 * the first after the last. A factor that is not in the list steps to the first. Throws a RangeError
 * for no factors.
 */
export function stepSlowFactor(factor: number, factors: readonly number[]): number {
  const first = firstSlowFactor(factors);
  const index = factors.indexOf(factor);
  return index < 0 ? first : (factors[index + 1] ?? first);
}
