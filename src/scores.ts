/**
 * The high score list (docs/SPEC.md 2.15, 3), as pure functions.
 *
 * The list is kept in local storage for this browser only, as text: the entries, highest score
 * first, each written `SCORE:LEVEL:NAME` and joined by `,`, for example `43:7:ABC,40:6:XYZ`. The
 * store is reached only through a getter that may throw, as in `storage.ts`, and every access to it,
 * the getter included, happens inside the error handling, so a store that is missing, refused or
 * failing never stops the game. The bounds and the sizes are passed in as `ScoreRules`; `main.ts`
 * takes them from `config.ts` (docs/SPEC.md 3).
 */
import type { ScoreStore } from "./storage";

/** The sizes and bounds of the list (docs/SPEC.md 2.15 (1), 3). */
export interface ScoreRules {
  /** How many entries the list holds. */
  readonly entries: number;
  /** How many letters a name has. */
  readonly nameLetters: number;
  /** The highest score an entry can have (the bound of docs/SPEC.md 2.9 (3)). */
  readonly maxScore: number;
  /** The highest level an entry can have. */
  readonly maxLevel: number;
}

/** One entry. The entry made from the best score has the level 0 and the name `---` (2.15 (1)). */
export interface Entry {
  readonly score: number;
  readonly level: number;
  readonly name: string;
}

/** What a game that has ended gives: the entry it would make, apart from the name (2.15 (3)). */
export interface Game {
  readonly score: number;
  readonly level: number;
}

/** The outcome of confirming a name (docs/SPEC.md 2.15 (3), (6)). */
export type Confirmation =
  | {
      readonly kind: "stored";
      /** The place of the entry in the list as shown with it, which is the row the table marks. */
      readonly rank: number;
      /** The list to store: the first entries of those read just now and the new one. */
      readonly stored: readonly Entry[];
    }
  /** The entry is no longer among the first entries: another tab filled the list. */
  | { readonly kind: "full" };

/** The stored list and, after a failed write, the list kept in memory (docs/SPEC.md 2.15 (6)). */
export interface ScoreBook {
  /** The stored entries; the list in memory once a write has failed, with no further read. */
  read(): Entry[];
  /** Writes the list; true if the store took it, false if it refused (the list is then kept in memory). */
  write(list: readonly Entry[]): boolean;
}

/** One entry as written: SCORE:LEVEL:NAME, the numbers in digits 0 to 9 with no leading zero. */
const ENTRY_TEXT = /^([1-9][0-9]*):([1-9][0-9]*):([A-Z]+)$/;
const NAME_LETTER = /^[A-Z]$/;
const FIRST_LETTER = "A".charCodeAt(0);
const LETTERS = 26;

/** The name of the entry made from the best score, as many hyphens as a name has letters. */
const noName = (rules: ScoreRules): string => "-".repeat(rules.nameLetters);

/** True for an entry that may be stored: whole score and level in bounds, a name of capital letters. */
function isStorable(entry: Entry, rules: ScoreRules): boolean {
  return (
    Number.isInteger(entry.score) &&
    entry.score >= 1 &&
    entry.score <= rules.maxScore &&
    Number.isInteger(entry.level) &&
    entry.level >= 1 &&
    entry.level <= rules.maxLevel &&
    entry.name.length === rules.nameLetters &&
    [...entry.name].every((letter) => NAME_LETTER.test(letter))
  );
}

/** True for a list that may be stored: at most the list's size, every entry storable, scores never rising. */
function isStorableList(list: readonly Entry[], rules: ScoreRules): boolean {
  return (
    list.length <= rules.entries &&
    list.every((entry, index) => {
      const before = list[index - 1];
      return isStorable(entry, rules) && (before === undefined || before.score >= entry.score);
    })
  );
}

/**
 * Reads the stored text (docs/SPEC.md 2.15 (1)). A missing value, or a value that is not exactly
 * of the form, reads as an empty list, the whole value and not an entry at a time: an entry that is
 * not valid (which includes the level 0 and the name `---`), more than the list's size of entries,
 * or scores that rise along the list.
 */
export function parseScores(text: string | null, rules: ScoreRules): Entry[] {
  if (text === null || text === "") return [];
  const entries: Entry[] = [];
  for (const part of text.split(",")) {
    const found = ENTRY_TEXT.exec(part);
    if (found === null) return [];
    entries.push({ score: Number(found[1]), level: Number(found[2]), name: found[3] ?? "" });
  }
  return isStorableList(entries, rules) ? entries : [];
}

/** The text of a list, entries in the order given, joined by commas (docs/SPEC.md 2.15 (1)). */
export function formatScores(entries: readonly Entry[]): string {
  return entries.map((entry) => `${entry.score}:${entry.level}:${entry.name}`).join(",");
}

/** Reads the list stored under `key`; any error, or no value, reads as an empty list. */
export function readScores(getStore: () => ScoreStore, key: string, rules: ScoreRules): Entry[] {
  try {
    return parseScores(getStore().getItem(key), rules);
  } catch {
    return [];
  }
}

/**
 * Writes the list under `key`. A list that is not valid is not written and the store is not touched.
 * Returns true when the store took it and false when it did not (any error is swallowed).
 */
export function writeScores(
  getStore: () => ScoreStore,
  key: string,
  entries: readonly Entry[],
  rules: ScoreRules,
): boolean {
  if (!isStorableList(entries, rules)) return false;
  try {
    getStore().setItem(key, formatScores(entries));
    return true;
  } catch {
    return false;
  }
}

/** The entry made from the best score: shown, never stored (docs/SPEC.md 2.15 (1)). */
export function bestEntry(best: number, rules: ScoreRules): Entry {
  return { score: best, level: 0, name: noName(rules) };
}

/** The place for a score in a list ordered highest first: after every entry with a score at least as high. */
function placeFor(list: readonly Entry[], score: number): number {
  const index = list.findIndex((entry) => entry.score < score);
  return index < 0 ? list.length : index;
}

/**
 * The list as shown at a moment (docs/SPEC.md 2.15 (2)): the stored entries and, for a game that is
 * ending or being entered, the entry it would make; ahead of them the entry of the best score when
 * that is above the score of every one of them (above 0 when there are none); the first entries of
 * these. `rank` is the place of the game's entry in that list, or `null` with no game, or when the
 * entry is not among the first entries.
 */
export function listAsShown(
  stored: readonly Entry[],
  game: Game | null,
  best: number,
  rules: ScoreRules,
): { list: Entry[]; rank: number | null } {
  const all: Entry[] = [...stored];
  let place: number | null = null;
  if (game !== null) {
    place = placeFor(stored, game.score);
    all.splice(place, 0, { ...game, name: "A".repeat(rules.nameLetters) });
  }
  const topScore = all[0]?.score ?? 0;
  const ahead = best > topScore;
  if (ahead) all.unshift(bestEntry(best, rules));
  const rank = place === null ? null : place + (ahead ? 1 : 0) + 1;
  return {
    list: all.slice(0, rules.entries),
    rank: rank !== null && rank <= rules.entries ? rank : null,
  };
}

/**
 * The rank a game that has ended would have, or `null` when it does not qualify (docs/SPEC.md 2.15
 * (3)): a score of at least 1 (and one that could be stored), and an entry among the first entries
 * of the list as shown for it. The page being a playtest page is the caller's to check (2.14 (4)).
 */
export function qualifyingRank(
  stored: readonly Entry[],
  game: Game,
  best: number,
  rules: ScoreRules,
): number | null {
  const probe: Entry = { ...game, name: "A".repeat(rules.nameLetters) };
  if (!isStorable(probe, rules)) return null;
  return listAsShown(stored, game, best, rules).rank;
}

/**
 * Confirms a name (docs/SPEC.md 2.15 (3), (6)) against the entries read just now: the rank of the
 * entry and the list to store (the first entries of those read and the new one, the entry of the
 * best score not among them), or `full` when the entry is no longer among the first entries.
 */
export function confirmEntry(
  stored: readonly Entry[],
  entry: Entry,
  best: number,
  rules: ScoreRules,
): Confirmation {
  const rank = qualifyingRank(stored, entry, best, rules);
  if (rank === null) return { kind: "full" };
  const next = [...stored];
  next.splice(placeFor(stored, entry.score), 0, entry);
  return { kind: "stored", rank, stored: next.slice(0, rules.entries) };
}

/**
 * The list in the browser's store, with the memory of docs/SPEC.md 2.15 (6): after a failed write
 * the book keeps the list in memory and uses it for the rest of the page's life, with no further
 * read and no further write to the store (as the best score lasts only until the page is closed).
 * Every read before that goes to the store, so entries another tab stored are seen.
 */
export function createScoreBook(
  getStore: () => ScoreStore,
  key: string,
  rules: ScoreRules,
): ScoreBook {
  let memory: Entry[] | null = null;
  return {
    read: () => (memory === null ? readScores(getStore, key, rules) : [...memory]),
    write: (list) => {
      if (memory === null && writeScores(getStore, key, list, rules)) return true;
      memory = [...list];
      return false;
    },
  };
}

/** The name a new entry starts with: A in every slot (docs/SPEC.md 2.15 (4)). */
export function startName(rules: ScoreRules): string {
  return "A".repeat(rules.nameLetters);
}

/**
 * The name with the letter of `slot` (from 0) changed to the next one in the alphabet (`delta` 1; after
 * Z comes A) or the one before (`delta` -1; before A comes Z). A slot that does not exist changes
 * nothing.
 */
export function stepLetter(name: string, slot: number, delta: 1 | -1): string {
  const letters = [...name];
  const letter = letters[slot];
  if (letter === undefined || !NAME_LETTER.test(letter)) return name;
  const next = (letter.charCodeAt(0) - FIRST_LETTER + delta + LETTERS) % LETTERS;
  letters[slot] = String.fromCharCode(FIRST_LETTER + next);
  return letters.join("");
}

/** A rank as the table writes it: 1ST, 2ND, 3RD, 4TH and so on (docs/SPEC.md 2.15 (5)). */
export function rankText(rank: number): string {
  const ending = rank === 1 ? "ST" : rank === 2 ? "ND" : rank === 3 ? "RD" : "TH";
  return `${rank}${ending}`;
}
