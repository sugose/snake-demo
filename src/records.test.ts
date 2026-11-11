import { newGame, type SpecialRules, tick } from "./game";
import {
  createRecordBook,
  fastestText,
  fewestText,
  formatRecords,
  type LevelRecord,
  type Mark,
  parseRecords,
  type RecordRules,
  readRecords,
  recordFor,
  recordsAfterClear,
  recordsLine,
  writeRecords,
} from "./records";
import type { ScoreStore } from "./storage";

// The level records (docs/SPEC.md 2.18 (4) to (7), 3).
const KEY = "test.records";
const RULES: RecordRules = { maxLevel: 80, maxTurns: 99999, maxTimeMs: 99999999 };

const mark = (turns: number, timeMs: number): Mark => ({ turns, timeMs });
/** A level's records: the fewest-turns mark (turns, time) and the fastest-time mark (turns, time). */
const record = (level: number, fewest: Mark, fastest: Mark): LevelRecord => ({
  level,
  fewest,
  fastest,
});
/** Level 4 as 2.18 (5)'s example writes it: 12 turns in 25300 ms, 18150 ms in 14 turns. */
const FOUR = record(4, mark(12, 25300), mark(14, 18150));
const FIVE = record(5, mark(15, 18040), mark(16, 15180));
const EXAMPLE = "4:12:25300:18150:14,5:15:18040:15180:16";

/** A store kept in memory, recording every read and write. */
function memoryStore(initial: Record<string, string> = {}): {
  store: ScoreStore;
  values: Map<string, string>;
  reads: string[];
  writes: Array<[string, string]>;
} {
  const values = new Map(Object.entries(initial));
  const reads: string[] = [];
  const writes: Array<[string, string]> = [];
  const store: ScoreStore = {
    getItem: (key) => {
      reads.push(key);
      return values.get(key) ?? null;
    },
    setItem: (key, value) => {
      writes.push([key, value]);
      values.set(key, value);
    },
  };
  return { store, values, reads, writes };
}

function throwingGetter(): ScoreStore {
  throw new Error("storage is not allowed");
}
const throwingStore: ScoreStore = {
  getItem: () => {
    throw new Error("read failed");
  },
  setItem: () => {
    throw new Error("write failed");
  },
};

describe("recordsAfterClear: the rules of 2.18 (4)", () => {
  // Level 4 holds the fewest-turns record (10 turns, 20000 ms) and the fastest-time record
  // (15000 ms, 14 turns); each case below is one clear against them.
  const HELD = record(4, mark(10, 20000), mark(14, 15000));
  const clear = (turns: number, timeMs: number) => ({ level: 4, turns, timeMs });

  it("the first clear of a level sets both records", () => {
    const outcome = recordsAfterClear([], clear(12, 25300), RULES);
    expect(outcome.records).toEqual([record(4, mark(12, 25300), mark(12, 25300))]);
    expect(outcome.set).toEqual({ fewest: mark(12, 25300), fastest: mark(12, 25300) });
  });

  it("fewer turns with a longer time sets only the fewest", () => {
    const outcome = recordsAfterClear([HELD], clear(8, 30000), RULES);
    expect(outcome.set).toEqual({ fewest: mark(8, 30000), fastest: null });
    expect(outcome.records).toEqual([record(4, mark(8, 30000), mark(14, 15000))]);
  });

  it("equal turns and a shorter time sets the fewest", () => {
    const outcome = recordsAfterClear([HELD], clear(10, 19000), RULES);
    expect(outcome.set).toEqual({ fewest: mark(10, 19000), fastest: null });
    expect(outcome.records).toEqual([record(4, mark(10, 19000), mark(14, 15000))]);
  });

  it("equal turns and a longer time changes nothing in the fewest", () => {
    const outcome = recordsAfterClear([HELD], clear(10, 21000), RULES);
    expect(outcome.set).toEqual({ fewest: null, fastest: null });
    expect(outcome.records).toEqual([HELD]);
  });

  it("equal turns and an equal time changes nothing in the fewest", () => {
    const outcome = recordsAfterClear([HELD], clear(10, 20000), RULES);
    expect(outcome.set.fewest).toBeNull();
    expect(outcome.records).toEqual([HELD]);
  });

  it("more turns never set the fewest, however short the time", () => {
    const outcome = recordsAfterClear([HELD], clear(11, 16000), RULES);
    expect(outcome.set.fewest).toBeNull();
  });

  it("a shorter time with more turns sets only the fastest", () => {
    const outcome = recordsAfterClear([HELD], clear(20, 14000), RULES);
    expect(outcome.set).toEqual({ fewest: null, fastest: mark(20, 14000) });
    expect(outcome.records).toEqual([record(4, mark(10, 20000), mark(20, 14000))]);
  });

  it("an equal time and fewer turns sets the fastest", () => {
    const outcome = recordsAfterClear([HELD], clear(12, 15000), RULES);
    expect(outcome.set).toEqual({ fewest: null, fastest: mark(12, 15000) });
    expect(outcome.records).toEqual([record(4, mark(10, 20000), mark(12, 15000))]);
  });

  it("an equal time and more turns changes nothing in the fastest", () => {
    const outcome = recordsAfterClear([HELD], clear(16, 15000), RULES);
    expect(outcome.set.fastest).toBeNull();
    expect(outcome.records).toEqual([HELD]);
  });

  it("an equal time and equal turns changes nothing in the fastest", () => {
    const outcome = recordsAfterClear([HELD], clear(14, 15000), RULES);
    expect(outcome.set.fastest).toBeNull();
    expect(outcome.records).toEqual([HELD]);
  });

  it("a longer time never sets the fastest, however few the turns", () => {
    const outcome = recordsAfterClear([HELD], clear(11, 15001), RULES);
    expect(outcome.set.fastest).toBeNull();
  });

  it("fewer turns and a shorter time set both", () => {
    const outcome = recordsAfterClear([HELD], clear(9, 14000), RULES);
    expect(outcome.set).toEqual({ fewest: mark(9, 14000), fastest: mark(9, 14000) });
    expect(outcome.records).toEqual([record(4, mark(9, 14000), mark(9, 14000))]);
  });

  it("a clear that equals both records changes nothing and sets none", () => {
    const both = record(4, mark(12, 18000), mark(12, 18000));
    const outcome = recordsAfterClear([both], clear(12, 18000), RULES);
    expect(outcome.set).toEqual({ fewest: null, fastest: null });
    expect(outcome.records).toEqual([both]);
  });

  it("a clear that sets one record keeps the other as it was", () => {
    const outcome = recordsAfterClear([HELD], clear(8, 30000), RULES);
    expect(outcome.records[0]?.fastest).toEqual(HELD.fastest);
    const other = recordsAfterClear([HELD], clear(20, 14000), RULES);
    expect(other.records[0]?.fewest).toEqual(HELD.fewest);
  });

  it("keeps the records of the other levels, in ascending order of level", () => {
    const outcome = recordsAfterClear([FOUR, FIVE], { level: 2, turns: 3, timeMs: 4000 }, RULES);
    expect(outcome.records.map((r) => r.level)).toEqual([2, 4, 5]);
    expect(outcome.records.slice(1)).toEqual([FOUR, FIVE]);
    const middle = recordsAfterClear(
      [FOUR, FIVE],
      { level: 40, turns: 3, timeMs: 4000 },
      RULES,
    ).records;
    expect(middle.map((r) => r.level)).toEqual([4, 5, 40]);
    const between = recordsAfterClear(
      [record(2, mark(1, 1000), mark(1, 1000)), FIVE],
      { level: 4, turns: 3, timeMs: 4000 },
      RULES,
    ).records;
    expect(between.map((r) => r.level)).toEqual([2, 4, 5]);
  });

  it("does not change the records it was given", () => {
    const given = [HELD];
    recordsAfterClear(given, clear(9, 14000), RULES);
    expect(given).toEqual([HELD]);
  });

  it("a level cleared that ends the game as won because the next level cannot be laid out sets its records", () => {
    // A 2 x 2 board, 2 dots a level: the last free cell (1,0) holds the 2nd dot.
    const special: SpecialRules = {
      every: 5,
      shieldLayers: 3,
      maxTurns: 20,
      seconds: 30,
      jumpSeconds: 3,
      clearAheadOfHead: 2,
    };
    const base = newGame({
      size: 2,
      startLength: 3,
      clearAhead: 1,
      dotsPerLevel: 2,
      delays: { first: 125, step: 5, shortest: 50 },
      special,
      choose: () => 0,
    });
    const state = {
      ...base,
      status: "running" as const,
      snake: [
        { x: 1, y: 1 },
        { x: 0, y: 1 },
        { x: 0, y: 0 },
      ],
      heading: "up" as const,
      food: { x: 1, y: 0 },
      dotsEaten: 1,
      score: 1,
    };
    const after = tick(state, () => 0);
    expect(after.status).toBe("won");
    expect(after.ended).toBe("noRoom");
    const cleared = after.cleared;
    expect(cleared).not.toBeNull();
    const outcome = recordsAfterClear(
      [],
      { level: cleared?.level ?? 0, turns: cleared?.turns ?? -1, timeMs: cleared?.timeMs ?? -1 },
      RULES,
    );
    expect(outcome.records).toEqual([record(1, mark(0, 125), mark(0, 125))]);
    expect(outcome.set.fewest).toEqual(mark(0, 125));
    expect(outcome.set.fastest).toEqual(mark(0, 125));
  });
});

describe("recordsAfterClear: the bounds of 2.18 (5)", () => {
  it("a level whose turns are above the bound sets no record, and the records stay", () => {
    const outcome = recordsAfterClear([FOUR], { level: 4, turns: 100000, timeMs: 1000 }, RULES);
    expect(outcome.set).toEqual({ fewest: null, fastest: null });
    expect(outcome.records).toEqual([FOUR]);
  });

  it("a level whose time is above the bound sets no record, and the records stay", () => {
    const outcome = recordsAfterClear([FOUR], { level: 4, turns: 1, timeMs: 100000000 }, RULES);
    expect(outcome.set).toEqual({ fewest: null, fastest: null });
    expect(outcome.records).toEqual([FOUR]);
  });

  it("a first clear above a bound leaves the level with no records", () => {
    const outcome = recordsAfterClear([], { level: 4, turns: 100000, timeMs: 1000 }, RULES);
    expect(outcome.records).toEqual([]);
    expect(outcome.set).toEqual({ fewest: null, fastest: null });
  });

  it("a clear at the bounds sets its records", () => {
    const outcome = recordsAfterClear([], { level: 80, turns: 99999, timeMs: 99999999 }, RULES);
    expect(outcome.records).toEqual([record(80, mark(99999, 99999999), mark(99999, 99999999))]);
  });

  it("a clear with a time of 0 or a level outside 1 to 80 sets no record", () => {
    expect(recordsAfterClear([], { level: 4, turns: 1, timeMs: 0 }, RULES).records).toEqual([]);
    expect(recordsAfterClear([], { level: 0, turns: 1, timeMs: 5 }, RULES).records).toEqual([]);
    expect(recordsAfterClear([], { level: 81, turns: 1, timeMs: 5 }, RULES).records).toEqual([]);
  });
});

describe("the text of the records (2.18 (5))", () => {
  it("is made as the example of the spec writes it, in ascending order of level", () => {
    expect(formatRecords([FOUR, FIVE])).toBe(EXAMPLE);
    expect(formatRecords([record(1, mark(0, 1), mark(0, 1))])).toBe("1:0:1:1:0");
  });

  it("reads back what was made", () => {
    expect(parseRecords(EXAMPLE, RULES)).toEqual([FOUR, FIVE]);
    expect(parseRecords(formatRecords([FOUR]), RULES)).toEqual([FOUR]);
  });

  it("a missing value reads as no records", () => {
    expect(parseRecords(null, RULES)).toEqual([]);
    expect(parseRecords("", RULES)).toEqual([]);
  });

  it.each([
    ["a leading zero in the level", "04:12:25300:18150:14"],
    ["a leading zero in the turns", "4:012:25300:18150:14"],
    ["a leading zero in a time", "4:12:025300:18150:14"],
    ["a leading zero in the second time", "4:12:25300:018150:14"],
    ["a leading zero in the second turns", "4:12:25300:18150:014"],
    ["a plus sign", "+4:12:25300:18150:14"],
    ["a minus sign", "4:-12:25300:18150:14"],
    ["a space before", " 4:12:25300:18150:14"],
    ["a space after", "4:12:25300:18150:14 "],
    ["a space inside", "4:12:25300: 18150:14"],
    ["a line feed after", "4:12:25300:18150:14\n"],
    ["a missing field", "4:12:25300:18150"],
    ["an extra field", "4:12:25300:18150:14:1"],
    ["an extra comma before", ",4:12:25300:18150:14"],
    ["an extra comma after", "4:12:25300:18150:14,"],
    ["an empty entry between two", "4:12:25300:18150:14,,5:15:18040:15180:16"],
    ["a comma only", ","],
    ["a level twice", "4:12:25300:18150:14,4:11:25300:18150:14"],
    ["levels not rising", "5:15:18040:15180:16,4:12:25300:18150:14"],
    ["a decimal number", "4:1.5:25300:18150:14"],
    ["a letter", "4:12:25300:1815o:14"],
    ["an exponent", "4:1e1:25300:18150:14"],
    ["a number too long to be a number", `4:${"9".repeat(400)}:25300:18150:14`],
    ["words", "none"],
  ])("%s reads as no records", (_name, text) => {
    expect(parseRecords(text, RULES)).toEqual([]);
  });

  it("reads the whole value as no records and not an entry at a time", () => {
    expect(parseRecords(`${EXAMPLE},6:x`, RULES)).toEqual([]);
    expect(parseRecords(`${EXAMPLE},5:1:1:1:1`, RULES)).toEqual([]);
    expect(parseRecords(`${EXAMPLE},6:100000:1:1:1`, RULES)).toEqual([]);
  });

  describe("each bound is accepted at the bound and rejected one past it", () => {
    const withLevel = (level: number) => `${level}:1:1:1:1`;
    it("level: 1 and 80 accepted, 0 and 81 rejected", () => {
      expect(parseRecords(withLevel(1), RULES)).toHaveLength(1);
      expect(parseRecords(withLevel(80), RULES)).toHaveLength(1);
      expect(parseRecords(withLevel(0), RULES)).toEqual([]);
      expect(parseRecords(withLevel(81), RULES)).toEqual([]);
    });

    it("turns: 0 and 99999 accepted, 100000 rejected, in both records", () => {
      for (const turns of [0, 99999]) {
        expect(parseRecords(`1:${turns}:1:1:1`, RULES)).toHaveLength(1);
        expect(parseRecords(`1:1:1:1:${turns}`, RULES)).toHaveLength(1);
      }
      expect(parseRecords("1:100000:1:1:1", RULES)).toEqual([]);
      expect(parseRecords("1:1:1:1:100000", RULES)).toEqual([]);
    });

    it("time: 1 and 99999999 accepted, 0 and 100000000 rejected, in both records", () => {
      for (const time of [1, 99999999]) {
        expect(parseRecords(`1:1:${time}:1:1`, RULES)).toHaveLength(1);
        expect(parseRecords(`1:1:1:${time}:1`, RULES)).toHaveLength(1);
      }
      for (const time of [0, 100000000]) {
        expect(parseRecords(`1:1:${time}:1:1`, RULES)).toEqual([]);
        expect(parseRecords(`1:1:1:${time}:1`, RULES)).toEqual([]);
      }
    });
  });

  it("holds all 80 levels", () => {
    const all = Array.from({ length: 80 }, (_, i) => record(i + 1, mark(1, 1000), mark(1, 1000)));
    expect(parseRecords(formatRecords(all), RULES)).toEqual(all);
  });
});

describe("reading and writing through a store", () => {
  it("reads what is stored under the key", () => {
    const { store, reads } = memoryStore({ [KEY]: EXAMPLE });
    expect(readRecords(() => store, KEY, RULES)).toEqual([FOUR, FIVE]);
    expect(reads).toEqual([KEY]);
  });

  it("a store that returns nothing reads as no records", () => {
    const { store } = memoryStore();
    expect(readRecords(() => store, KEY, RULES)).toEqual([]);
  });

  it("a store that throws on getting hold of it, or on reading, reads as no records", () => {
    expect(readRecords(throwingGetter, KEY, RULES)).toEqual([]);
    expect(readRecords(() => throwingStore, KEY, RULES)).toEqual([]);
  });

  it("an invalid stored value reads as no records", () => {
    const { store } = memoryStore({ [KEY]: "4:12:25300:18150" });
    expect(readRecords(() => store, KEY, RULES)).toEqual([]);
  });

  it("writes the text and says it was taken", () => {
    const { store, writes } = memoryStore();
    expect(writeRecords(() => store, KEY, [FOUR, FIVE], RULES)).toBe(true);
    expect(writes).toEqual([[KEY, EXAMPLE]]);
  });

  it("a store that throws on getting hold of it, or on writing, says it was not taken", () => {
    expect(writeRecords(throwingGetter, KEY, [FOUR], RULES)).toBe(false);
    expect(writeRecords(() => throwingStore, KEY, [FOUR], RULES)).toBe(false);
  });

  it("a list that is not valid is not written and the store is not touched", () => {
    const { store, writes, reads } = memoryStore();
    const above = record(4, mark(100000, 1000), mark(1, 1000));
    expect(writeRecords(() => store, KEY, [above], RULES)).toBe(false);
    expect(writeRecords(() => store, KEY, [FIVE, FOUR], RULES)).toBe(false);
    expect(writeRecords(() => store, KEY, [FOUR, FOUR], RULES)).toBe(false);
    expect(writes).toEqual([]);
    expect(reads).toEqual([]);
  });
});

describe("the record book: the stored records and the memory after a failed write (2.18 (5))", () => {
  it("reads the store each time, so records another tab stored in the meantime are kept", () => {
    const { store, values } = memoryStore({ [KEY]: "4:12:25300:18150:14" });
    const book = createRecordBook(() => store, KEY, RULES);
    expect(book.read()).toEqual([FOUR]);
    // Another tab clears level 5 after this page loaded.
    values.set(KEY, EXAMPLE);
    // A clear of level 2 on this page compares with, and writes, what is stored now.
    const outcome = recordsAfterClear(book.read(), { level: 2, turns: 3, timeMs: 4000 }, RULES);
    expect(book.write(outcome.records)).toBe(true);
    expect(values.get(KEY)).toBe(`2:3:4000:4000:3,${EXAMPLE}`);
  });

  it("after a failed write keeps the records in memory and reads no more", () => {
    const { store, reads } = memoryStore();
    const failing: ScoreStore = {
      getItem: store.getItem,
      setItem: () => {
        throw new Error("quota");
      },
    };
    const book = createRecordBook(() => failing, KEY, RULES);
    expect(book.read()).toEqual([]);
    expect(reads).toHaveLength(1);
    expect(book.write([FOUR])).toBe(false);
    expect(book.read()).toEqual([FOUR]);
    expect(book.read()).toEqual([FOUR]);
    expect(reads).toHaveLength(1);
  });

  it("a later clear writes the records again, also after a write that failed", () => {
    const values = new Map<string, string>();
    let working = false;
    const setCalls: string[] = [];
    const store: ScoreStore = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        setCalls.push(value);
        if (!working) throw new Error("quota");
        values.set(key, value);
      },
    };
    const book = createRecordBook(() => store, KEY, RULES);
    expect(book.write([FOUR])).toBe(false);
    working = true;
    const next = recordsAfterClear(book.read(), { level: 5, turns: 15, timeMs: 18040 }, RULES);
    expect(book.write(next.records)).toBe(true);
    expect(setCalls).toEqual(["4:12:25300:18150:14", "4:12:25300:18150:14,5:15:18040:18040:15"]);
    // The memory is kept for the rest of the page's life: no further read of the store.
    values.set(KEY, "9:1:1:1:1");
    expect(book.read().map((r) => r.level)).toEqual([4, 5]);
  });

  it("a store that returns nothing: the first clear is written and read back", () => {
    const { store, writes } = memoryStore();
    const book = createRecordBook(() => store, KEY, RULES);
    expect(book.read()).toEqual([]);
    expect(book.write([FOUR])).toBe(true);
    expect(writes).toEqual([[KEY, "4:12:25300:18150:14"]]);
    expect(book.read()).toEqual([FOUR]);
  });

  it("a read that fails reads as no records, so the next write holds only the entries it then has", () => {
    const writes: string[] = [];
    const store: ScoreStore = {
      getItem: () => {
        throw new Error("read failed");
      },
      setItem: (_key, value) => {
        writes.push(value);
      },
    };
    const book = createRecordBook(() => store, KEY, RULES);
    expect(book.read()).toEqual([]);
    const outcome = recordsAfterClear(book.read(), { level: 2, turns: 3, timeMs: 4000 }, RULES);
    expect(book.write(outcome.records)).toBe(true);
    expect(writes).toEqual(["2:3:4000:4000:3"]);
  });

  it("a store that cannot even be got hold of: reads are empty, a write fails and is kept in memory", () => {
    const book = createRecordBook(throwingGetter, KEY, RULES);
    expect(book.read()).toEqual([]);
    expect(book.write([FIVE])).toBe(false);
    expect(book.read()).toEqual([FIVE]);
    const outcome = recordsAfterClear(book.read(), { level: 4, turns: 12, timeMs: 25300 }, RULES);
    expect(outcome.records.map((r) => r.level)).toEqual([4, 5]);
  });

  it("an invalid stored value reads as no records and the next write replaces it", () => {
    const { store, values } = memoryStore({ [KEY]: "garbage" });
    const book = createRecordBook(() => store, KEY, RULES);
    expect(book.read()).toEqual([]);
    expect(book.write([FOUR])).toBe(true);
    expect(values.get(KEY)).toBe("4:12:25300:18150:14");
  });
});

describe("recordFor: the records of one level", () => {
  it("finds the level, or nothing", () => {
    expect(recordFor([FOUR, FIVE], 5)).toEqual(FIVE);
    expect(recordFor([FOUR, FIVE], 6)).toBeUndefined();
    expect(recordFor([], 1)).toBeUndefined();
  });
});

describe("the texts of 2.18 (6) and (7)", () => {
  it("the fewest text: the turns, the word, and the time in whole seconds rounded down", () => {
    expect(fewestText(mark(12, 25300))).toBe("12 turns (25s)");
  });

  it("1 turn is singular and 0 turns are plural", () => {
    expect(fewestText(mark(1, 9000))).toBe("1 turn (9s)");
    expect(fewestText(mark(0, 7000))).toBe("0 turns (7s)");
    expect(fastestText(mark(1, 9000))).toBe("9s (1 turn)");
    expect(fastestText(mark(0, 7000))).toBe("7s (0 turns)");
  });

  it("the fastest text: the time in whole seconds, then the turns in parentheses", () => {
    expect(fastestText(mark(14, 18150))).toBe("18s (14 turns)");
  });

  it("24999 ms is 24s, 25000 ms is 25s and 999 ms is 0s", () => {
    expect(fewestText(mark(3, 24999))).toBe("3 turns (24s)");
    expect(fastestText(mark(3, 24999))).toBe("24s (3 turns)");
    expect(fastestText(mark(3, 25000))).toBe("25s (3 turns)");
    expect(fastestText(mark(3, 999))).toBe("0s (3 turns)");
  });

  it("the line joins the two texts with a space, the middle dot and a space", () => {
    expect(recordsLine(FOUR)).toBe("Fewest turns: 12 turns (25s) · Fastest: 18s (14 turns)");
    expect(recordsLine(FOUR)).toBe("Fewest turns: 12 turns (25s) · Fastest: 18s (14 turns)");
  });

  it("a level with no records shows the en dash in place of each text", () => {
    expect(recordsLine(undefined)).toBe("Fewest turns: – · Fastest: –");
    expect(recordsLine(undefined)).toBe("Fewest turns: – · Fastest: –");
  });

  it("the longest line", () => {
    const longest = record(1, mark(99999, 99999999), mark(99999, 99999999));
    expect(recordsLine(longest)).toBe(
      "Fewest turns: 99999 turns (99999s) · Fastest: 99999s (99999 turns)",
    );
  });
});
