import {
  type Cell,
  type Direction,
  type GameState,
  ignoredBecause,
  newGame,
  type SpecialRules,
  tick,
  turn,
} from "./game";

// What src/game.ts reports for the event log (docs/SPEC.md 2.13, 3).
const SPECIAL: SpecialRules = {
  every: 5,
  shieldLayers: 3,
  maxTurns: 20,
  seconds: 30,
  jumpSeconds: 3,
  clearAheadOfHead: 2,
  delays: { first: 125, step: 5, shortest: 50 },
};
const BASE = newGame({
  size: 20,
  startLength: 3,
  clearAhead: 8,
  dotsPerLevel: 5,
  special: SPECIAL,
  choose: () => 0,
});
const LINE: Cell[] = [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 },
];

/** A game on `level`, heading right with the snake in `LINE`, the dot far away, and `overrides`. */
function game(overrides: Partial<GameState> = {}, level = 1): GameState {
  return {
    ...BASE,
    level,
    status: "running",
    snake: LINE,
    heading: "right",
    food: { x: 0, y: 19 },
    obstacles: [],
    run: level % 5 === 0 ? { turns: 0, timeMs: 0, shieldUsed: 0, waiting: false } : null,
    ...overrides,
  };
}

describe("newGame reports nothing yet", () => {
  it("has no crash and no cleared level", () => {
    expect(BASE.crashed).toBeNull();
    expect(BASE.cleared).toBeNull();
  });
});

describe("ignoredBecause (docs/SPEC.md 2.13 (4))", () => {
  const stacked = (cell: Cell): Cell[] => [cell, cell, cell];

  it.each<[string, Partial<GameState>, Direction, string | null]>([
    [
      "ready, straight back",
      { status: "ready", snake: stacked({ x: 5, y: 5 }) },
      "left",
      "straight back",
    ],
    ["ready, the heading", { status: "ready", snake: stacked({ x: 5, y: 5 }) }, "right", null],
    [
      "ready, into a wall",
      { status: "ready", snake: stacked({ x: 5, y: 0 }), heading: "right" },
      "up",
      "into a wall",
    ],
    [
      "ready, onto an obstacle",
      { status: "ready", snake: stacked({ x: 5, y: 5 }), obstacles: [{ x: 5, y: 4 }] },
      "up",
      "onto an obstacle",
    ],
    [
      "ready, straight back wins over a wall behind",
      { status: "ready", snake: stacked({ x: 0, y: 5 }), heading: "right" },
      "left",
      "straight back",
    ],
    ["running, same direction", {}, "right", "same direction"],
    ["running, straight back", {}, "left", "straight back"],
    ["running, a side turn", {}, "up", null],
    ["running, same as the last queued", { queue: ["up"] }, "up", "same direction"],
    ["running, straight back from the last queued", { queue: ["up"] }, "down", "straight back"],
    ["running, queue full", { queue: ["up", "left"] }, "down", "queue full"],
    ["paused", { status: "paused" }, "up", "state"],
    ["over", { status: "over", ended: "wall" }, "up", "state"],
  ])("%s", (_name, overrides, direction, reason) => {
    expect(ignoredBecause(game(overrides), direction)).toBe(reason);
  });

  it("while the snake waits, only not free", () => {
    const waiting = game(
      {
        snake: [
          { x: 19, y: 10 },
          { x: 18, y: 10 },
          { x: 17, y: 10 },
        ],
        run: { turns: 0, timeMs: 0, shieldUsed: 1, waiting: true },
      },
      5,
    );
    expect(ignoredBecause(waiting, "right")).toBe("not free");
    expect(ignoredBecause(waiting, "left")).toBe("not free");
    expect(ignoredBecause(waiting, "up")).toBeNull();
  });

  it("turn ignores exactly what ignoredBecause names", () => {
    for (const overrides of [
      {},
      { queue: ["up" as const, "left" as const] },
      { status: "paused" as const },
    ]) {
      for (const direction of ["up", "down", "left", "right"] as const) {
        const state = game(overrides);
        expect(turn(state, direction) === state).toBe(ignoredBecause(state, direction) !== null);
      }
    }
  });
});

describe("what a shielded crash hit", () => {
  it.each<[string, Partial<GameState>, string]>([
    ["a wall", { snake: LINE.map((c) => ({ x: c.x + 9, y: c.y })) }, "wall"],
    ["an obstacle", { obstacles: [{ x: 11, y: 10 }] }, "obstacle"],
  ])("%s", (_name, overrides, hit) => {
    const next = tick(game(overrides, 5), () => 0);
    expect(next.run?.waiting).toBe(true);
    expect(next.crashed).toBe(hit);
  });
});

describe("what a cleared level gave", () => {
  it("on a normal level, its number and no special points", () => {
    const next = tick(game({ food: { x: 11, y: 10 }, dotsEaten: 4, score: 19 }, 4), () => 0);
    expect(next.level).toBe(5);
    expect(next.cleared).toEqual({ level: 4, special: null });
  });

  it("on a special level, the points and the turns, seconds and layers they counted", () => {
    const before = game(
      {
        food: { x: 11, y: 10 },
        dotsEaten: 4,
        score: 20,
        run: { turns: 15, timeMs: 17945, shieldUsed: 1, waiting: false },
      },
      5,
    );
    const next = tick(before, () => 0);
    expect(next.level).toBe(6);
    // 18 000 ms used: 12 s left; 5 turns left; one layer used: (5 + 12) x 2/3 = 11.3, so 11.
    expect(next.cleared).toEqual({
      level: 5,
      special: { points: 11, turnsLeft: 5, secondsLeft: 12, shieldUsed: 1 },
    });
    expect(next.score).toBe(31);
  });
});
