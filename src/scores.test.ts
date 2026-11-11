import {
  bestEntry,
  confirmEntry,
  createScoreBook,
  type Entry,
  formatScores,
  listAsShown,
  parseScores,
  qualifyingRank,
  rankText,
  readScores,
  type ScoreRules,
  startName,
  stepLetter,
  writeScores,
} from "./scores";
import type { ScoreStore } from "./storage";

// The high score list (docs/SPEC.md 2.15, 3).
const KEY = "test.scores";
const RULES: ScoreRules = { entries: 10, nameLetters: 3, maxScore: 4000, maxLevel: 81 };

const entry = (score: number, level: number, name: string): Entry => ({ score, level, name });
/** Ten entries with the scores 100, 90, ..., 10, as the third example of 2.15 (3) has them. */
const TEN: Entry[] = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10].map((score) =>
  entry(score, 5, "AAA"),
);
const BEST_ROW = (score: number): Entry => entry(score, 0, "---");

/** A store kept in memory, recording every read and write. */
function memoryStore(initial: Record<string, string> = {}): {
  store: ScoreStore;
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
  return { store, reads, writes };
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
/** A store whose reads work but whose writes fail. */
function readOnlyStore(initial: string | null): ScoreStore & { reads: number } {
  const store = {
    reads: 0,
    getItem: () => {
      store.reads++;
      return initial;
    },
    setItem: () => {
      throw new Error("write failed");
    },
  };
  return store;
}

describe("parseScores (docs/SPEC.md 2.15 (1))", () => {
  it("reads the entries in the order stored, each SCORE:LEVEL:NAME", () => {
    expect(parseScores("43:7:ABC,40:6:XYZ", RULES)).toEqual([
      entry(43, 7, "ABC"),
      entry(40, 6, "XYZ"),
    ]);
  });

  it("reads a single entry", () => {
    expect(parseScores("1:1:AAA", RULES)).toEqual([entry(1, 1, "AAA")]);
  });

  it("allows entries with the same score, older first", () => {
    expect(parseScores("40:6:AAA,40:3:BBB", RULES)).toEqual([
      entry(40, 6, "AAA"),
      entry(40, 3, "BBB"),
    ]);
  });

  it("allows exactly 10 entries and the bounds of score and level", () => {
    const ten = TEN.map((e) => `${e.score}:${e.level}:${e.name}`).join(",");
    expect(parseScores(ten, RULES)).toEqual(TEN);
    expect(parseScores("4000:81:ZZZ", RULES)).toEqual([entry(4000, 81, "ZZZ")]);
  });

  it("reads a missing value as an empty list", () => {
    expect(parseScores(null, RULES)).toEqual([]);
  });

  // Every malformed form of 2.15 (1): the whole value reads as an empty list.
  const MALFORMED: ReadonlyArray<readonly [string, string]> = [
    ["the empty text", ""],
    ["a space before", " 43:7:ABC"],
    ["a space after", "43:7:ABC "],
    ["a newline after", "43:7:ABC\n"],
    ["a trailing comma", "43:7:ABC,"],
    ["a leading comma", ",43:7:ABC"],
    ["an empty entry between commas", "43:7:ABC,,40:6:XYZ"],
    ["a lower-case name", "43:7:abc"],
    ["a name of 2 letters", "43:7:AB"],
    ["a name of 4 letters", "43:7:ABCD"],
    ["a digit in the name", "43:7:A1C"],
    ["a letter outside A to Z in the name", "43:7:ÅBC"],
    ["the name ---, which is the entry of the best score", "43:7:---"],
    ["a leading zero in the score", "043:7:ABC"],
    ["a leading zero in the level", "43:07:ABC"],
    ["the score 0", "0:7:ABC"],
    ["the level 0, which is the entry of the best score", "43:0:ABC"],
    ["a score above the bound", "4001:7:ABC"],
    ["a level above the bound", "43:82:ABC"],
    ["a sign", "+43:7:ABC"],
    ["a negative score", "-1:7:ABC"],
    ["a decimal point", "4.3:7:ABC"],
    ["an exponent", "1e3:7:ABC"],
    ["full-width digits", "４３:7:ABC"],
    ["a missing level", "43:ABC"],
    ["a fourth field", "43:7:ABC:1"],
    ["other separators", "43;7;ABC"],
    ["plain text", "hello"],
    ["scores that rise along the list", "40:6:XYZ,43:7:ABC"],
    [
      "11 entries",
      [...TEN, entry(5, 1, "AAA")].map((e) => `${e.score}:${e.level}:${e.name}`).join(","),
    ],
    [
      "one bad entry after a good one (the whole value, not an entry at a time)",
      "43:7:ABC,garbage",
    ],
    ["one bad entry before a good one", "garbage,43:7:ABC"],
    ["a very long run of digits", `${"9".repeat(400)}:7:ABC`],
  ];
  it.each(MALFORMED)("reads %s as an empty list", (_what, text) => {
    expect(parseScores(text, RULES)).toEqual([]);
  });
});

describe("formatScores (docs/SPEC.md 2.15 (1))", () => {
  it("writes the entries in order, joined by commas, in plain digits", () => {
    expect(formatScores([entry(43, 7, "ABC"), entry(40, 6, "XYZ")])).toBe("43:7:ABC,40:6:XYZ");
    expect(formatScores([])).toBe("");
  });
});

describe("readScores", () => {
  it("reads the text under the key", () => {
    const { store, reads } = memoryStore({ [KEY]: "43:7:ABC,40:6:XYZ" });
    expect(readScores(() => store, KEY, RULES)).toEqual([entry(43, 7, "ABC"), entry(40, 6, "XYZ")]);
    expect(reads).toEqual([KEY]);
  });

  it("reads an empty list when nothing is stored or the text is malformed", () => {
    expect(readScores(() => memoryStore().store, KEY, RULES)).toEqual([]);
    expect(readScores(() => memoryStore({ [KEY]: "x" }).store, KEY, RULES)).toEqual([]);
  });

  it("reads an empty list when getting hold of the store throws", () => {
    expect(readScores(throwingGetter, KEY, RULES)).toEqual([]);
  });

  it("reads an empty list when the read throws", () => {
    expect(readScores(() => throwingStore, KEY, RULES)).toEqual([]);
  });
});

describe("writeScores", () => {
  it("writes the list as text under the key", () => {
    const { store, writes } = memoryStore();
    expect(writeScores(() => store, KEY, [entry(43, 7, "ABC")], RULES)).toBe(true);
    expect(writes).toEqual([[KEY, "43:7:ABC"]]);
  });

  it("does not write, and does not touch the store, for a list that is not valid", () => {
    const { store, writes, reads } = memoryStore();
    const getStore = jest.fn(() => store);
    const bad: Array<readonly Entry[]> = [
      [entry(0, 1, "AAA")],
      [entry(5, 0, "---")],
      [entry(5, 1, "abc")],
      [entry(5.5, 1, "AAA")],
      [entry(4001, 1, "AAA")],
      [entry(5, 82, "AAA")],
      [entry(5, 1, "AAA"), entry(6, 1, "AAA")],
      [...TEN, entry(5, 1, "AAA")],
    ];
    for (const list of bad) expect(writeScores(getStore, KEY, list, RULES)).toBe(false);
    expect(getStore).not.toHaveBeenCalled();
    expect(writes).toEqual([]);
    expect(reads).toEqual([]);
  });

  it("returns false and does not throw when the write throws", () => {
    expect(writeScores(() => throwingStore, KEY, [entry(43, 7, "ABC")], RULES)).toBe(false);
  });

  it("returns false and does not throw when getting hold of the store throws", () => {
    expect(writeScores(throwingGetter, KEY, [entry(43, 7, "ABC")], RULES)).toBe(false);
  });
});

describe("bestEntry (docs/SPEC.md 2.15 (1))", () => {
  it("has the best score, the level 0 and the name ---", () => {
    expect(bestEntry(43, RULES)).toEqual(entry(43, 0, "---"));
  });
});

describe("listAsShown (docs/SPEC.md 2.15 (2))", () => {
  it("is empty with nothing stored, no game and a best score of 0", () => {
    expect(listAsShown([], null, 0, RULES)).toEqual({ list: [], rank: null });
  });

  it("is the stored entries when the best score is not above the top one", () => {
    const stored = [entry(43, 7, "ABC"), entry(40, 6, "XYZ")];
    expect(listAsShown(stored, null, 43, RULES).list).toEqual(stored);
    expect(listAsShown(stored, null, 10, RULES).list).toEqual(stored);
  });

  it("puts the entry of the best score first when it is above every stored entry", () => {
    const stored = [entry(43, 7, "ABC")];
    expect(listAsShown(stored, null, 44, RULES).list).toEqual([BEST_ROW(44), ...stored]);
  });

  it("shows the best score alone when nothing is stored", () => {
    expect(listAsShown([], null, 5, RULES).list).toEqual([BEST_ROW(5)]);
  });

  it("places the game's entry after every stored entry with a score at least as high", () => {
    const stored = [
      entry(50, 5, "AAA"),
      entry(40, 4, "BBB"),
      entry(40, 3, "CCC"),
      entry(30, 2, "DDD"),
    ];
    const shown = listAsShown(stored, { score: 40, level: 9 }, 50, RULES);
    expect(shown.list.map((e) => `${e.score}:${e.level}`)).toEqual([
      "50:5",
      "40:4",
      "40:3",
      "40:9",
      "30:2",
    ]);
    expect(shown.rank).toBe(4);
  });

  it("puts a game with the top score after the stored entry with the same score", () => {
    const shown = listAsShown([entry(43, 7, "ABC")], { score: 43, level: 8 }, 43, RULES);
    expect(shown.rank).toBe(2);
    expect(shown.list.map((e) => e.level)).toEqual([7, 8]);
  });

  it("is the first 10 of the stored entries, the game and the best score's entry", () => {
    const shown = listAsShown(TEN, { score: 25, level: 6 }, 150, RULES);
    expect(shown.list.map((e) => e.score)).toEqual([150, 100, 90, 80, 70, 60, 50, 40, 30, 25]);
    expect(shown.list).toHaveLength(10);
  });

  it("cuts a stored list of 10 plus the best score's entry to 10", () => {
    const shown = listAsShown(TEN, null, 150, RULES);
    expect(shown.list.map((e) => e.score)).toEqual([150, 100, 90, 80, 70, 60, 50, 40, 30, 20]);
  });
});

describe("the three examples of docs/SPEC.md 2.15 (3)", () => {
  it("1: best score 43, nothing stored, a game ends with 43 at level 7: rank 1, no best row", () => {
    const shown = listAsShown([], { score: 43, level: 7 }, 43, RULES);
    expect(shown.rank).toBe(1);
    expect(shown.list).toHaveLength(1);
    expect(shown.list[0]).toMatchObject({ score: 43, level: 7 });
    expect(qualifyingRank([], { score: 43, level: 7 }, 43, RULES)).toBe(1);
    const done = confirmEntry([], entry(43, 7, "ABC"), 43, RULES);
    expect(done).toEqual({ kind: "stored", rank: 1, stored: [entry(43, 7, "ABC")] });
    expect(formatScores(done.kind === "stored" ? done.stored : [])).toBe("43:7:ABC");
  });

  it("2: best 150 (name skipped), a game ends with 40 at level 6: shown 150:0:---, 40:6:ABC; rank 2; 40:6:ABC stored", () => {
    expect(qualifyingRank([], { score: 40, level: 6 }, 150, RULES)).toBe(2);
    const done = confirmEntry([], entry(40, 6, "ABC"), 150, RULES);
    expect(done).toEqual({ kind: "stored", rank: 2, stored: [entry(40, 6, "ABC")] });
    if (done.kind !== "stored") throw new Error("not stored");
    expect(listAsShown(done.stored, null, 150, RULES).list).toEqual([
      BEST_ROW(150),
      entry(40, 6, "ABC"),
    ]);
  });

  it("3: ten stored (100 to 10), best 150: a game with 15 does not qualify", () => {
    expect(qualifyingRank(TEN, { score: 15, level: 3 }, 150, RULES)).toBeNull();
    expect(confirmEntry(TEN, entry(15, 3, "ABC"), 150, RULES)).toEqual({ kind: "full" });
  });

  it("3: a game with 25 is ranked 10th; the stored list is 100 to 30, 25 and 20; the entry 10 drops out", () => {
    expect(qualifyingRank(TEN, { score: 25, level: 3 }, 150, RULES)).toBe(10);
    const shown = listAsShown(TEN, { score: 25, level: 3 }, 150, RULES);
    expect(shown.list[0]).toEqual(BEST_ROW(150));
    expect(shown.list.map((e) => e.score)).toEqual([150, 100, 90, 80, 70, 60, 50, 40, 30, 25]);
    const done = confirmEntry(TEN, entry(25, 3, "ABC"), 150, RULES);
    if (done.kind !== "stored") throw new Error("not stored");
    expect(done.rank).toBe(10);
    expect(done.stored.map((e) => e.score)).toEqual([100, 90, 80, 70, 60, 50, 40, 30, 25, 20]);
    expect(done.stored).toHaveLength(10);
    expect(done.stored.some((e) => e.name === "---")).toBe(false);
  });
});

describe("qualifyingRank (docs/SPEC.md 2.15 (3))", () => {
  it("a score of 1 is the least that qualifies, in an empty list", () => {
    expect(qualifyingRank([], { score: 1, level: 1 }, 1, RULES)).toBe(1);
  });

  it("a score of 0 never qualifies", () => {
    expect(qualifyingRank([], { score: 0, level: 1 }, 0, RULES)).toBeNull();
  });

  it("a score or a level that could not be stored never qualifies", () => {
    expect(qualifyingRank([], { score: -3, level: 1 }, 0, RULES)).toBeNull();
    expect(qualifyingRank([], { score: 2.5, level: 1 }, 3, RULES)).toBeNull();
    expect(qualifyingRank([], { score: 4001, level: 1 }, 4001, RULES)).toBeNull();
    expect(qualifyingRank([], { score: 5, level: 0 }, 5, RULES)).toBeNull();
    expect(qualifyingRank([], { score: 5, level: 82 }, 5, RULES)).toBeNull();
  });

  it("a best score equal to the game's score gives no best row, so the game is ranked by its score", () => {
    expect(qualifyingRank([entry(30, 4, "AAA")], { score: 43, level: 7 }, 43, RULES)).toBe(1);
    expect(qualifyingRank([entry(43, 4, "AAA")], { score: 43, level: 7 }, 43, RULES)).toBe(2);
  });

  it("a best score above the game's score is a row ahead of it", () => {
    expect(qualifyingRank([entry(30, 4, "AAA")], { score: 20, level: 2 }, 43, RULES)).toBe(3);
  });

  it("with a full list, a score equal to the lowest entry does not qualify and one above it does", () => {
    expect(qualifyingRank(TEN, { score: 10, level: 2 }, 100, RULES)).toBeNull();
    expect(qualifyingRank(TEN, { score: 11, level: 2 }, 100, RULES)).toBe(10);
  });

  it("with a full list and no best row, the top score is ranked 2nd after an equal score", () => {
    expect(qualifyingRank(TEN, { score: 100, level: 2 }, 100, RULES)).toBe(2);
  });
});

describe("confirmEntry (docs/SPEC.md 2.15 (3), (6))", () => {
  it("stores the entry among the entries read just now, keeping those another tab stored", () => {
    const fresh = [entry(60, 5, "TAB"), entry(20, 2, "OLD")];
    const done = confirmEntry(fresh, entry(40, 4, "MEE"), 60, RULES);
    expect(done).toEqual({
      kind: "stored",
      rank: 2,
      stored: [entry(60, 5, "TAB"), entry(40, 4, "MEE"), entry(20, 2, "OLD")],
    });
  });

  it("is full when the list no longer has room for the entry: another tab filled it", () => {
    const filled = Array.from({ length: 10 }, (_, i) => entry(900 - i, 9, "ZZZ"));
    expect(confirmEntry(filled, entry(40, 4, "ABC"), 900, RULES)).toEqual({ kind: "full" });
  });

  it("is full for a score of 0, which could not have qualified", () => {
    expect(confirmEntry([], entry(0, 1, "ABC"), 0, RULES)).toEqual({ kind: "full" });
  });

  it("keeps the list at 10 entries, the lowest dropping out", () => {
    const done = confirmEntry(TEN, entry(95, 4, "ABC"), 100, RULES);
    if (done.kind !== "stored") throw new Error("not stored");
    expect(done.stored).toHaveLength(10);
    expect(done.stored.map((e) => e.score)).toEqual([100, 95, 90, 80, 70, 60, 50, 40, 30, 20]);
    expect(done.rank).toBe(2);
  });
});

describe("createScoreBook (docs/SPEC.md 2.15 (6))", () => {
  it("reads from and writes to the store", () => {
    const { store, writes } = memoryStore({ [KEY]: "43:7:ABC" });
    const book = createScoreBook(() => store, KEY, RULES);
    expect(book.read()).toEqual([entry(43, 7, "ABC")]);
    expect(book.write([entry(50, 8, "XYZ"), entry(43, 7, "ABC")])).toBe(true);
    expect(writes).toEqual([[KEY, "50:8:XYZ,43:7:ABC"]]);
    expect(book.read()).toEqual([entry(50, 8, "XYZ"), entry(43, 7, "ABC")]);
  });

  it("reads each time from the store, so entries another tab stored are seen", () => {
    const { store, reads } = memoryStore({ [KEY]: "43:7:ABC" });
    const book = createScoreBook(() => store, KEY, RULES);
    book.read();
    store.setItem(KEY, "50:8:XYZ,43:7:ABC");
    expect(book.read()).toHaveLength(2);
    expect(reads).toHaveLength(2);
  });

  it("after a failed write keeps the list in memory and reads no more", () => {
    const store = readOnlyStore("43:7:ABC");
    const book = createScoreBook(() => store, KEY, RULES);
    expect(book.read()).toEqual([entry(43, 7, "ABC")]);
    expect(store.reads).toBe(1);
    const list = [entry(50, 8, "XYZ"), entry(43, 7, "ABC")];
    expect(book.write(list)).toBe(false);
    expect(book.read()).toEqual(list);
    expect(book.read()).toEqual(list);
    expect(store.reads).toBe(1);
  });

  it("after a failed write, a later write changes the list in memory and does not touch the store", () => {
    const setItem = jest.fn(() => {
      throw new Error("write failed");
    });
    const store: ScoreStore = { getItem: () => null, setItem };
    const book = createScoreBook(() => store, KEY, RULES);
    expect(book.write([entry(5, 1, "AAA")])).toBe(false);
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(book.write([entry(7, 2, "BBB"), entry(5, 1, "AAA")])).toBe(false);
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(book.read()).toEqual([entry(7, 2, "BBB"), entry(5, 1, "AAA")]);
  });

  it("when getting hold of the store throws, reads an empty list and keeps written lists in memory", () => {
    const book = createScoreBook(throwingGetter, KEY, RULES);
    expect(book.read()).toEqual([]);
    expect(book.write([entry(5, 1, "AAA")])).toBe(false);
    expect(book.read()).toEqual([entry(5, 1, "AAA")]);
  });

  it("when every read throws, reads an empty list", () => {
    const book = createScoreBook(() => throwingStore, KEY, RULES);
    expect(book.read()).toEqual([]);
  });

  it("a list that is not valid is kept in memory only", () => {
    const { store, writes } = memoryStore();
    const book = createScoreBook(() => store, KEY, RULES);
    expect(book.write([entry(0, 1, "AAA")])).toBe(false);
    expect(writes).toEqual([]);
    expect(book.read()).toEqual([entry(0, 1, "AAA")]);
  });
});

describe("the name (docs/SPEC.md 2.15 (4))", () => {
  it("starts as A in every slot", () => {
    expect(startName(RULES)).toBe("AAA");
    expect(startName({ ...RULES, nameLetters: 4 })).toBe("AAAA");
  });

  it("steps one slot's letter up to the next letter and down to the one before", () => {
    expect(stepLetter("AAA", 1, 1)).toBe("ABA");
    expect(stepLetter("BBB", 2, -1)).toBe("BBA");
    expect(stepLetter("ABC", 0, 1)).toBe("BBC");
  });

  it("goes from Z to A and from A to Z", () => {
    expect(stepLetter("AZA", 1, 1)).toBe("AAA");
    expect(stepLetter("AAA", 0, -1)).toBe("ZAA");
  });

  it("leaves the name as it is for a slot that does not exist", () => {
    expect(stepLetter("AAA", 3, 1)).toBe("AAA");
    expect(stepLetter("AAA", -1, 1)).toBe("AAA");
  });
});

describe("rankText (docs/SPEC.md 2.15 (5))", () => {
  it("writes 1ST, 2ND, 3RD, 4TH and so on to 10TH", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(rankText)).toEqual([
      "1ST",
      "2ND",
      "3RD",
      "4TH",
      "5TH",
      "6TH",
      "7TH",
      "8TH",
      "9TH",
      "10TH",
    ]);
  });
});
