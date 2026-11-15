/**
 * The version history (docs/SPEC.md 2.19, 3): the list of versions as data, SemVer 2.0.0 precedence
 * written for this project (no third-party code), the decision of what opens by itself from the stored
 * version, the build's version and the list, the stored version, and the headings.
 *
 * The store is reached only through a getter that may throw, as in `storage.ts`, and every access to
 * it, the getter included, happens inside the error handling (docs/SPEC.md 2.9 (4), 2.19 (3)).
 */
import type { ScoreStore } from "./storage";

/** One version of the app: its version, the date it was made and what it brings, in plain words. */
export interface HistoryEntry {
  /** A SemVer 2.0.0 version: the text of `package.json`'s `version` for that version. */
  readonly version: string;
  /** A real calendar date written `YYYY-MM-DD`. */
  readonly date: string;
  /** One or more lines of plain words, shown as text and never as HTML. */
  readonly lines: readonly string[];
}

/**
 * The version history, newest first (docs/SPEC.md 2.19 (2)). The version of `package.json` has an
 * entry and it is the first, so a version cannot be set without writing what it brings; a Jest test
 * checks it. The text is read from nothing at run time: it is bundled into the page when it is built.
 *
 * Draft for review: the player-facing wording of the 0.1.0 entry.
 */
export const HISTORY: readonly HistoryEntry[] = [
  {
    version: "0.1.0",
    date: "2026-11-09",
    lines: [
      "Steer the snake with the arrow keys, W A S D or a swipe on the board. Space or P pauses.",
      "Eat 5 dots to clear a level. Each level is laid out anew with a random start and one more obstacle than the one before, and the early levels get faster.",
      "Every 5th level is a special level: a shield that takes 3 crashes, at most 20 turns and 30 seconds, and obstacles that jump around. You score for the turns and seconds you have left.",
      "Your best score is kept in this browser, and so is a top 10 list of high scores, where a score that makes the list asks for a name of 3 letters (the Scores link).",
      "Every level shows its turns and its time while you play, and keeps your records for it, the fewest turns and the fastest time (the Records link).",
      "The Log link shows everything that happened in your game, line by line, and you can copy it.",
      "The Version history link shows what is new in each version of the game.",
    ],
  },
];

/** The title of the panel when it shows every entry (docs/SPEC.md 2.19 (4)). */
export const TITLE_FULL = "Version history";
/** The title of the panel when it opened by itself after an upgrade, with the apostrophe U+0027. */
export const TITLE_NEW = "What's new";

/**
 * The regular expression that semver.org gives for a SemVer 2.0.0 version. It is anchored at both
 * ends, so a leading `v`, a space or a line feed makes a text invalid.
 */
const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

/** True if `text` is a SemVer 2.0.0 version (docs/SPEC.md 2.19 (2)); build metadata is valid. */
export function isSemver(text: string): boolean {
  return SEMVER.test(text);
}

type Order = -1 | 0 | 1;

/** Compares two digit strings without leading zeros as numbers, of any length. */
function compareDigits(a: string, b: string): Order {
  if (a.length !== b.length) return a.length < b.length ? -1 : 1;
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

const ONLY_DIGITS = /^\d+$/;

/** Compares two prerelease identifiers (SemVer 2.0.0 section 11, items 4.3 and 4.4). */
function compareIdentifier(a: string, b: string): Order {
  const aNumeric = ONLY_DIGITS.test(a);
  const bNumeric = ONLY_DIGITS.test(b);
  if (aNumeric && bNumeric) return compareDigits(a, b);
  if (aNumeric) return -1;
  if (bNumeric) return 1;
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/** The parts of a valid version that count for precedence: build metadata is left out. */
function parts(version: string): { core: [string, string, string]; pre: string[] } {
  const found = SEMVER.exec(version);
  if (found === null)
    throw new RangeError(`not a SemVer 2.0.0 version: ${JSON.stringify(version)}`);
  const [, major = "0", minor = "0", patch = "0", pre] = found;
  return { core: [major, minor, patch], pre: pre === undefined ? [] : pre.split(".") };
}

/**
 * The precedence of two SemVer 2.0.0 versions (section 11 of the specification): -1 if `a` is lower
 * than `b`, 1 if higher, 0 if the same. Major, minor and patch are compared as numbers, a version
 * with a prerelease is lower than the same version without one, prerelease identifiers are compared
 * one by one (numeric ones as numbers, a numeric one lower than an alphanumeric one, alphanumeric ones
 * as ASCII text, a longer set higher when all before it are equal) and build metadata is ignored.
 * Numeric identifiers are compared as digit strings, so any length works. Throws a `RangeError` for a
 * text that is not a SemVer 2.0.0 version.
 */
export function comparePrecedence(a: string, b: string): Order {
  const left = parts(a);
  const right = parts(b);
  for (let index = 0; index < 3; index++) {
    const order = compareDigits(left.core[index] ?? "0", right.core[index] ?? "0");
    if (order !== 0) return order;
  }
  if (left.pre.length === 0 || right.pre.length === 0) {
    if (left.pre.length === right.pre.length) return 0;
    return left.pre.length === 0 ? 1 : -1;
  }
  const shared = Math.min(left.pre.length, right.pre.length);
  for (let index = 0; index < shared; index++) {
    const order = compareIdentifier(left.pre[index] ?? "", right.pre[index] ?? "");
    if (order !== 0) return order;
  }
  if (left.pre.length === right.pre.length) return 0;
  return left.pre.length < right.pre.length ? -1 : 1;
}

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True if `text` is written `YYYY-MM-DD` and is a real calendar date (`2026-02-30` is not). */
export function isRealDate(text: string): boolean {
  const found = DATE.exec(text);
  if (found === null) return false;
  const [year, month, day] = [Number(found[1]), Number(found[2]), Number(found[3])];
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/** True for an entry of the shape of docs/SPEC.md 2.19 (2): a valid version and date, and non-empty lines. */
export function isValidEntry(entry: unknown): entry is HistoryEntry {
  if (typeof entry !== "object" || entry === null) return false;
  const { version, date, lines } = entry as Record<string, unknown>;
  return (
    typeof version === "string" &&
    isSemver(version) &&
    typeof date === "string" &&
    isRealDate(date) &&
    Array.isArray(lines) &&
    lines.length >= 1 &&
    lines.every((line) => typeof line === "string" && line.trim() !== "")
  );
}

/**
 * True for a list of the shape of docs/SPEC.md 2.19 (2): not empty, every entry valid, and in
 * descending order of precedence with no two of the same precedence (`1.0.0+a` and `1.0.0+b` are the
 * same).
 */
export function isValidList(list: unknown): list is readonly HistoryEntry[] {
  if (!Array.isArray(list) || list.length === 0 || !list.every(isValidEntry)) return false;
  return list.every(
    (entry: HistoryEntry, index: number) =>
      index === 0 ||
      comparePrecedence((list[index - 1] as HistoryEntry).version, entry.version) === 1,
  );
}

/** The heading of an entry (docs/SPEC.md 2.19 (4)): `Version 0.2.0 · 2026-11-11`, with U+00B7. */
export function historyHeading(entry: HistoryEntry): string {
  return `Version ${entry.version} · ${entry.date}`;
}

/**
 * What opens by itself when the page loads (docs/SPEC.md 2.19 (3)), with `stored` the stored text and
 * `build` the build's version. Nothing opens (an empty list) when `stored` is missing or is not a
 * SemVer 2.0.0 version, or has the precedence of `build` or a higher one. When it is lower, the
 * entries of `list` with a version higher than `stored` and not higher than `build` open, in the
 * order of `list` (newest first); if there is none, nothing opens.
 */
export function entriesOnLoad(
  stored: string | null,
  build: string,
  list: readonly HistoryEntry[],
): HistoryEntry[] {
  if (stored === null || !isSemver(stored) || !isSemver(build)) return [];
  if (comparePrecedence(stored, build) >= 0) return [];
  return list.filter(
    (entry) =>
      isSemver(entry.version) &&
      comparePrecedence(entry.version, stored) > 0 &&
      comparePrecedence(entry.version, build) <= 0,
  );
}

/** Reads the stored text under `key` as it is; any error, or no value, reads as `null`. */
export function readSeen(getStore: () => ScoreStore, key: string): string | null {
  try {
    return getStore().getItem(key);
  } catch {
    return null;
  }
}

/** Writes `version` under `key` as it is. True if the store took it; any error is swallowed. */
export function writeSeen(getStore: () => ScoreStore, key: string, version: string): boolean {
  try {
    getStore().setItem(key, version);
    return true;
  } catch {
    return false;
  }
}

/**
 * The page load (docs/SPEC.md 2.19 (3)): reads the stored version, decides what opens by itself
 * and writes `build` (the write is always tried, whatever the decision, and its failure is ignored).
 * Returns the entries that open, newest first, or none.
 */
export function openOnLoad(
  getStore: () => ScoreStore,
  key: string,
  build: string,
  list: readonly HistoryEntry[],
): HistoryEntry[] {
  const opening = entriesOnLoad(readSeen(getStore, key), build, list);
  writeSeen(getStore, key, build);
  return opening;
}
