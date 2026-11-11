/**
 * The level records (docs/SPEC.md 2.18, 3), as pure functions.
 *
 * For each level the page keeps two records: the fewest turns, with the time that play took, and the
 * fastest time, with the turns it took. They are kept in local storage for this browser only, as
 * text: one entry for each level that has records, in ascending order of level, joined by `,`, each
 * written `LEVEL:A:B:C:D` (the level, the turns A and the time B in ms of the fewest-turns record,
 * the time C in ms and the turns D of the fastest-time record), for example
 * `4:12:25300:18150:14,5:15:18040:15180:16`. The store is reached only through a getter that may
 * throw, as in `storage.ts`, and every access to it, the getter included, happens inside the error
 * handling. The bounds are passed in as `RecordRules`; `main.ts` takes them from `config.ts`
 * (docs/SPEC.md 3), and the texts of the line and of the table's cells are made here so that the page
 * shows no text of its own.
 */
import type { ScoreStore } from "./storage";

/** The bounds of a record (docs/SPEC.md 2.18 (5), 3). */
export interface RecordRules {
  /** The highest level that has records (the lowest is 1). */
  readonly maxLevel: number;
  /** The most turns a record holds (the fewest is 0). */
  readonly maxTurns: number;
  /** The longest time a record holds, in ms (the shortest is 1). */
  readonly maxTimeMs: number;
}

/** The turns and the time of one play of a level. */
export interface Mark {
  readonly turns: number;
  readonly timeMs: number;
}

/** The two records of a level: the fewest turns, with their time, and the fastest time, with its turns. */
export interface LevelRecord {
  readonly level: number;
  readonly fewest: Mark;
  readonly fastest: Mark;
}

/** A cleared level: its number and its turns and time as they are after the tick (docs/SPEC.md 2.18 (4)). */
export interface Clear extends Mark {
  readonly level: number;
}

/** Which of the two records a cleared level set, and to what; `null` for one it did not set. */
export interface RecordsSet {
  readonly fewest: Mark | null;
  readonly fastest: Mark | null;
}

/** The records after a cleared level, and which of them it set. */
export interface Outcome {
  readonly records: LevelRecord[];
  readonly set: RecordsSet;
}

const NUMBER = "(0|[1-9][0-9]*)";
const ENTRY_TEXT = new RegExp(`^${NUMBER}:${NUMBER}:${NUMBER}:${NUMBER}:${NUMBER}$`);

const inRange = (value: number, low: number, high: number): boolean =>
  Number.isInteger(value) && value >= low && value <= high;

/** True for a mark whose turns and time are within their bounds. */
const markFits = (mark: Mark, rules: RecordRules): boolean =>
  inRange(mark.turns, 0, rules.maxTurns) && inRange(mark.timeMs, 1, rules.maxTimeMs);

/** True for a level's records that may be stored. */
function isStorable(record: LevelRecord, rules: RecordRules): boolean {
  return (
    inRange(record.level, 1, rules.maxLevel) &&
    markFits(record.fewest, rules) &&
    markFits(record.fastest, rules)
  );
}

/** True for a list that may be stored: every entry storable, the levels rising along the list. */
function isStorableList(list: readonly LevelRecord[], rules: RecordRules): boolean {
  return list.every((record, index) => {
    const before = list[index - 1];
    return isStorable(record, rules) && (before === undefined || before.level < record.level);
  });
}

/**
 * Reads the stored text (docs/SPEC.md 2.18 (5)). A missing value, or a value that is not exactly of
 * the form (an entry that is not of it, a level twice or not rising along the list, a number outside
 * its bound), reads as no records, the whole value and not an entry at a time.
 */
export function parseRecords(text: string | null, rules: RecordRules): LevelRecord[] {
  if (text === null) return [];
  const list: LevelRecord[] = [];
  for (const part of text.split(",")) {
    const found = ENTRY_TEXT.exec(part);
    if (found === null) return [];
    const [level, fewestTurns, fewestTime, fastestTime, fastestTurns] = found.slice(1).map(Number);
    list.push({
      level: level ?? 0,
      fewest: { turns: fewestTurns ?? 0, timeMs: fewestTime ?? 0 },
      fastest: { turns: fastestTurns ?? 0, timeMs: fastestTime ?? 0 },
    });
  }
  return isStorableList(list, rules) ? list : [];
}

/** The text of the records, entries in the order given, joined by commas (docs/SPEC.md 2.18 (5)). */
export function formatRecords(list: readonly LevelRecord[]): string {
  return list
    .map(
      ({ level, fewest, fastest }) =>
        `${level}:${fewest.turns}:${fewest.timeMs}:${fastest.timeMs}:${fastest.turns}`,
    )
    .join(",");
}

/** Reads the records stored under `key`; any error, or no value, reads as no records. */
export function readRecords(
  getStore: () => ScoreStore,
  key: string,
  rules: RecordRules,
): LevelRecord[] {
  try {
    return parseRecords(getStore().getItem(key), rules);
  } catch {
    return [];
  }
}

/**
 * Writes the records under `key`. A list that is not valid is not written and the store is not
 * touched. Returns true when the store took it and false when it did not (any error is swallowed).
 */
export function writeRecords(
  getStore: () => ScoreStore,
  key: string,
  list: readonly LevelRecord[],
  rules: RecordRules,
): boolean {
  if (!isStorableList(list, rules)) return false;
  try {
    getStore().setItem(key, formatRecords(list));
    return true;
  } catch {
    return false;
  }
}

/** The records of `level`, or `undefined` when it has none. */
export function recordFor(list: readonly LevelRecord[], level: number): LevelRecord | undefined {
  return list.find((record) => record.level === level);
}

/**
 * The records after a cleared level (docs/SPEC.md 2.18 (4)). The fewest-turns record becomes (T, S)
 * when the level has none, or when T is fewer than its turns, or T is equal to its turns and S is
 * shorter than its time. The fastest-time record becomes (S, T) when the level has none, or when S
 * is shorter than its time, or S is equal to its time and T is fewer than its turns. A level whose
 * turns or time, or whose number, is outside the bounds of (5) sets no record, and the records
 * stay. The list given is not changed.
 */
export function recordsAfterClear(
  records: readonly LevelRecord[],
  clear: Clear,
  rules: RecordRules,
): Outcome {
  const none: RecordsSet = { fewest: null, fastest: null };
  const had = recordFor(records, clear.level);
  const here: Mark = { turns: clear.turns, timeMs: clear.timeMs };
  if (!inRange(clear.level, 1, rules.maxLevel) || !markFits(here, rules)) {
    return { records: [...records], set: none };
  }
  const setsFewest =
    had === undefined ||
    here.turns < had.fewest.turns ||
    (here.turns === had.fewest.turns && here.timeMs < had.fewest.timeMs);
  const setsFastest =
    had === undefined ||
    here.timeMs < had.fastest.timeMs ||
    (here.timeMs === had.fastest.timeMs && here.turns < had.fastest.turns);
  if (!setsFewest && !setsFastest) return { records: [...records], set: none };
  const next: LevelRecord = {
    level: clear.level,
    fewest: setsFewest || had === undefined ? here : had.fewest,
    fastest: setsFastest || had === undefined ? here : had.fastest,
  };
  const others = records.filter((record) => record.level !== clear.level);
  const place = others.findIndex((record) => record.level > clear.level);
  const list = [...others];
  list.splice(place < 0 ? list.length : place, 0, next);
  return {
    records: list,
    set: { fewest: setsFewest ? here : null, fastest: setsFastest ? here : null },
  };
}

/** The records in the browser's store, with the memory of docs/SPEC.md 2.18 (5). */
export interface RecordBook {
  /** The stored records; the records in memory once a write has failed, with no further read. */
  read(): LevelRecord[];
  /** Writes the records; true if the store took them, false if it refused (they are then kept in memory). */
  write(list: readonly LevelRecord[]): boolean;
}

/**
 * The records in the browser's store. Every read goes to the store, so records another tab stored
 * are seen. After a failed write the book keeps the records in memory and uses them for the rest of
 * the page's life, with no further read; a later write is tried at the store again, also after one
 * that failed (docs/SPEC.md 2.18 (5)).
 */
export function createRecordBook(
  getStore: () => ScoreStore,
  key: string,
  rules: RecordRules,
): RecordBook {
  let memory: LevelRecord[] | null = null;
  return {
    read: () => (memory === null ? readRecords(getStore, key, rules) : [...memory]),
    write: (list) => {
      const taken = writeRecords(getStore, key, list, rules);
      if (memory !== null || !taken) memory = [...list];
      return taken;
    },
  };
}

const seconds = (timeMs: number): number => Math.floor(timeMs / 1000);
const turnsText = (turns: number): string => `${turns} ${turns === 1 ? "turn" : "turns"}`;

/** The fewest text (docs/SPEC.md 2.18 (6)): `12 turns (25s)`, `1 turn (9s)`, `0 turns (7s)`. */
export function fewestText(mark: Mark): string {
  return `${turnsText(mark.turns)} (${seconds(mark.timeMs)}s)`;
}

/** The fastest text (docs/SPEC.md 2.18 (6)): `18s (14 turns)`. */
export function fastestText(mark: Mark): string {
  return `${seconds(mark.timeMs)}s (${turnsText(mark.turns)})`;
}

/** The dash that stands for a record a level does not have: an en dash, U+2013. */
const NO_RECORD = "–";

/**
 * The line for a level in two parts, to be shown with a space between them (docs/SPEC.md 2.18 (6)):
 * the fewest text with the middle dot U+00B7 after it, and the fastest text; an en dash stands for
 * each record the level lacks. The page may wrap the line between the parts.
 */
export function recordsLineParts(record: LevelRecord | undefined): [string, string] {
  const fewest = record === undefined ? NO_RECORD : fewestText(record.fewest);
  const fastest = record === undefined ? NO_RECORD : fastestText(record.fastest);
  return [`Fewest turns: ${fewest} \u00b7`, `Fastest: ${fastest}`];
}

/** The whole line, the two texts joined by a space, the middle dot and a space (docs/SPEC.md 2.18 (6)). */
export function recordsLine(record: LevelRecord | undefined): string {
  return recordsLineParts(record).join(" ");
}
