import {
  type Cell,
  type Chooser,
  freeDirections,
  type GameState,
  levelDelay,
  newGame,
  type SpecialRules,
  type SpecialRun,
  specialInfo,
  start,
  tick,
  togglePause,
  turn,
} from "./game";

// The special levels (docs/SPEC.md 2.10 (2), 2.12), with the spec's values; the module takes them
// as parameters (docs/SPEC.md 3).
const DELAYS = { first: 125, step: 5, shortest: 50 };
const SPECIAL: SpecialRules = {
  every: 5,
  shieldLayers: 3,
  maxTurns: 20,
  seconds: 30,
  jumpSeconds: 3,
  clearAheadOfHead: 2,
  delays: DELAYS,
};
const RULES = { size: 20, startLength: 3, clearAhead: 8, dotsPerLevel: 5, special: SPECIAL };

/** The start (10,10) heading right in the list of 960 starts (docs/SPEC.md 2.11 (2)). */
const CENTRE_RIGHT = 513;
/** The delay of level 5, in milliseconds: half of level 4's 110 (docs/SPEC.md 2.12 (2)). */
const LEVEL_5_DELAY = 55;

/** A chooser that gives `indices` in order, the last one repeating, and records every count. */
function answers(...indices: number[]): Chooser & { counts: number[] } {
  const counts: number[] = [];
  const choose = (count: number): number => {
    const index = indices[Math.min(counts.length, indices.length - 1)] ?? 0;
    counts.push(count);
    return index;
  };
  return Object.assign(choose, { counts });
}

/** Freezes a state and everything in it, so a function that mutates its argument throws. */
function frozen(state: GameState): GameState {
  for (const cell of state.snake) Object.freeze(cell);
  for (const cell of state.obstacles) Object.freeze(cell);
  Object.freeze(state.snake);
  Object.freeze(state.obstacles);
  Object.freeze(state.queue);
  if (state.food) Object.freeze(state.food);
  if (state.run) Object.freeze(state.run);
  return Object.freeze(state);
}

const FRESH_RUN: SpecialRun = { turns: 0, timeMs: 0, shieldUsed: 0, waiting: false };

/** A snake laid out in a line, head at the centre heading right, body to its left. */
const LINE: Cell[] = [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 },
];

/**
 * Level 5, `running`, the snake in `LINE` heading right, the dot at (0,0) and no obstacles, with
 * `run` and `overrides` on top.
 */
function special(run: Partial<SpecialRun> = {}, overrides: Partial<GameState> = {}): GameState {
  return frozen({
    ...newGame({ ...RULES, choose: answers(CENTRE_RIGHT, 0) }),
    level: 5,
    status: "running",
    snake: LINE,
    heading: "right",
    food: { x: 0, y: 0 },
    obstacles: [],
    run: { ...FRESH_RUN, ...run },
    ...overrides,
  });
}

/** The same snake moved `cells` to the right. */
const shifted = (cells: number): Cell[] => LINE.map((c) => ({ x: c.x + cells, y: c.y }));

describe("levelDelay with special levels (docs/SPEC.md 2.10 (2), 2.12 (2))", () => {
  it.each([
    [1, 125],
    [2, 120],
    [4, 110],
    [5, 55],
    [6, 105],
    [9, 90],
    [10, 45],
    [14, 70],
    [15, 35],
    [16, 65],
    [18, 55],
    [19, 50],
    [20, 25],
    [21, 50],
    [25, 25],
    [100, 25],
  ])("level %i has %i ms", (level, delay) => {
    expect(levelDelay(level, { ...DELAYS, every: 5 })).toBe(delay);
  });

  it("without special levels, counts every level as before", () => {
    expect(levelDelay(5, DELAYS)).toBe(105);
    expect(levelDelay(16, DELAYS)).toBe(50);
  });

  it.each([0, 1, 2.5, Number.NaN])("throws a RangeError for every %p", (every) => {
    expect(() => levelDelay(5, { ...DELAYS, every })).toThrow(RangeError);
  });
});

describe("newGame with special levels", () => {
  it("keeps the special rules, and level 1 is not special", () => {
    const state = newGame({ ...RULES, choose: answers(CENTRE_RIGHT, 0) });
    expect(state.special).toEqual(SPECIAL);
    expect(state.run).toBeNull();
    expect(specialInfo(state)).toBeNull();
  });

  it("without special rules has none", () => {
    const { special: _, ...normal } = RULES;
    const state = newGame({ ...normal, choose: answers(CENTRE_RIGHT, 0) });
    expect(state.special).toBeNull();
    expect(state.run).toBeNull();
  });

  it.each<[string, Partial<SpecialRules>]>([
    ["every 1", { every: 1 }],
    ["every 2.5", { every: 2.5 }],
    ["no shield layer", { shieldLayers: 0 }],
    ["a negative turn limit", { maxTurns: -1 }],
    ["no seconds", { seconds: 0 }],
    ["no jump interval", { jumpSeconds: 0 }],
    ["a negative clear count ahead of the head", { clearAheadOfHead: -1 }],
  ])("throws a RangeError for %s", (_name, change) => {
    expect(() =>
      newGame({ ...RULES, special: { ...SPECIAL, ...change }, choose: answers(CENTRE_RIGHT, 0) }),
    ).toThrow(RangeError);
  });
});

describe("going to and from a special level (docs/SPEC.md 2.12 (1), (3))", () => {
  /** Level `level`, `running`, the snake in `LINE` with the 5th dot just ahead. */
  const lastDot = (level: number, run: SpecialRun | null, score: number) =>
    frozen({
      ...newGame({ ...RULES, choose: answers(CENTRE_RIGHT, 0) }),
      level,
      status: "running",
      snake: LINE,
      heading: "right",
      food: { x: 11, y: 10 },
      dotsEaten: 4,
      score,
      run,
    });

  it("clearing level 4 lays out level 5 as special, with a full shield, all turns and no time", () => {
    const next = tick(lastDot(4, null, 19), answers(CENTRE_RIGHT, 0));
    expect(next.level).toBe(5);
    expect(next.status).toBe("ready");
    expect(next.score).toBe(20);
    expect(next.obstacles).toHaveLength(4);
    expect(next.run).toEqual(FRESH_RUN);
    expect(specialInfo(next)).toEqual({ turnsLeft: 20, secondsLeft: 30, shieldLeft: 3 });
  });

  it("clearing level 5 lays out level 6 as normal", () => {
    const next = tick(lastDot(5, FRESH_RUN, 20), answers(CENTRE_RIGHT, 0));
    expect(next.level).toBe(6);
    expect(next.run).toBeNull();
    expect(next.obstacles).toHaveLength(5);
    expect(specialInfo(next)).toBeNull();
  });

  it("level 10 starts with a full shield again, whatever level 5 used", () => {
    const used: SpecialRun = { turns: 19, timeMs: 29000, shieldUsed: 3, waiting: false };
    const level6 = tick(lastDot(5, used, 20), answers(CENTRE_RIGHT, 0));
    expect(level6.run).toBeNull();
    const level10 = tick(lastDot(9, null, 40), answers(CENTRE_RIGHT, 0));
    expect(level10.run).toEqual(FRESH_RUN);
  });
});

describe("dots and points on a special level (docs/SPEC.md 2.9 (1), 2.12 (8))", () => {
  it("a dot that does not clear the level adds nothing to the score but grows the snake", () => {
    const state = special({}, { food: { x: 11, y: 10 }, score: 20, dotsEaten: 2 });
    const next = tick(state, answers(0));
    expect(next.score).toBe(20);
    expect(next.dotsEaten).toBe(3);
    expect(next.snake).toHaveLength(4);
  });

  it.each<[string, Partial<SpecialRun>, number]>([
    ["no turns, no shield used, one tick: (20 + 30) x 1", {}, 50],
    [
      "5 turns, 10 s, one layer used: (15 + 20) x 2/3 = 23.3",
      { turns: 5, timeMs: 10000, shieldUsed: 1 },
      23,
    ],
    ["no turns, two layers used: 50 x 1/3 = 16.7", { shieldUsed: 2 }, 17],
    ["all layers used: 50 x 0", { shieldUsed: 3 }, 0],
    ["20 turns, 1 s left as a begun second: (0 + 1) x 1", { turns: 20, timeMs: 28946 }, 1],
    ["the time reaching 30 s in the clearing tick: 0 s left", { turns: 10, timeMs: 29945 }, 10],
  ])("%s", (_name, run, points) => {
    const state = special(run, { food: { x: 11, y: 10 }, score: 20, dotsEaten: 4 });
    const next = tick(state, answers(CENTRE_RIGHT, 0));
    expect(next.level).toBe(6);
    expect(next.status).toBe("ready");
    expect(next.score).toBe(20 + points);
  });
});

describe("turns on a special level (docs/SPEC.md 2.12 (6))", () => {
  it("the turn that starts the level from ready is not counted", () => {
    const ready = special({}, { status: "ready" });
    expect(turn(ready, "up").run).toEqual(FRESH_RUN);
    expect(start(ready).run).toEqual(FRESH_RUN);
  });

  it("a queued turn is not counted until a tick takes it", () => {
    const queued = turn(special(), "up");
    expect(queued.queue).toEqual(["up"]);
    expect(queued.run?.turns).toBe(0);
    const next = tick(queued, answers(0));
    expect(next.heading).toBe("up");
    expect(next.run?.turns).toBe(1);
  });

  it("the 20th turn is allowed", () => {
    const next = tick(special({ turns: 19 }, { queue: ["up"] }), answers(0));
    expect(next.status).toBe("running");
    expect(next.snake[0]).toEqual({ x: 10, y: 9 });
    expect(next.run?.turns).toBe(20);
    expect(specialInfo(next)?.turnsLeft).toBe(0);
  });

  it("the 21st turn blows the snake up before it moves, with the board as it was", () => {
    const state = special({ turns: 20 }, { queue: ["up"] });
    const next = tick(state, answers(0));
    expect(next).toEqual({ ...state, status: "blown", ended: "turns" });
  });

  it("a tick with no turn counts none", () => {
    expect(tick(special({ turns: 20 }), answers(0)).run?.turns).toBe(20);
  });
});

describe("the level's time (docs/SPEC.md 2.12 (3), (7))", () => {
  it("each tick in which the snake moves adds the level's delay", () => {
    const next = tick(special({ timeMs: 1000 }), answers(0));
    expect(next.run?.timeMs).toBe(1000 + LEVEL_5_DELAY);
  });

  it("a tick that leaves the time at 30 s or more, the level not cleared, blows the snake up there", () => {
    const next = tick(special({ timeMs: 30000 - LEVEL_5_DELAY }), answers(0));
    expect(next.status).toBe("blown");
    expect(next.ended).toBe("time");
    expect(next.snake).toEqual(shifted(1));
    expect(next.run?.timeMs).toBe(30000);
    expect(specialInfo(next)?.secondsLeft).toBe(0);
  });

  it("a tick that leaves the time just under 30 s goes on", () => {
    const next = tick(special({ timeMs: 30000 - LEVEL_5_DELAY - 1 }), answers(0));
    expect(next.status).toBe("running");
    expect(specialInfo(next)?.secondsLeft).toBe(1);
  });

  it.each([
    [0, 30],
    [1, 30],
    [999, 30],
    [1000, 29],
    [29001, 1],
    [30000, 0],
  ])("after %i ms, %i seconds are left (a begun second counts)", (timeMs, seconds) => {
    expect(specialInfo(special({ timeMs }))?.secondsLeft).toBe(seconds);
  });
});

describe("the shield (docs/SPEC.md 2.12 (5))", () => {
  const atWall = shifted(9); // head at (19,10), heading right

  it("a wall with a layer left uses it; the snake stays and waits, with no time used", () => {
    const next = tick(special({ timeMs: 500, turns: 2 }, { snake: atWall }), answers(0));
    expect(next.status).toBe("running");
    expect(next.snake).toEqual(atWall);
    expect(next.heading).toBe("right");
    expect(next.run).toEqual({ turns: 2, timeMs: 500, shieldUsed: 1, waiting: true });
    expect(specialInfo(next)?.shieldLeft).toBe(2);
  });

  it("a queued turn into a wall is counted, kept as the heading, and the other queued turn is cleared", () => {
    const top = LINE.map((c) => ({ x: c.x, y: 0 }));
    const next = tick(special({}, { snake: top, queue: ["up", "right"] }), answers(0));
    expect(next.status).toBe("running");
    expect(next.snake).toEqual(top);
    expect(next.heading).toBe("up");
    expect(next.queue).toEqual([]);
    expect(next.run).toEqual({ turns: 1, timeMs: 0, shieldUsed: 1, waiting: true });
  });

  it("an obstacle with a layer left uses it the same way", () => {
    const next = tick(special({}, { obstacles: [{ x: 11, y: 10 }] }), answers(0));
    expect(next.status).toBe("running");
    expect(next.snake).toEqual(LINE);
    expect(next.run?.shieldUsed).toBe(1);
    expect(next.run?.waiting).toBe(true);
  });

  it("a wall with one layer left uses the last one: the snake waits with no shield left", () => {
    const next = tick(special({ shieldUsed: 2 }, { snake: atWall }), answers(0));
    expect(next.status).toBe("running");
    expect(next.snake).toEqual(atWall);
    expect(next.run?.shieldUsed).toBe(3);
    expect(next.run?.waiting).toBe(true);
    expect(specialInfo(next)?.shieldLeft).toBe(0);
  });

  it("a wall with no layer left ends the game", () => {
    const state = special({ shieldUsed: 3 }, { snake: atWall });
    expect(tick(state, answers(0))).toEqual({ ...state, status: "over", ended: "wall" });
  });

  it("an obstacle with no layer left ends the game", () => {
    const state = special({ shieldUsed: 3 }, { obstacles: [{ x: 11, y: 10 }] });
    expect(tick(state, answers(0))).toEqual({ ...state, status: "over", ended: "obstacle" });
  });

  it("the snake's own body ends the game, shield or not", () => {
    const coiled: Cell[] = [
      { x: 10, y: 10 },
      { x: 10, y: 11 },
      { x: 11, y: 11 },
      { x: 11, y: 10 },
      { x: 12, y: 10 },
    ];
    const next = tick(special({}, { snake: coiled, heading: "up", queue: ["right"] }), answers(0));
    expect(next.status).toBe("over");
    expect(next.ended).toBe("self");
    expect(next.run?.shieldUsed).toBe(0);
  });

  describe("while the snake waits", () => {
    const waiting = special(
      { shieldUsed: 1, waiting: true, turns: 3, timeMs: 700 },
      { snake: atWall },
    );

    it("a tick does nothing", () => {
      expect(tick(waiting, answers(0))).toBe(waiting);
    });

    it.each(["right", "left"] as const)(
      "a turn %s (the heading or its opposite) is ignored",
      (d) => {
        expect(turn(waiting, d)).toBe(waiting);
      },
    );

    it("another turn becomes the heading at once, is not counted and ends the wait; the next tick moves", () => {
      const turned = turn(waiting, "down");
      expect(turned.heading).toBe("down");
      expect(turned.queue).toEqual([]);
      expect(turned.run).toEqual({ shieldUsed: 1, waiting: false, turns: 3, timeMs: 700 });
      const moved = tick(turned, answers(0));
      expect(moved.snake[0]).toEqual({ x: 19, y: 11 });
      expect(moved.run?.timeMs).toBe(700 + LEVEL_5_DELAY);
    });

    it("with all 20 turns used, that turn is still free: the snake goes on", () => {
      const last = special({ shieldUsed: 1, waiting: true, turns: 20 }, { snake: atWall });
      const turned = turn(last, "down");
      expect(turned.status).toBe("running");
      expect(turned.heading).toBe("down");
      expect(turned.run).toEqual({ shieldUsed: 1, waiting: false, turns: 20, timeMs: 0 });
      expect(tick(turned, answers(0)).snake[0]).toEqual({ x: 19, y: 11 });
    });

    it("pause still works", () => {
      expect(togglePause(waiting).status).toBe("paused");
    });
  });
});

describe("free directions after a shielded crash (docs/SPEC.md 2.12 (5))", () => {
  // Adam's game of 2026-11-10 08:26: going up a column, an obstacle right of the head, Right taken.
  const column: Cell[] = [
    { x: 12, y: 2 },
    { x: 12, y: 3 },
    { x: 12, y: 4 },
    { x: 12, y: 5 },
  ];
  const up = special(
    { turns: 14, timeMs: 7000 },
    { snake: column, heading: "up", obstacles: [{ x: 13, y: 2 }], food: { x: 0, y: 19 } },
  );
  const crashed = tick(turn(up, "right"), answers(0));

  it("the crash leaves the snake waiting, heading right, with up and left free", () => {
    expect(crashed.status).toBe("running");
    expect(crashed.run?.waiting).toBe(true);
    expect(crashed.heading).toBe("right");
    expect(freeDirections(crashed)).toEqual(["up", "left"]);
  });

  it("left, the opposite of the heading, is free and ends the wait", () => {
    const turned = turn(crashed, "left");
    expect(turned.heading).toBe("left");
    expect(turned.run?.waiting).toBe(false);
    expect(tick(turned, answers(0)).snake[0]).toEqual({ x: 11, y: 2 });
  });

  it("up ends the wait", () => {
    expect(tick(turn(crashed, "up"), answers(0)).snake[0]).toEqual({ x: 12, y: 1 });
  });

  it.each(["down", "right"] as const)("%s (the neck or the obstacle) is ignored", (d) => {
    expect(turn(crashed, d)).toBe(crashed);
  });

  it("the tail's cell is free, as the tail moves on; the dot's cell is free", () => {
    // A square: head (5,5), then (6,5), (6,6), tail (5,6) below the head; the dot left of the head.
    const square: Cell[] = [
      { x: 5, y: 5 },
      { x: 6, y: 5 },
      { x: 6, y: 6 },
      { x: 5, y: 6 },
    ];
    const state = special(
      { shieldUsed: 1, waiting: true },
      { snake: square, heading: "up", food: { x: 4, y: 5 }, obstacles: [{ x: 5, y: 4 }] },
    );
    expect(freeDirections(state)).toEqual(["down", "left"]);
  });

  it("a snake on one cell (stacked) has every direction free but the one it crashed into", () => {
    const stacked: Cell[] = [
      { x: 5, y: 5 },
      { x: 5, y: 5 },
      { x: 5, y: 5 },
    ];
    const state = special(
      { shieldUsed: 1, waiting: true },
      { snake: stacked, heading: "right", obstacles: [{ x: 6, y: 5 }] },
    );
    expect(freeDirections(state)).toEqual(["up", "down", "left"]);
  });

  it("a crash that leaves no free direction ends the game as boxed in, with the layer used", () => {
    // Head in the top-left corner heading up, the neck below it, an obstacle to its right.
    const corner: Cell[] = [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: 2 },
    ];
    const state = special({}, { snake: corner, heading: "up", obstacles: [{ x: 1, y: 0 }] });
    const next = tick(state, answers(0));
    expect(next.status).toBe("over");
    expect(next.ended).toBe("boxed");
    expect(next.snake).toEqual(corner);
    expect(next.run?.shieldUsed).toBe(1);
  });
});

describe("the obstacles' jumps (docs/SPEC.md 2.12 (9))", () => {
  const two: Cell[] = [
    { x: 0, y: 19 },
    { x: 1, y: 19 },
  ];

  it("all obstacles jump when the time passes a multiple of 3 s, never onto the snake, the dot or the 2 cells ahead", () => {
    const choose = answers(0);
    const next = tick(special({ timeMs: 3000 - LEVEL_5_DELAY }, { obstacles: two }), choose);
    // After the move: the snake on (11,10), (10,10), (9,10), the dot on (0,0), and (12,10) and
    // (13,10) ahead. Index 0 of the cells left is (1,0), then (2,0).
    expect(next.obstacles).toEqual([
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ]);
    expect(choose.counts).toEqual([394, 393]);
  });

  it("the old obstacle cells may be picked again", () => {
    // Index 375 of the 394 cells left is (1,19); then index 374 of the 393 is (0,19).
    const next = tick(special({ timeMs: 2999 }, { obstacles: two }), answers(375, 374));
    expect(next.obstacles).toEqual([
      { x: 1, y: 19 },
      { x: 0, y: 19 },
    ]);
  });

  it("they jump again at 6 s", () => {
    const next = tick(special({ timeMs: 6000 - 1 }, { obstacles: two }), answers(0));
    expect(next.obstacles).not.toEqual(two);
  });

  it.each([0, 2900, 3000, 3001])(
    "they do not jump in a tick from %i ms that passes no multiple of 3 s",
    (timeMs) => {
      const choose = answers(0);
      const next = tick(special({ timeMs }, { obstacles: two }), choose);
      expect(next.obstacles).toEqual(two);
      expect(choose.counts).toEqual([]);
    },
  );

  it("they do not jump in the tick that blows the snake up at 30 s (a multiple of 3 s)", () => {
    const choose = answers(0);
    const next = tick(special({ timeMs: 30000 - LEVEL_5_DELAY }, { obstacles: two }), choose);
    expect(next.status).toBe("blown");
    expect(next.obstacles).toEqual(two);
    expect(choose.counts).toEqual([]);
  });

  it("cells ahead of the head that lie off the board leave no cell out", () => {
    // The head moves onto (19,10): the 2 cells ahead are off the board. Index 216 of the 396 cells
    // left (400, less the 3 snake cells and the dot) is (0,11), and then (1,11) of the 395.
    const choose = answers(216, 216);
    const next = tick(special({ timeMs: 2999 }, { snake: shifted(8), obstacles: two }), choose);
    expect(next.snake[0]).toEqual({ x: 19, y: 10 });
    expect(choose.counts).toEqual([396, 395]);
    expect(next.obstacles).toEqual([
      { x: 0, y: 11 },
      { x: 1, y: 11 },
    ]);
  });

  it("they jump when exactly as many cells are left as there are obstacles", () => {
    // A 4 x 4 board: the snake on (0,0) heading right, the dot on (3,3), obstacles on every cell
    // but (0,0), (1,0), (3,2) and (3,3): 12 of them. After the move, 16 - 1 - 1 - 2 = 12 cells.
    const obstacles: Cell[] = [];
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        if (!(y === 0 && x <= 1) && !(x === 3 && y >= 2)) obstacles.push({ x, y });
      }
    }
    const state = special(
      { timeMs: 2999 },
      { size: 4, snake: [{ x: 0, y: 0 }], food: { x: 3, y: 3 }, obstacles },
    );
    const choose = answers(0);
    const next = tick(state, choose);
    expect(choose.counts).toEqual([12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
    expect(next.obstacles).toEqual([
      { x: 0, y: 0 },
      ...[0, 1, 2, 3].map((x) => ({ x, y: 1 })),
      ...[0, 1, 2, 3].map((x) => ({ x, y: 2 })),
      ...[0, 1, 2].map((x) => ({ x, y: 3 })),
    ]);
  });

  it("they stay where they are when fewer cells are left than obstacles", () => {
    // A 4 x 4 board: the snake on (0,0) heading right, the dot on (3,3), obstacles everywhere else
    // but (1,0). After the move, 16 - 1 (snake) - 1 (dot) - 2 (ahead) = 12 cells for 13 obstacles.
    const obstacles: Cell[] = [];
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        if (!(y === 0 && x <= 1) && !(x === 3 && y === 3)) obstacles.push({ x, y });
      }
    }
    const state = special(
      { timeMs: 2999 },
      { size: 4, snake: [{ x: 0, y: 0 }], food: { x: 3, y: 3 }, obstacles },
    );
    const choose = answers(0);
    const next = tick(state, choose);
    expect(next.snake).toEqual([{ x: 1, y: 0 }]);
    expect(next.obstacles).toEqual(obstacles);
    expect(choose.counts).toEqual([]);
  });

  it("they do not jump in the tick that clears the level", () => {
    const state = special(
      { timeMs: 2999 },
      { obstacles: two, food: { x: 11, y: 10 }, dotsEaten: 4 },
    );
    const next = tick(state, answers(CENTRE_RIGHT, 0));
    expect(next.level).toBe(6);
    expect(next.obstacles).toHaveLength(5);
  });

  it("the dot is placed before the obstacles jump, in the same tick", () => {
    const choose = answers(0);
    const next = tick(
      special({ timeMs: 2999 }, { obstacles: two, food: { x: 11, y: 10 } }),
      choose,
    );
    expect(next.food).toEqual({ x: 0, y: 0 });
    expect(next.obstacles).toEqual([
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ]);
    expect(choose.counts).toEqual([394, 393, 392]);
  });
});

describe("blown (docs/SPEC.md 2.5, 2.8)", () => {
  const blown = special({}, { status: "blown" });
  it("ignores turns, ticks, Start and pause", () => {
    expect(turn(blown, "up")).toBe(blown);
    expect(tick(blown, answers(0))).toBe(blown);
    expect(start(blown)).toBe(blown);
    expect(togglePause(blown)).toBe(blown);
  });
});
