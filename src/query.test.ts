import { readQuery, stepSlowFactor } from "./query";

// The playtest options of the query string (docs/SPEC.md 2.14); the module takes the highest start
// level and the factors as parameters (docs/SPEC.md 3).
const MAX = 99;
const FACTORS = [1, 2, 4];
const NONE = { startLevel: null, slow: false, playtest: false };

describe("readQuery: level (docs/SPEC.md 2.14 (2))", () => {
  it.each(["", "?", "?foo=bar", "?levels=5", "?x=level"])(
    "a query string with no level (%p) has no options",
    (search) => {
      expect(readQuery(search, MAX)).toEqual(NONE);
    },
  );

  it.each([
    ["?level=1", 1],
    ["?level=5", 5],
    ["?level=10", 10],
    ["?level=98", 98],
    ["?level=99", 99],
    ["level=5", 5],
    ["?foo=1&level=7&bar=2", 7],
    ["?level=%35", 5],
  ])("%p is the valid start level %p, and a playtest page", (search, startLevel) => {
    expect(readQuery(search, MAX)).toEqual({ startLevel, slow: false, playtest: true });
  });

  it.each([
    ["no value", "?level"],
    ["an empty value", "?level="],
    ["zero", "?level=0"],
    ["a leading zero", "?level=05"],
    ["a leading zero on zero", "?level=00"],
    ["one more than the highest", "?level=100"],
    ["a huge number", "?level=99999999999999999999999"],
    ["a negative number", "?level=-5"],
    ["a plus sign (read as a space)", "?level=+5"],
    ["a space before", "?level=%205"],
    ["a space after", "?level=5%20"],
    ["a decimal", "?level=5.0"],
    ["a fraction", "?level=2.5"],
    ["an exponent", "?level=1e1"],
    ["a hexadecimal", "?level=0x10"],
    ["text", "?level=abc"],
    ["digits and text", "?level=5abc"],
    ["Infinity", "?level=Infinity"],
    ["NaN", "?level=NaN"],
    ["an Arabic-Indic digit", "?level=%D9%A5"],
    ["a full-width digit", "?level=%EF%BC%95"],
    ["a newline", "?level=5%0A"],
    ["a comma", "?level=5,6"],
  ])("%s (%p) is ignored: no start level, not a playtest page", (_, search) => {
    expect(readQuery(search, MAX)).toEqual(NONE);
  });

  it("a name given twice takes its first value", () => {
    expect(readQuery("?level=5&level=7", MAX).startLevel).toBe(5);
  });

  it("a name given twice takes its first value even when that is invalid", () => {
    expect(readQuery("?level=abc&level=5", MAX)).toEqual(NONE);
    expect(readQuery("?level=&level=5", MAX)).toEqual(NONE);
  });

  it("names are case-sensitive: only level and slow count", () => {
    expect(readQuery("?LEVEL=5&Level=5&Slow", MAX)).toEqual(NONE);
  });

  it("the highest start level is a parameter", () => {
    expect(readQuery("?level=12", 12).startLevel).toBe(12);
    expect(readQuery("?level=13", 12).startLevel).toBeNull();
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "throws a RangeError for the highest start level %p",
    (max) => {
      expect(() => readQuery("?level=1", max)).toThrow(RangeError);
    },
  );
});

describe("readQuery: slow (docs/SPEC.md 2.14 (3), (4))", () => {
  it.each([
    "?slow",
    "?slow=1",
    "?slow=",
    "?slow=0",
    "?slow=false",
    "?slow=anything",
    "slow",
    "?foo=1&slow&bar",
    "?slow&slow=2",
  ])("%p turns slow on, and makes a playtest page", (search) => {
    expect(readQuery(search, MAX)).toEqual({ startLevel: null, slow: true, playtest: true });
  });

  it.each(["?slowly", "?Slow", "?SLOW", "?x=slow", "?slow%20", "?_slow", "?fast"])(
    "%p does not turn slow on",
    (search) => {
      expect(readQuery(search, MAX)).toEqual(NONE);
    },
  );

  it("level and slow together", () => {
    expect(readQuery("?level=5&slow", MAX)).toEqual({ startLevel: 5, slow: true, playtest: true });
    expect(readQuery("?slow&level=5", MAX)).toEqual({ startLevel: 5, slow: true, playtest: true });
  });

  it("an invalid level with slow is still a slow playtest page", () => {
    expect(readQuery("?level=0&slow", MAX)).toEqual({
      startLevel: null,
      slow: true,
      playtest: true,
    });
  });

  it("a valid level with an unrelated name is a playtest page by the level alone", () => {
    expect(readQuery("?level=3&other", MAX)).toEqual({
      startLevel: 3,
      slow: false,
      playtest: true,
    });
  });
});

describe("stepSlowFactor (docs/SPEC.md 2.14 (5))", () => {
  it.each([
    [1, 2],
    [2, 4],
    [4, 1],
  ])("steps %p to %p", (factor, next) => {
    expect(stepSlowFactor(factor, FACTORS)).toBe(next);
  });

  it("goes round: 1, 2, 4, 1, 2", () => {
    const seen = [1];
    for (let i = 0; i < 4; i++) seen.push(stepSlowFactor(seen[i] ?? 0, FACTORS));
    expect(seen).toEqual([1, 2, 4, 1, 2]);
  });

  it("the factors are a parameter", () => {
    expect(stepSlowFactor(3, [1, 3])).toBe(1);
    expect(stepSlowFactor(1, [1, 3])).toBe(3);
  });

  it("a factor that is not in the list steps to the first", () => {
    expect(stepSlowFactor(3, FACTORS)).toBe(1);
  });

  it("a single factor stays", () => {
    expect(stepSlowFactor(1, [1])).toBe(1);
  });

  it("throws a RangeError for no factors", () => {
    expect(() => stepSlowFactor(1, [])).toThrow(RangeError);
  });
});
