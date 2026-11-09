import { readBest, type ScoreStore, writeBest } from "./storage";

const KEY = "test.best";
const MAX = 400;

/** A store kept in memory, recording every write. */
function memoryStore(initial: Record<string, string> = {}): {
  store: ScoreStore;
  writes: Array<[string, string]>;
} {
  const values = new Map(Object.entries(initial));
  const writes: Array<[string, string]> = [];
  const store: ScoreStore = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      writes.push([key, value]);
      values.set(key, value);
    },
  };
  return { store, writes };
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

describe("readBest", () => {
  it("reads 0 when no value is stored", () => {
    const { store } = memoryStore();
    expect(readBest(() => store, KEY, MAX)).toBe(0);
  });

  it.each([
    ["0", 0],
    ["7", 7],
    ["10", 10],
    ["400", 400],
  ])("reads the plain-digit value %p as %p", (raw, expected) => {
    const { store } = memoryStore({ [KEY]: raw });
    expect(readBest(() => store, KEY, MAX)).toBe(expected);
  });

  it("reads the value stored under the key it is given, not another key", () => {
    const { store } = memoryStore({ [KEY]: "12", "other.key": "30" });
    expect(readBest(() => store, KEY, MAX)).toBe(12);
    expect(readBest(() => store, "other.key", MAX)).toBe(30);
    expect(readBest(() => store, "missing.key", MAX)).toBe(0);
  });

  it("reads a value above max as 0", () => {
    const { store } = memoryStore({ [KEY]: "401" });
    expect(readBest(() => store, KEY, MAX)).toBe(0);
  });

  it("takes the upper bound from the max parameter", () => {
    const { store } = memoryStore({ [KEY]: "50" });
    expect(readBest(() => store, KEY, 50)).toBe(50);
    expect(readBest(() => store, KEY, 49)).toBe(0);
  });

  it("reads a digit string too long for a safe number as 0", () => {
    const { store } = memoryStore({ [KEY]: "99999999999999999999999" });
    expect(readBest(() => store, KEY, MAX)).toBe(0);
  });

  it.each([
    "007",
    "00",
    " 7",
    "7 ",
    "7.0",
    "7.",
    "-1",
    "-0",
    "+7",
    "",
    "abc",
    "7a",
    "1e2",
    "0x10",
    "Infinity",
    "NaN",
    "٣",
  ])("reads the malformed value %p as 0", (raw) => {
    const { store } = memoryStore({ [KEY]: raw });
    expect(readBest(() => store, KEY, MAX)).toBe(0);
  });

  it("reads 0 when getting the store throws", () => {
    expect(readBest(throwingGetter, KEY, MAX)).toBe(0);
  });

  it("reads 0 when getItem throws", () => {
    expect(readBest(() => throwingStore, KEY, MAX)).toBe(0);
  });

  it("reads 0 when getting the store throws a value that is not an Error", () => {
    const getter = (): ScoreStore => {
      throw "denied";
    };
    expect(readBest(getter, KEY, MAX)).toBe(0);
  });
});

describe("writeBest", () => {
  it("writes the score in plain digits under the key it is given", () => {
    const { store, writes } = memoryStore();
    writeBest(() => store, KEY, 42);
    expect(writes).toEqual([[KEY, "42"]]);
  });

  it("writes 0 as the digit 0", () => {
    const { store, writes } = memoryStore();
    writeBest(() => store, KEY, 0);
    expect(writes).toEqual([[KEY, "0"]]);
  });

  it("writes negative zero as the digit 0", () => {
    const { store, writes } = memoryStore();
    writeBest(() => store, KEY, -0);
    expect(writes).toEqual([[KEY, "0"]]);
  });

  it("writes a very large whole number in plain digits, not exponent form", () => {
    const { store, writes } = memoryStore();
    writeBest(() => store, KEY, 1e21);
    expect(writes).toEqual([[KEY, "1000000000000000000000"]]);
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "writes nothing for %p, which is not a whole number from 0 up",
    (score) => {
      const { store, writes } = memoryStore({ [KEY]: "9" });
      writeBest(() => store, KEY, score);
      expect(writes).toEqual([]);
      expect(readBest(() => store, KEY, MAX)).toBe(9);
    },
  );

  it("does not throw when getting the store throws", () => {
    expect(() => writeBest(throwingGetter, KEY, 5)).not.toThrow();
  });

  it("does not throw when setItem throws", () => {
    expect(() => writeBest(() => throwingStore, KEY, 5)).not.toThrow();
  });

  it("writes a value that readBest reads back", () => {
    const { store } = memoryStore();
    writeBest(() => store, KEY, 123);
    expect(readBest(() => store, KEY, MAX)).toBe(123);
  });
});
