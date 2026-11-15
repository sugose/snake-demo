import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  comparePrecedence,
  entriesOnLoad,
  HISTORY,
  type HistoryEntry,
  historyHeading,
  isRealDate,
  isSemver,
  isValidEntry,
  isValidList,
  openOnLoad,
  readSeen,
  TITLE_FULL,
  TITLE_NEW,
  writeSeen,
} from "./history";
import type { ScoreStore } from "./storage";

// The version history (docs/SPEC.md 2.19, 3): the list as data, SemVer 2.0.0 precedence, what opens by
// itself, the stored version, and the headings.
const KEY = "test.seen-version";

const entry = (version: string, date = "2026-11-11", lines = ["Something new."]): HistoryEntry => ({
  version,
  date,
  lines,
});

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

describe("the list (docs/SPEC.md 2.19 (2), (5))", () => {
  it("is not empty", () => {
    expect(HISTORY.length).toBeGreaterThan(0);
  });

  it("has a SemVer 2.0.0 version in each entry", () => {
    for (const each of HISTORY) expect(isSemver(each.version)).toBe(true);
  });

  it("has a real calendar date written YYYY-MM-DD in each entry", () => {
    for (const each of HISTORY) expect(isRealDate(each.date)).toBe(true);
  });

  it("has at least one line in each entry, and no line empty", () => {
    for (const each of HISTORY) {
      expect(each.lines.length).toBeGreaterThanOrEqual(1);
      for (const line of each.lines) expect(line.trim()).not.toBe("");
    }
  });

  it("has no two entries of the same precedence, and is in descending order of precedence", () => {
    HISTORY.slice(1).forEach((older: HistoryEntry, index: number) => {
      const newer = HISTORY[index];
      expect(newer).toBeDefined();
      if (newer === undefined) return;
      expect(comparePrecedence(newer.version, older.version)).toBe(1);
    });
  });

  it("has the version of package.json as its first entry", () => {
    const text = readFileSync(resolve(__dirname, "../package.json"), "utf8");
    const { version } = JSON.parse(text) as { version: string };
    expect(HISTORY[0]?.version).toBe(version);
  });

  it("is a list that isValidList accepts", () => {
    expect(isValidList(HISTORY)).toBe(true);
  });
});

describe("isValidList and isValidEntry: the shape of 2.19 (2)", () => {
  const good = [entry("0.2.0"), entry("0.1.0", "2026-11-09")];

  it("accepts a list of valid entries in descending order", () => {
    expect(isValidList(good)).toBe(true);
  });

  it("refuses an empty list and what is not a list", () => {
    expect(isValidList([])).toBe(false);
    expect(isValidList(null)).toBe(false);
    expect(isValidList(undefined)).toBe(false);
    expect(isValidList("0.1.0")).toBe(false);
    expect(isValidList({ length: 1, 0: entry("0.1.0") })).toBe(false);
  });

  it("refuses two entries of the same precedence, build metadata ignored (1.0.0+a and 1.0.0+b)", () => {
    expect(isValidList([entry("1.0.0+a"), entry("1.0.0+b")])).toBe(false);
    expect(isValidList([entry("1.0.0"), entry("1.0.0")])).toBe(false);
  });

  it("refuses a list that rises or is out of order", () => {
    expect(isValidList([entry("0.1.0"), entry("0.2.0")])).toBe(false);
    expect(isValidList([entry("0.3.0"), entry("0.1.0"), entry("0.2.0")])).toBe(false);
  });

  it("refuses an entry whose version is not a SemVer 2.0.0 version, a leading v and a space included", () => {
    expect(isValidList([entry("v0.2.0")])).toBe(false);
    expect(isValidList([entry(" 0.2.0")])).toBe(false);
    expect(isValidList([entry("0.2")])).toBe(false);
  });

  it("refuses a date that is not a real calendar date", () => {
    expect(isValidList([entry("0.2.0", "2026-02-30")])).toBe(false);
    expect(isValidList([entry("0.2.0", "2026-13-01")])).toBe(false);
    expect(isValidList([entry("0.2.0", "2026-11-1")])).toBe(false);
  });

  it("refuses an entry with no line, or with an empty line", () => {
    expect(isValidList([entry("0.2.0", "2026-11-11", [])])).toBe(false);
    expect(isValidList([entry("0.2.0", "2026-11-11", ["A line.", ""])])).toBe(false);
  });

  it("refuses a line of only spaces, tabs or line feeds: it is not a non-empty text", () => {
    expect(isValidList([entry("0.2.0", "2026-11-11", ["   "])])).toBe(false);
    expect(isValidList([entry("0.2.0", "2026-11-11", ["A line.", " \t\n "])])).toBe(false);
    expect(isValidList([entry("0.2.0", "2026-11-11", [" a "])])).toBe(true);
  });

  it("refuses an entry that lacks a field or has one of the wrong kind", () => {
    expect(isValidEntry({ version: "0.2.0", date: "2026-11-11" })).toBe(false);
    expect(isValidEntry({ version: 2, date: "2026-11-11", lines: ["x"] })).toBe(false);
    expect(isValidEntry({ version: "0.2.0", date: 20261111, lines: ["x"] })).toBe(false);
    expect(isValidEntry({ version: "0.2.0", date: "2026-11-11", lines: "x" })).toBe(false);
    expect(isValidEntry({ version: "0.2.0", date: "2026-11-11", lines: [1] })).toBe(false);
    expect(isValidEntry(null)).toBe(false);
    expect(isValidEntry("0.2.0")).toBe(false);
  });

  it("accepts a line with markup in it, which is text and not HTML", () => {
    expect(isValidEntry(entry("0.2.0", "2026-11-11", ["Fixed <b>bold</b> & more"]))).toBe(true);
  });
});

describe("isSemver: the regular expression of semver.org (docs/SPEC.md 2.19 (2))", () => {
  it.each([
    "0.0.4",
    "1.2.3",
    "10.20.30",
    "1.1.2-prerelease+meta",
    "1.1.2+meta",
    "1.1.2+meta-valid",
    "1.0.0-alpha",
    "1.0.0-beta",
    "1.0.0-alpha.beta",
    "1.0.0-alpha.beta.1",
    "1.0.0-alpha.1",
    "1.0.0-alpha0.valid",
    "1.0.0-alpha.0valid",
    "1.0.0-alpha-a.b-c-somethinglong+build.1-aef.1-its-okay",
    "1.0.0-rc.1+build.1",
    "2.0.0-rc.1+build.123",
    "1.2.3-beta",
    "10.2.3-DEV-SNAPSHOT",
    "1.2.3-SNAPSHOT-123",
    "2.0.0+build.1848",
    "2.0.1-alpha.1227",
    "1.0.0-alpha+beta",
    "1.2.3----RC-SNAPSHOT.12.9.1--.12+788",
    "1.2.3----R-S.12.9.1--.12+meta",
    "1.0.0+0.build.1-rc.10000aaa-kk-0.1",
    "1.0.0-0A.is.legal",
    "0.2.0+abc",
    "0.3.0-rc.1",
    "99999999999999999999999.999999999999999999.99999999999999999",
  ])("accepts %s", (text) => {
    expect(isSemver(text)).toBe(true);
  });

  it.each([
    "",
    "1",
    "1.2",
    "1.2.3-0123",
    "1.2.3-0123.0123",
    "1.1.2+.123",
    "+invalid",
    "-invalid",
    "-invalid+invalid",
    "-invalid.01",
    "alpha",
    "alpha.beta.1",
    "alpha+beta",
    "alpha_beta",
    "1.0.0-alpha_beta",
    "1.0.0-alpha..",
    "1.0.0-alpha..1",
    "01.1.1",
    "1.01.1",
    "1.1.01",
    "1.2.3.DEV",
    "1.2-SNAPSHOT",
    "9.8.7+meta+meta",
    "9.8.7-whatever+meta+meta",
    "0.2.0+",
    "0.2.0-",
    "-1.0.3",
  ])("refuses %j", (text) => {
    expect(isSemver(text)).toBe(false);
  });

  it("refuses a leading v, and a space or a line feed at either end", () => {
    expect(isSemver("v0.2.0")).toBe(false);
    expect(isSemver("V0.2.0")).toBe(false);
    expect(isSemver(" 0.2.0")).toBe(false);
    expect(isSemver("0.2.0 ")).toBe(false);
    expect(isSemver("0.2.0\n")).toBe(false);
    expect(isSemver("\n0.2.0")).toBe(false);
  });
});

describe("comparePrecedence: SemVer 2.0.0 section 11 (docs/SPEC.md 2.19 (2), (5))", () => {
  const CHAIN = [
    "1.0.0-alpha",
    "1.0.0-alpha.1",
    "1.0.0-alpha.beta",
    "1.0.0-beta",
    "1.0.0-beta.2",
    "1.0.0-beta.11",
    "1.0.0-rc.1",
    "1.0.0",
  ];

  it("orders the examples of section 11 strictly, in every pair", () => {
    CHAIN.forEach((low, index) => {
      CHAIN.slice(index + 1).forEach((high) => {
        expect(comparePrecedence(low, high)).toBe(-1);
        expect(comparePrecedence(high, low)).toBe(1);
      });
      expect(comparePrecedence(low, low)).toBe(0);
    });
  });

  it("compares the numbers as numbers, not as text: 1.9.0 < 1.10.0 < 1.11.0", () => {
    expect(comparePrecedence("1.9.0", "1.10.0")).toBe(-1);
    expect(comparePrecedence("1.10.0", "1.11.0")).toBe(-1);
    expect(comparePrecedence("1.9.0", "1.11.0")).toBe(-1);
    expect(comparePrecedence("1.0.9", "1.0.10")).toBe(-1);
    expect(comparePrecedence("2.0.0", "10.0.0")).toBe(-1);
  });

  it("compares major, then minor, then patch", () => {
    expect(comparePrecedence("2.0.0", "1.99.99")).toBe(1);
    expect(comparePrecedence("1.2.0", "1.1.99")).toBe(1);
    expect(comparePrecedence("1.2.3", "1.2.4")).toBe(-1);
    expect(comparePrecedence("0.1.0", "0.0.9")).toBe(1);
  });

  it("ignores build metadata: 1.0.0+a and 1.0.0+b are the same, as are 0.2.0+abc and 0.2.0", () => {
    expect(comparePrecedence("1.0.0+a", "1.0.0+b")).toBe(0);
    expect(comparePrecedence("0.2.0+abc", "0.2.0")).toBe(0);
    expect(comparePrecedence("0.2.0", "0.2.0+abc")).toBe(0);
    expect(comparePrecedence("1.0.0-alpha+x", "1.0.0-alpha")).toBe(0);
    expect(comparePrecedence("1.0.0+zzz", "1.0.1+aaa")).toBe(-1);
  });

  it("puts a release above its prerelease, and a prerelease of a higher version above a lower release", () => {
    expect(comparePrecedence("0.3.0-rc.1", "0.3.0")).toBe(-1);
    expect(comparePrecedence("0.3.0-rc.1", "0.2.9")).toBe(1);
    expect(comparePrecedence("0.2.0", "0.3.0-rc.1")).toBe(-1);
  });

  it("compares numeric identifiers as digit strings, so any length works", () => {
    const nine = "9".repeat(30);
    const ten = `1${"0".repeat(30)}`;
    expect(comparePrecedence(`${nine}.0.0`, `${ten}.0.0`)).toBe(-1);
    expect(comparePrecedence(`1.${ten}.0`, `1.${nine}.0`)).toBe(1);
    expect(comparePrecedence(`1.0.${nine}`, `1.0.${nine}`)).toBe(0);
    expect(comparePrecedence(`1.0.0-${nine}`, `1.0.0-${ten}`)).toBe(-1);
    expect(comparePrecedence(`1.0.0-alpha.${ten}`, `1.0.0-alpha.${nine}`)).toBe(1);
    // Numbers beyond what a double holds exactly still differ.
    expect(comparePrecedence("9007199254740993.0.0", "9007199254740992.0.0")).toBe(1);
  });

  it("ranks a numeric identifier below an alphanumeric one, and compares alphanumerics as ASCII text", () => {
    expect(comparePrecedence("1.0.0-1", "1.0.0-a")).toBe(-1);
    expect(comparePrecedence("1.0.0-a", "1.0.0-1")).toBe(1);
    expect(comparePrecedence("1.0.0-1", "1.0.0-0A")).toBe(-1);
    expect(comparePrecedence("1.0.0-Z", "1.0.0-a")).toBe(-1);
    expect(comparePrecedence("1.0.0-a-b", "1.0.0-a")).toBe(1);
    expect(comparePrecedence("1.0.0-11", "1.0.0-2")).toBe(1);
    expect(comparePrecedence("1.0.0-0", "1.0.0-00a")).toBe(-1);
  });

  it("ranks the longer set of identifiers higher when all those before it are equal", () => {
    expect(comparePrecedence("1.0.0-alpha", "1.0.0-alpha.0")).toBe(-1);
    expect(comparePrecedence("1.0.0-alpha.1.2", "1.0.0-alpha.1")).toBe(1);
    expect(comparePrecedence("1.0.0-alpha.1", "1.0.0-alpha.2")).toBe(-1);
  });

  it("refuses a text that is not a SemVer 2.0.0 version, whichever side it is on", () => {
    expect(() => comparePrecedence("v1.0.0", "1.0.0")).toThrow(RangeError);
    expect(() => comparePrecedence("1.0.0", " 1.0.0")).toThrow(RangeError);
  });
});

describe("isRealDate (docs/SPEC.md 2.19 (2), (5))", () => {
  it("accepts real dates, a leap day among them", () => {
    expect(isRealDate("2026-11-11")).toBe(true);
    expect(isRealDate("2024-02-29")).toBe(true);
    expect(isRealDate("2000-02-29")).toBe(true);
    expect(isRealDate("2026-12-31")).toBe(true);
    expect(isRealDate("2026-01-01")).toBe(true);
  });

  it("refuses dates that are not real calendar dates", () => {
    expect(isRealDate("2026-02-30")).toBe(false);
    expect(isRealDate("2026-02-29")).toBe(false);
    expect(isRealDate("2100-02-29")).toBe(false);
    expect(isRealDate("2026-04-31")).toBe(false);
    expect(isRealDate("2026-00-10")).toBe(false);
    expect(isRealDate("2026-13-10")).toBe(false);
    expect(isRealDate("2026-11-00")).toBe(false);
    expect(isRealDate("2026-11-32")).toBe(false);
  });

  it("refuses text that is not written YYYY-MM-DD", () => {
    for (const text of [
      "",
      "2026-1-1",
      "26-11-11",
      "2026/11/11",
      "2026-11-11 ",
      " 2026-11-11",
      "20261111",
      "2026-11-11T00:00",
      "2026-11-11\n",
    ]) {
      expect(isRealDate(text)).toBe(false);
    }
  });
});

describe("the headings (docs/SPEC.md 2.19 (4))", () => {
  it("writes an entry as `Version 0.2.0 · 2026-11-11`: the version, a space, U+00B7, a space and the date", () => {
    expect(historyHeading(entry("0.2.0", "2026-11-11"))).toBe("Version 0.2.0 · 2026-11-11");
    expect(historyHeading(entry("0.3.0-rc.1", "2027-01-05"))).toBe(
      "Version 0.3.0-rc.1 · 2027-01-05",
    );
  });

  it("names the panel What's new, with the apostrophe U+0027, or Version history", () => {
    expect(TITLE_NEW).toBe("What's new");
    expect(TITLE_NEW.charCodeAt(4)).toBe(0x27);
    expect(TITLE_FULL).toBe("Version history");
  });
});

describe("entriesOnLoad: what opens by itself (docs/SPEC.md 2.19 (3), (5))", () => {
  const LIST = [entry("0.4.0"), entry("0.3.0"), entry("0.2.0"), entry("0.1.0")];
  const versions = (entries: readonly HistoryEntry[]): string[] => entries.map((e) => e.version);

  it("opens nothing when S is missing", () => {
    expect(entriesOnLoad(null, "0.4.0", LIST)).toEqual([]);
  });

  it("opens nothing when S is not a SemVer 2.0.0 version: text, a leading v, a space, a number", () => {
    for (const stored of ["", "banana", "v0.1.0", " 0.1.0", "0.1.0 ", "0.1", "0.1.0\n", "01.0.0"]) {
      expect(entriesOnLoad(stored, "0.4.0", LIST)).toEqual([]);
    }
  });

  it("opens nothing when S looks like a prerelease but is not valid (1.0.0-01, 1.0.0-)", () => {
    expect(entriesOnLoad("0.1.0-01", "0.4.0", LIST)).toEqual([]);
    expect(entriesOnLoad("0.1.0-", "0.4.0", LIST)).toEqual([]);
    expect(entriesOnLoad("0.1.0-rc..1", "0.4.0", LIST)).toEqual([]);
  });

  it("opens nothing when S equals V, also with build metadata on either side", () => {
    expect(entriesOnLoad("0.4.0", "0.4.0", LIST)).toEqual([]);
    expect(entriesOnLoad("0.4.0+abc", "0.4.0", LIST)).toEqual([]);
    expect(entriesOnLoad("0.4.0", "0.4.0+def", LIST)).toEqual([]);
    expect(entriesOnLoad("0.4.0+abc", "0.4.0+def", LIST)).toEqual([]);
  });

  it("opens nothing when S is higher than V (a build older than the one seen last)", () => {
    expect(entriesOnLoad("0.5.0", "0.4.0", LIST)).toEqual([]);
    expect(entriesOnLoad("1.0.0", "0.4.0", LIST)).toEqual([]);
    expect(entriesOnLoad("0.4.1", "0.4.0", LIST)).toEqual([]);
  });

  it("opens the one entry between S and V when S is lower than V by one version", () => {
    expect(versions(entriesOnLoad("0.3.0", "0.4.0", LIST))).toEqual(["0.4.0"]);
  });

  it("opens the entries higher than S and not higher than V, newest first", () => {
    expect(versions(entriesOnLoad("0.1.0", "0.4.0", LIST))).toEqual(["0.4.0", "0.3.0", "0.2.0"]);
    expect(versions(entriesOnLoad("0.0.1", "0.4.0", LIST))).toEqual([
      "0.4.0",
      "0.3.0",
      "0.2.0",
      "0.1.0",
    ]);
  });

  it("opens the entries between S and V when V is lower than the newest entry", () => {
    expect(versions(entriesOnLoad("0.1.0", "0.3.0", LIST))).toEqual(["0.3.0", "0.2.0"]);
    expect(versions(entriesOnLoad("0.0.1", "0.2.5", LIST))).toEqual(["0.2.0", "0.1.0"]);
  });

  it("opens the entries themselves, in the order of the list", () => {
    const opened = entriesOnLoad("0.0.1", "0.4.0", LIST);
    expect(opened).toEqual(LIST);
    expect(opened[0]).toBe(LIST[0]);
  });

  it("opens nothing when no entry lies between S and V", () => {
    expect(entriesOnLoad("0.2.1", "0.2.9", LIST)).toEqual([]);
    expect(entriesOnLoad("0.0.1", "0.0.9", LIST)).toEqual([]);
  });

  it("opens nothing for an empty list", () => {
    expect(entriesOnLoad("0.0.1", "0.4.0", [])).toEqual([]);
  });

  it("opens an entry whose version is S's successor only if it is not above V", () => {
    expect(versions(entriesOnLoad("0.2.0", "0.3.0", LIST))).toEqual(["0.3.0"]);
  });

  it("with S lower than a prerelease V (0.3.0-rc.1) opens the entries up to and including it", () => {
    const list = [entry("0.3.0"), entry("0.3.0-rc.1"), entry("0.2.0")];
    expect(versions(entriesOnLoad("0.2.0", "0.3.0-rc.1", list))).toEqual(["0.3.0-rc.1"]);
    expect(versions(entriesOnLoad("0.1.0", "0.3.0-rc.1", list))).toEqual(["0.3.0-rc.1", "0.2.0"]);
  });

  it("with a prerelease S below a release V opens the release (0.3.0-rc.1 below 0.3.0)", () => {
    const list = [entry("0.3.0"), entry("0.3.0-rc.1"), entry("0.2.0")];
    expect(versions(entriesOnLoad("0.3.0-rc.1", "0.3.0", list))).toEqual(["0.3.0"]);
  });

  it("with a prerelease S equal to V opens nothing, and a release S above a prerelease V opens nothing", () => {
    expect(entriesOnLoad("0.3.0-rc.1", "0.3.0-rc.1", LIST)).toEqual([]);
    expect(entriesOnLoad("0.3.0", "0.3.0-rc.1", LIST)).toEqual([]);
  });

  it("treats an entry with build metadata by its precedence", () => {
    const list = [entry("0.2.0+abc"), entry("0.1.0")];
    expect(versions(entriesOnLoad("0.1.0", "0.2.0", list))).toEqual(["0.2.0+abc"]);
    expect(entriesOnLoad("0.2.0", "0.2.0", list)).toEqual([]);
  });

  it("opens nothing when the build's version V is not a SemVer 2.0.0 version", () => {
    expect(entriesOnLoad("0.1.0", "banana", LIST)).toEqual([]);
    expect(entriesOnLoad("0.1.0", "v0.4.0", LIST)).toEqual([]);
  });

  it("skips an entry in the list whose version is not valid", () => {
    expect(
      versions(entriesOnLoad("0.1.0", "0.4.0", [entry("0.4.0"), entry("x"), entry("0.2.0")])),
    ).toEqual(["0.4.0", "0.2.0"]);
  });
});

describe("readSeen and writeSeen: the stored version (docs/SPEC.md 2.19 (3), 2.9 (4))", () => {
  it("writes the version text as it is and reads it back", () => {
    const { store, values, writes } = memoryStore();
    expect(writeSeen(() => store, KEY, "0.2.0")).toBe(true);
    expect(writes).toEqual([[KEY, "0.2.0"]]);
    expect(values.get(KEY)).toBe("0.2.0");
    expect(readSeen(() => store, KEY)).toBe("0.2.0");
  });

  it("writes and reads back a prerelease with build metadata untouched", () => {
    const { store } = memoryStore();
    writeSeen(() => store, KEY, "0.3.0-rc.1+abc");
    expect(readSeen(() => store, KEY)).toBe("0.3.0-rc.1+abc");
  });

  it("reads null when nothing is stored", () => {
    expect(readSeen(() => memoryStore().store, KEY)).toBeNull();
  });

  it("reads the stored text as it is, valid or not (the decision judges it)", () => {
    const { store } = memoryStore({ [KEY]: "banana" });
    expect(readSeen(() => store, KEY)).toBe("banana");
  });

  it("reads null when getting hold of the store throws", () => {
    expect(readSeen(throwingGetter, KEY)).toBeNull();
  });

  it("reads null when reading throws", () => {
    const store: ScoreStore = {
      getItem: () => {
        throw new Error("read refused");
      },
      setItem: () => undefined,
    };
    expect(readSeen(() => store, KEY)).toBeNull();
  });

  it("returns false and throws nothing when getting hold of the store throws on a write", () => {
    expect(writeSeen(throwingGetter, KEY, "0.2.0")).toBe(false);
  });

  it("returns false and throws nothing when writing throws", () => {
    const store: ScoreStore = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException("quota", "QuotaExceededError");
      },
    };
    expect(writeSeen(() => store, KEY, "0.2.0")).toBe(false);
  });
});

describe("openOnLoad: reading, deciding and writing V (docs/SPEC.md 2.19 (3), (5))", () => {
  const LIST = [entry("0.3.0"), entry("0.2.0"), entry("0.1.0")];
  const versions = (entries: readonly HistoryEntry[]): string[] => entries.map((e) => e.version);

  it("a store that returns nothing: nothing opens and V is written", () => {
    const { store, values } = memoryStore();
    expect(openOnLoad(() => store, KEY, "0.3.0", LIST)).toEqual([]);
    expect(values.get(KEY)).toBe("0.3.0");
  });

  it("an invalid S: nothing opens and V is written over it", () => {
    const { store, values } = memoryStore({ [KEY]: "v0.1.0" });
    expect(openOnLoad(() => store, KEY, "0.3.0", LIST)).toEqual([]);
    expect(values.get(KEY)).toBe("0.3.0");
  });

  it("a prerelease-looking invalid S: nothing opens and V is written", () => {
    const { store, values } = memoryStore({ [KEY]: "0.1.0-01" });
    expect(openOnLoad(() => store, KEY, "0.3.0", LIST)).toEqual([]);
    expect(values.get(KEY)).toBe("0.3.0");
  });

  it("S equal to V: nothing opens and V is written again", () => {
    const { store, writes } = memoryStore({ [KEY]: "0.3.0" });
    expect(openOnLoad(() => store, KEY, "0.3.0", LIST)).toEqual([]);
    expect(writes).toEqual([[KEY, "0.3.0"]]);
  });

  it("S equal to V with build metadata: nothing opens and V is written", () => {
    const { store, values } = memoryStore({ [KEY]: "0.3.0+abc" });
    expect(openOnLoad(() => store, KEY, "0.3.0", LIST)).toEqual([]);
    expect(values.get(KEY)).toBe("0.3.0");
  });

  it("S higher than V: nothing opens and V is written, lowering the stored version", () => {
    const { store, values } = memoryStore({ [KEY]: "1.0.0" });
    expect(openOnLoad(() => store, KEY, "0.3.0", LIST)).toEqual([]);
    expect(values.get(KEY)).toBe("0.3.0");
  });

  it("S lower than V with one entry in between: it opens, and V is written", () => {
    const { store, values } = memoryStore({ [KEY]: "0.2.0" });
    expect(versions(openOnLoad(() => store, KEY, "0.3.0", LIST))).toEqual(["0.3.0"]);
    expect(values.get(KEY)).toBe("0.3.0");
  });

  it("S lower than V with several entries in between: they open newest first, and V is written", () => {
    const { store, values } = memoryStore({ [KEY]: "0.0.1" });
    expect(versions(openOnLoad(() => store, KEY, "0.3.0", LIST))).toEqual([
      "0.3.0",
      "0.2.0",
      "0.1.0",
    ]);
    expect(values.get(KEY)).toBe("0.3.0");
  });

  it("S lower than V with no entry in between: nothing opens, and V is written", () => {
    const { store, values } = memoryStore({ [KEY]: "0.3.1" });
    expect(openOnLoad(() => store, KEY, "0.3.5", LIST)).toEqual([]);
    expect(values.get(KEY)).toBe("0.3.5");
  });

  it("opens once: the same load repeated with the same store opens nothing the second time", () => {
    const { store } = memoryStore({ [KEY]: "0.1.0" });
    expect(versions(openOnLoad(() => store, KEY, "0.3.0", LIST))).toEqual(["0.3.0", "0.2.0"]);
    expect(openOnLoad(() => store, KEY, "0.3.0", LIST)).toEqual([]);
  });

  it("reads S before it writes V, with the one key", () => {
    const { store, reads, writes } = memoryStore({ [KEY]: "0.1.0" });
    openOnLoad(() => store, KEY, "0.3.0", LIST);
    expect(reads).toEqual([KEY]);
    expect(writes).toEqual([[KEY, "0.3.0"]]);
  });

  it("a store that cannot be got hold of: nothing opens, the write is tried and its failure ignored", () => {
    let gets = 0;
    const getter = (): ScoreStore => {
      gets++;
      throw new DOMException("denied", "SecurityError");
    };
    expect(openOnLoad(getter, KEY, "0.3.0", LIST)).toEqual([]);
    expect(gets).toBe(2);
  });

  it("a store that throws on reading: nothing opens and V is written", () => {
    const writes: Array<[string, string]> = [];
    const store: ScoreStore = {
      getItem: () => {
        throw new Error("read refused");
      },
      setItem: (key, value) => {
        writes.push([key, value]);
      },
    };
    expect(openOnLoad(() => store, KEY, "0.3.0", LIST)).toEqual([]);
    expect(writes).toEqual([[KEY, "0.3.0"]]);
  });

  it("a store that throws on writing: the decision is still given", () => {
    const store: ScoreStore = {
      getItem: () => "0.1.0",
      setItem: () => {
        throw new DOMException("quota", "QuotaExceededError");
      },
    };
    expect(versions(openOnLoad(() => store, KEY, "0.3.0", LIST))).toEqual(["0.3.0", "0.2.0"]);
  });

  it("a write that fails is tried again at the next load, which may then open it again", () => {
    let broken = true;
    const values = new Map<string, string>([[KEY, "0.1.0"]]);
    const store: ScoreStore = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        if (broken) throw new Error("refused");
        values.set(key, value);
      },
    };
    expect(openOnLoad(() => store, KEY, "0.3.0", LIST)).not.toEqual([]);
    expect(openOnLoad(() => store, KEY, "0.3.0", LIST)).not.toEqual([]);
    broken = false;
    expect(openOnLoad(() => store, KEY, "0.3.0", LIST)).not.toEqual([]);
    expect(openOnLoad(() => store, KEY, "0.3.0", LIST)).toEqual([]);
  });

  it("with a V that is not a SemVer 2.0.0 version nothing opens and V is still written", () => {
    const { store, writes } = memoryStore({ [KEY]: "0.1.0" });
    expect(openOnLoad(() => store, KEY, "banana", LIST)).toEqual([]);
    expect(writes).toEqual([[KEY, "banana"]]);
  });
});
