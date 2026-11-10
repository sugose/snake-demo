import {
  type Cell,
  type Chooser,
  type Direction,
  type GameState,
  levelDelay,
  newGame,
  pauseIfRunning,
  type Status,
  start,
  tick,
  togglePause,
  turn,
} from "./game";

// The spec's values (docs/SPEC.md 2.1, 2.10, 2.11, 3); the module takes them as parameters.
const SIZE = 20;
const START_LENGTH = 3;
const CLEAR_AHEAD = 8;
const DOTS_PER_LEVEL = 5;
const RULES = {
  size: SIZE,
  startLength: START_LENGTH,
  clearAhead: CLEAR_AHEAD,
  dotsPerLevel: DOTS_PER_LEVEL,
};
const DELAYS = { first: 125, step: 5, shortest: 50 };

// The starts of a 20 x 20 board with 8 clear cells ahead (docs/SPEC.md 2.11 (2)). A cell has up
// when y >= 8, right when x <= 11, down when y <= 11 and left when x >= 8. Rows 0 to 7 and 12 to 19
// have 44 starts each, rows 8 to 11 have 64: 960 in all. Before (10,10) come rows 0 to 9
// (8 x 44 + 2 x 64 = 480) and (0..9,10) (10 x 3 + 2 for left at x 8 and 9 = 32): 512. Within
// (10,10) the order is up, right, down, left.
const STARTS = 960;
const CENTRE_UP = 512;
const CENTRE_RIGHT = 513;

const CENTRE: Cell = { x: 10, y: 10 };

/** `count` segments, all on `cell`: the snake of a freshly laid-out level. */
function stacked(cell: Cell, count: number): Cell[] {
  return Array.from({ length: count }, () => ({ ...cell }));
}

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
  return Object.freeze(state);
}

/** A new game at the centre heading right, the dot at (0,0), with `overrides` on top. */
function game(overrides: Partial<GameState> = {}): GameState {
  return frozen({
    ...newGame({ ...RULES, choose: answers(CENTRE_RIGHT, 0) }),
    ...overrides,
  });
}

/** A snake laid out in a line, head at the centre, body to its left. */
const LINE: Cell[] = [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 },
];

describe("newGame", () => {
  it("starts at level 1 in ready, score 0, no dots eaten, no obstacles, every segment on the start cell", () => {
    const state = newGame({ ...RULES, choose: answers(CENTRE_RIGHT, 0) });
    expect(state).toEqual({
      size: 20,
      clearAhead: 8,
      dotsPerLevel: 5,
      snake: stacked(CENTRE, 3),
      heading: "right",
      queue: [],
      food: { x: 0, y: 0 },
      obstacles: [],
      level: 1,
      dotsEaten: 0,
      score: 0,
      status: "ready",
      special: null,
      run: null,
      ended: null,
      crashed: null,
      cleared: null,
    });
  });

  it("asks the one chooser for the start, then the dot: 960 starts, then 399 free cells", () => {
    const choose = answers(CENTRE_RIGHT, 0);
    newGame({ ...RULES, choose });
    expect(choose.counts).toEqual([STARTS, 399]);
  });

  it.each<[number, Cell, Direction]>([
    [0, { x: 0, y: 0 }, "right"],
    [1, { x: 0, y: 0 }, "down"],
    [CENTRE_UP, CENTRE, "up"],
    [CENTRE_RIGHT, CENTRE, "right"],
    [STARTS - 1, { x: 19, y: 19 }, "left"],
  ])("start %i is the cell %o heading %s", (index, cell, heading) => {
    const state = newGame({ ...RULES, choose: answers(index, 0) });
    expect(state.snake).toEqual(stacked(cell, 3));
    expect(state.heading).toBe(heading);
  });

  it("lists every start of a 9 x 9 board row by row, and up, right, down, left within a cell", () => {
    const expected: Array<[Cell, Direction]> = [];
    const add = (x: number, y: number, ...headings: Direction[]) => {
      for (const heading of headings) expected.push([{ x, y }, heading]);
    };
    add(0, 0, "right", "down");
    for (let x = 1; x <= 7; x++) add(x, 0, "down");
    add(8, 0, "down", "left");
    for (let y = 1; y <= 7; y++) {
      add(0, y, "right");
      add(8, y, "left");
    }
    add(0, 8, "up", "right");
    for (let x = 1; x <= 7; x++) add(x, 8, "up");
    add(8, 8, "up", "left");
    expect(expected).toHaveLength(36);

    expected.forEach(([cell, heading], index) => {
      const choose = answers(index, 0);
      const state = newGame({ size: 9, startLength: 1, clearAhead: 8, dotsPerLevel: 5, choose });
      expect([state.snake, state.heading]).toEqual([[cell], heading]);
      expect(choose.counts).toEqual([36, 80]);
    });
  });

  it("puts the 8 cells ahead of every start of a 20 x 20 board on the board", () => {
    const step: Record<Direction, Cell> = {
      up: { x: 0, y: -1 },
      right: { x: 1, y: 0 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
    };
    for (let index = 0; index < STARTS; index++) {
      const { snake, heading } = newGame({ ...RULES, choose: answers(index, 0) });
      const head = snake[0] ?? { x: -1, y: -1 };
      const far = { x: head.x + 8 * step[heading].x, y: head.y + 8 * step[heading].y };
      expect([index, far.x >= 0 && far.x < 20 && far.y >= 0 && far.y < 20]).toEqual([index, true]);
    }
  });

  it.each<[number, Cell]>([
    [0, { x: 0, y: 0 }],
    [19, { x: 19, y: 0 }],
    [20, { x: 0, y: 1 }],
    [209, { x: 9, y: 10 }],
    [210, { x: 11, y: 10 }],
    [398, { x: 19, y: 19 }],
  ])("places the dot on free cell %i, counted row by row past the snake's cell", (index, food) => {
    expect(newGame({ ...RULES, choose: answers(CENTRE_RIGHT, index) }).food).toEqual(food);
  });

  it("may put the dot on one of the cells ahead of the start", () => {
    // Start (0,0) heading right; the first free cell is (1,0), the first cell ahead.
    expect(newGame({ ...RULES, choose: answers(0, 0) }).food).toEqual({ x: 1, y: 0 });
  });

  it("accepts a start length of size x size - 1: 399 on a 20 x 20 board", () => {
    const state = newGame({ ...RULES, startLength: 399, choose: answers(CENTRE_RIGHT, 0) });
    expect(state.snake).toEqual(stacked(CENTRE, 399));
  });

  it("rejects a board too small for a start: 8 x 8 with 8 cells ahead", () => {
    expect(() => newGame({ ...RULES, size: 8, choose: answers(0) })).toThrow(RangeError);
  });

  it.each([0, -2, 2.5])("throws a RangeError for board size %p", (size) => {
    expect(() => newGame({ ...RULES, size, choose: answers(0) })).toThrow(RangeError);
  });

  it.each([0, -1, 1.5, 400])("throws a RangeError for start length %p", (startLength) => {
    expect(() => newGame({ ...RULES, startLength, choose: answers(0) })).toThrow(RangeError);
  });

  it.each([-1, 1.5])("throws a RangeError for clear cells ahead %p", (clearAhead) => {
    expect(() => newGame({ ...RULES, clearAhead, choose: answers(0) })).toThrow(RangeError);
  });

  it.each([0, -1, 2.5])("throws a RangeError for dots per level %p", (dotsPerLevel) => {
    expect(() => newGame({ ...RULES, dotsPerLevel, choose: answers(0) })).toThrow(RangeError);
  });

  it.each([-1, STARTS, 1.5, Number.NaN])(
    "throws a RangeError when the chooser returns %p for the start",
    (index) => {
      expect(() => newGame({ ...RULES, choose: answers(index, 0) })).toThrow(RangeError);
    },
  );

  it.each([-1, 399, 0.5, Number.NaN])(
    "throws a RangeError when the chooser returns %p for the dot",
    (index) => {
      expect(() => newGame({ ...RULES, choose: answers(CENTRE_RIGHT, index) })).toThrow(RangeError);
    },
  );
});

describe("turn", () => {
  describe("in ready", () => {
    it.each<Direction>(["up", "down", "right"])(
      "a turn %s starts the game with that heading, nothing moves",
      (direction) => {
        const before = game();
        expect(turn(before, direction)).toEqual({
          ...before,
          heading: direction,
          status: "running",
        });
      },
    );

    it("a turn opposite to the heading, right, is ignored", () => {
      const before = game();
      expect(turn(before, "left")).toBe(before);
    });

    it("a turn opposite to any other heading is ignored too: down while heading up", () => {
      const before = game({ heading: "up" });
      expect(turn(before, "down")).toBe(before);
      expect(turn(before, "left")).toEqual({ ...before, heading: "left", status: "running" });
    });

    describe("a turn whose next cell is a wall or an obstacle is ignored (docs/SPEC.md 2.1 (3))", () => {
      it.each<[string, Cell, Direction, Direction, Direction]>([
        ["the right wall", { x: 19, y: 10 }, "up", "right", "left"],
        ["the left wall", { x: 0, y: 10 }, "down", "left", "right"],
        ["the top wall", { x: 10, y: 0 }, "left", "up", "down"],
        ["the bottom wall", { x: 10, y: 19 }, "right", "down", "up"],
      ])(
        "on %s, a turn into it is ignored and the other side starts",
        (_, cell, heading, into, away) => {
          const before = game({ snake: stacked(cell, 3), heading });
          expect(turn(before, into)).toBe(before);
          expect(turn(before, away)).toEqual({ ...before, heading: away, status: "running" });
          expect(turn(before, heading)).toEqual({ ...before, status: "running" });
        },
      );

      it("a turn onto an obstacle is ignored; the dot does not count as one", () => {
        const before = game({ obstacles: [{ x: 10, y: 9 }], food: { x: 10, y: 11 } });
        expect(turn(before, "up")).toBe(before);
        expect(turn(before, "down")).toEqual({ ...before, heading: "down", status: "running" });
      });

      it("the Start button still starts in the heading it has", () => {
        const before = game({ snake: stacked({ x: 19, y: 10 }, 3), heading: "up" });
        expect(start(before)).toEqual({ ...before, status: "running" });
      });
    });
  });

  describe("in running", () => {
    const running = (heading: Direction, queue: Direction[] = []) =>
      game({ status: "running", heading, queue });

    it("queues a turn at a right angle to the heading", () => {
      expect(turn(running("right"), "up").queue).toEqual(["up"]);
    });

    it("does not change the heading, the snake or the food", () => {
      const before = running("right");
      expect(turn(before, "up")).toEqual({ ...before, queue: ["up"] });
    });

    it.each<Direction>(["right", "left"])(
      "ignores a turn %s when heading right and nothing is queued",
      (direction) => {
        const before = running("right");
        expect(turn(before, direction)).toBe(before);
      },
    );

    it.each<Direction>(["up", "down"])(
      "checks against the last queued turn: %s after a queued up is ignored",
      (direction) => {
        const before = running("right", ["up"]);
        expect(turn(before, direction)).toBe(before);
      },
    );

    it("checks against the last queued turn, not the heading: left after a queued up is queued", () => {
      expect(turn(running("right", ["up"]), "left").queue).toEqual(["up", "left"]);
    });

    it("ignores a third turn while two are queued", () => {
      const before = running("right", ["up", "left"]);
      expect(turn(before, "down")).toBe(before);
    });
  });

  it.each<Status>(["paused", "over", "won"])("is ignored in %s", (status) => {
    const before = game({ status, heading: "right" });
    expect(turn(before, "up")).toBe(before);
  });

  it.each<[Status, string]>([
    ["ready", "north"],
    ["ready", "toString"],
    ["running", "north"],
    ["running", "toString"],
    ["running", ""],
  ])("in %s ignores %p, which is not one of the four directions", (status, value) => {
    const before = game({ status });
    expect(turn(before, value as Direction)).toBe(before);
  });
});

describe("start (the Start button)", () => {
  it.each<Direction>(["up", "down", "left", "right"])(
    "starts a ready game in the heading it has: %s",
    (heading) => {
      const before = game({ heading });
      expect(start(before)).toEqual({ ...before, heading, status: "running" });
    },
  );

  it.each<Status>(["running", "paused", "over", "won"])("is ignored in %s", (status) => {
    const before = game({ status, heading: "up" });
    expect(start(before)).toBe(before);
  });
});

describe("togglePause (Space, P, the Pause button)", () => {
  it("pauses a running game and keeps its queued turns", () => {
    const before = game({ status: "running", queue: ["up"] });
    expect(togglePause(before)).toEqual({ ...before, status: "paused" });
  });

  it("goes on with a paused game", () => {
    const before = game({ status: "paused", queue: ["up"] });
    expect(togglePause(before)).toEqual({ ...before, status: "running" });
  });

  it.each<Status>(["ready", "over", "won"])("is ignored in %s", (status) => {
    const before = game({ status });
    expect(togglePause(before)).toBe(before);
  });
});

describe("pauseIfRunning (the page is hidden)", () => {
  it("pauses a running game", () => {
    const before = game({ status: "running" });
    expect(pauseIfRunning(before)).toEqual({ ...before, status: "paused" });
  });

  it.each<Status>(["ready", "paused", "over", "won"])("leaves a game in %s as it is", (status) => {
    const before = game({ status });
    expect(pauseIfRunning(before)).toBe(before);
  });
});

describe("tick", () => {
  const running = (overrides: Partial<GameState> = {}) => game({ status: "running", ...overrides });

  it.each<Status>(["ready", "paused", "over", "won"])("does nothing in %s", (status) => {
    const choose = answers(0);
    const before = game({ status });
    expect(tick(before, choose)).toBe(before);
    expect(choose.counts).toEqual([]);
  });

  it("moves the snake one cell along the heading and drops the tail", () => {
    const choose = answers(0);
    const before = running({ snake: LINE });
    expect(tick(before, choose)).toEqual({
      ...before,
      snake: [
        { x: 11, y: 10 },
        { x: 10, y: 10 },
        { x: 9, y: 10 },
      ],
    });
    expect(choose.counts).toEqual([]);
  });

  it.each<[Direction, Cell]>([
    ["up", { x: 10, y: 9 }],
    ["down", { x: 10, y: 11 }],
    ["right", { x: 11, y: 10 }],
  ])("moves the head %s", (heading, head) => {
    expect(tick(running({ heading, snake: LINE }), answers(0)).snake[0]).toEqual(head);
  });

  it("moves the head left", () => {
    const snake = [
      { x: 10, y: 10 },
      { x: 11, y: 10 },
    ];
    expect(tick(running({ heading: "left", snake }), answers(0)).snake[0]).toEqual({
      x: 9,
      y: 10,
    });
  });

  it("takes one queued turn per tick, keeping the next for the next tick", () => {
    const once = tick(running({ snake: LINE, queue: ["up", "left"] }), answers(0));
    expect(once.heading).toBe("up");
    expect(once.queue).toEqual(["left"]);
    expect(once.snake[0]).toEqual({ x: 10, y: 9 });

    const twice = tick(frozen(once), answers(0));
    expect(twice.heading).toBe("left");
    expect(twice.queue).toEqual([]);
    expect(twice.snake[0]).toEqual({ x: 9, y: 9 });
  });

  it.each<[Direction, Cell]>([
    ["up", { x: 5, y: 0 }],
    ["down", { x: 5, y: 19 }],
    ["left", { x: 0, y: 5 }],
    ["right", { x: 19, y: 5 }],
  ])(
    "ends the game on the %s wall, leaving snake, food and score as they were",
    (heading, head) => {
      const choose = answers(0);
      const before = running({ heading, snake: [head], score: 7 });
      expect(tick(before, choose)).toEqual({ ...before, status: "over", ended: "wall" });
      expect(choose.counts).toEqual([]);
    },
  );

  it("ends the game when the head hits the body, leaving snake, food and score as they were", () => {
    // Head (5,5) heading down into (5,6), which is body, not the tail.
    const snake = [
      { x: 5, y: 5 },
      { x: 6, y: 5 },
      { x: 6, y: 6 },
      { x: 5, y: 6 },
      { x: 4, y: 6 },
    ];
    const before = running({ heading: "down", snake, score: 2 });
    expect(tick(before, answers(0))).toEqual({ ...before, status: "over", ended: "self" });
  });

  it("ends the game when the head hits an obstacle, leaving everything else as it was", () => {
    const choose = answers(0);
    const before = running({
      snake: LINE,
      obstacles: [{ x: 11, y: 10 }],
      level: 2,
      score: 6,
      dotsEaten: 1,
    });
    expect(tick(before, choose)).toEqual({ ...before, status: "over", ended: "obstacle" });
    expect(choose.counts).toEqual([]);
  });

  it("moves past an obstacle that is not in the way", () => {
    const before = running({ snake: LINE, obstacles: [{ x: 11, y: 9 }] });
    expect(tick(before, answers(0)).status).toBe("running");
  });

  describe("the tail cell", () => {
    // A square loop: head (5,5), tail (5,6); heading down puts the new head on the tail cell.
    const loop = [
      { x: 5, y: 5 },
      { x: 6, y: 5 },
      { x: 6, y: 6 },
      { x: 5, y: 6 },
    ];

    it("does not count when the snake does not eat, since the tail leaves it", () => {
      const after = tick(running({ heading: "down", snake: loop }), answers(0));
      expect(after.status).toBe("running");
      expect(after.snake).toEqual([
        { x: 5, y: 6 },
        { x: 5, y: 5 },
        { x: 6, y: 5 },
        { x: 6, y: 6 },
      ]);
    });

    it("counts when the snake eats (step 4 before step 5)", () => {
      // Food on the tail cell is reachable only in a constructed state; it pins the step order.
      const before = running({ heading: "down", snake: loop, food: { x: 5, y: 6 } });
      expect(tick(before, answers(0))).toEqual({ ...before, status: "over", ended: "self" });
    });
  });

  describe("a snake whose segments share a cell (docs/SPEC.md 2.11 (3))", () => {
    it("unrolls behind the head, reaching its full length after one tick less than it has segments: 2 for 3", () => {
      let state = running({ snake: stacked(CENTRE, 3), heading: "right" });
      state = tick(state, answers(0));
      expect(state.snake).toEqual([{ x: 11, y: 10 }, CENTRE, CENTRE]);
      state = tick(frozen(state), answers(0));
      expect(state.snake).toEqual([{ x: 12, y: 10 }, { x: 11, y: 10 }, CENTRE]);
      state = tick(frozen(state), answers(0));
      expect(state.snake).toEqual([
        { x: 13, y: 10 },
        { x: 12, y: 10 },
        { x: 11, y: 10 },
      ]);
    });

    /** Right, up, left, down: four ticks that bring the head back to the start cell. */
    function roundTheSquare(length: number): GameState {
      let state = running({ snake: stacked(CENTRE, length), heading: "right" });
      for (const next of ["up", "left", "down"] as const) {
        state = turn(frozen(tick(state, answers(0))), next);
      }
      return tick(frozen(state), answers(0));
    }

    it("counts segments, not cells: back on the start cell, a snake of 5 hits the one still there", () => {
      // Before the fourth tick: (10,9), (11,9), (11,10), (10,10), (10,10). The last leaves; one stays.
      const after = roundTheSquare(5);
      expect(after.status).toBe("over");
      expect(after.snake[0]).toEqual({ x: 10, y: 9 });
    });

    it("lets a snake of 4 back onto the start cell, since its last segment there leaves", () => {
      const after = roundTheSquare(4);
      expect(after.status).toBe("running");
      expect(after.snake[0]).toEqual(CENTRE);
    });
  });

  describe("eating", () => {
    const fed = (overrides: Partial<GameState> = {}) =>
      running({ snake: LINE, food: { x: 11, y: 10 }, ...overrides });

    it("grows the snake, keeps the tail, and adds one to the score and to the dots eaten", () => {
      const after = tick(fed({ score: 7, dotsEaten: 2 }), answers(0));
      expect(after.snake).toEqual([
        { x: 11, y: 10 },
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 },
      ]);
      expect(after.score).toBe(8);
      expect(after.dotsEaten).toBe(3);
      expect(after.level).toBe(1);
      expect(after.status).toBe("running");
    });

    it("gives the chooser the free cells after the move, without the obstacles, row by row", () => {
      // Free: 400 cells less 4 of snake and 1 obstacle. Rows 0 to 9 give indices 0 to 198
      // (the obstacle at (0,0) is skipped), (0..7,10) give 199 to 206, so 207 is (12,10).
      const choose = answers(207);
      const after = tick(fed({ obstacles: [{ x: 0, y: 0 }] }), choose);
      expect(choose.counts).toEqual([395]);
      expect(after.food).toEqual({ x: 12, y: 10 });
      expect(tick(fed({ obstacles: [{ x: 0, y: 0 }] }), answers(0)).food).toEqual({ x: 1, y: 0 });
    });

    it("counts the cells, not the segments, of a snake that shares a cell", () => {
      const choose = answers(0);
      tick(fed({ snake: stacked(CENTRE, 3) }), choose);
      // After the move: (11,10) and three segments on (10,10): two cells taken.
      expect(choose.counts).toEqual([398]);
    });

    it.each([-1, 396, 0.5, Number.NaN])(
      "throws a RangeError when the chooser returns %p",
      (index) => {
        expect(() => tick(fed(), () => index)).toThrow(RangeError);
      },
    );
  });

  it("throws a RangeError for a state whose snake has no cells", () => {
    expect(() => tick(running({ snake: [] }), answers(0))).toThrow(RangeError);
  });

  it("does not move the food when the snake does not eat", () => {
    const before = running({ snake: LINE, food: { x: 3, y: 3 } });
    expect(tick(before, answers(0)).food).toEqual({ x: 3, y: 3 });
  });

  it("wins when no free cell is left for the next dot, with no dot placed", () => {
    // Size 2: snake (1,1),(0,1),(0,0); the last free cell (1,0) holds the food.
    const choose = answers(0);
    const before = frozen({
      ...game(),
      size: 2,
      clearAhead: 1,
      snake: [
        { x: 1, y: 1 },
        { x: 0, y: 1 },
        { x: 0, y: 0 },
      ],
      heading: "up",
      food: { x: 1, y: 0 },
      dotsEaten: 1,
      score: 1,
      status: "running",
    });
    expect(tick(before, choose)).toEqual({
      ...before,
      snake: [
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
        { x: 0, y: 0 },
      ],
      food: null,
      dotsEaten: 2,
      score: 2,
      status: "won",
      ended: "full",
    });
    expect(choose.counts).toEqual([]);
  });
});

describe("clearing a level (docs/SPEC.md 2.2 step 7, 2.10, 2.11)", () => {
  /** A running game on `level` about to eat its last dot at (11,10), heading up with turns queued. */
  const lastDot = (overrides: Partial<GameState> = {}) =>
    game({
      status: "running",
      snake: LINE,
      heading: "up",
      queue: ["right", "down"],
      food: { x: 11, y: 10 },
      dotsEaten: 4,
      score: 9,
      ...overrides,
    });

  it("goes to the next level in ready, laid out anew, with the score counting on", () => {
    // Start (10,10) heading up; the obstacle is the first cell that is not the start or one of
    // (10,9) to (10,2): (0,0); the dot is the first free cell after it: (1,0).
    const choose = answers(CENTRE_UP, 0, 0);
    const before = lastDot();
    expect(tick(before, choose)).toEqual({
      ...before,
      snake: stacked(CENTRE, 4),
      heading: "up",
      queue: [],
      food: { x: 1, y: 0 },
      obstacles: [{ x: 0, y: 0 }],
      level: 2,
      dotsEaten: 0,
      score: 10,
      status: "ready",
    });
    // The start, then one obstacle from 400 - 9 cells, then the dot from 400 - 2 cells.
    expect(choose.counts).toEqual([STARTS, 391, 398]);
  });

  it("clears after the number of dots it is given, not a fixed 5", () => {
    const before = lastDot({ dotsPerLevel: 2, dotsEaten: 1 });
    expect(tick(before, answers(CENTRE_UP, 0, 0)).level).toBe(2);
    expect(tick(lastDot({ dotsEaten: 3 }), answers(0)).level).toBe(1);
  });

  it("gives level N N - 1 obstacles, never on the start or the 8 cells ahead, and the dot on none", () => {
    // Level 3 cleared: level 4, 3 obstacles. Start (0,0) heading right keeps (0..8,0) clear, so
    // obstacle answer 0 gives (9,0), (10,0), (11,0). Dot answer 8 skips them: (1..8,0) are 0 to 7,
    // (12,0) is 8.
    const choose = answers(0, 0, 0, 0, 8);
    const after = tick(lastDot({ level: 3 }), choose);
    expect(after.level).toBe(4);
    expect(after.snake).toEqual(stacked({ x: 0, y: 0 }, 4));
    expect(after.heading).toBe("right");
    expect(after.obstacles).toEqual([
      { x: 9, y: 0 },
      { x: 10, y: 0 },
      { x: 11, y: 0 },
    ]);
    expect(after.food).toEqual({ x: 12, y: 0 });
    expect(choose.counts).toEqual([STARTS, 391, 390, 389, 396]);
  });

  it("picks each obstacle from the free cells row by row, past the start, the cells ahead and earlier obstacles", () => {
    // Start (0,0) right; row 0 has (9..19,0) free, indices 0 to 10, so 11 is (0,1), and then,
    // with (0,1) taken, (1,1).
    const choose = answers(0, 11, 11, 0);
    const after = tick(lastDot({ level: 2 }), choose);
    expect(after.obstacles).toEqual([
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ]);
    expect(choose.counts).toEqual([STARTS, 391, 390, 397]);
  });

  it("waits in ready: a tick does nothing, a turn opposite to the heading is ignored, Start starts", () => {
    const cleared = frozen(tick(lastDot(), answers(CENTRE_UP, 0, 0)));
    expect(tick(cleared, answers(0))).toBe(cleared);
    expect(turn(cleared, "down")).toBe(cleared);
    expect(start(cleared)).toEqual({ ...cleared, status: "running" });
  });

  it.each<[string, number[]]>([
    ["the start", [-1, 0, 0]],
    ["the start", [STARTS, 0, 0]],
    ["the start", [1.5, 0, 0]],
    ["an obstacle", [CENTRE_UP, -1, 0]],
    ["an obstacle", [CENTRE_UP, 391, 0]],
    ["an obstacle", [CENTRE_UP, Number.NaN, 0]],
    ["the dot", [CENTRE_UP, 0, 398]],
    ["the dot", [CENTRE_UP, 0, 0.5]],
  ])("throws a RangeError when the chooser's answer for %s is out of range: %p", (_, given) => {
    expect(() => tick(lastDot(), answers(...given))).toThrow(RangeError);
  });

  describe("when not enough cells are left for the next level", () => {
    it("wins when the 5th dot fills the board, with the level, the score and the snake as they were", () => {
      // Size 2, 2 dots a level: the last free cell (1,0) holds the 2nd dot. Level 2 would need
      // 1 obstacle, 1 dot and 4 segments: 6 cells of 4.
      const choose = answers(0);
      const before = frozen({
        ...game(),
        size: 2,
        clearAhead: 1,
        dotsPerLevel: 2,
        snake: [
          { x: 1, y: 1 },
          { x: 0, y: 1 },
          { x: 0, y: 0 },
        ],
        heading: "up",
        food: { x: 1, y: 0 },
        dotsEaten: 1,
        score: 1,
        status: "running",
      });
      expect(tick(before, choose)).toEqual({
        ...before,
        snake: [
          { x: 1, y: 0 },
          { x: 1, y: 1 },
          { x: 0, y: 1 },
          { x: 0, y: 0 },
        ],
        food: null,
        obstacles: [],
        level: 1,
        dotsEaten: 2,
        score: 2,
        status: "won",
        ended: "noRoom",
      });
      expect(choose.counts).toEqual([]);
    });

    /** A 3 x 3 board, 1 cell ahead: level 2's last dot at (0,0), eaten by a snake of `length`. */
    function smallBoard(length: number): GameState {
      const path = [
        { x: 0, y: 1 },
        { x: 0, y: 2 },
        { x: 1, y: 2 },
        { x: 2, y: 2 },
        { x: 2, y: 1 },
        { x: 1, y: 1 },
      ];
      return frozen({
        ...game(),
        size: 3,
        clearAhead: 1,
        snake: path.slice(0, length),
        heading: "up",
        food: { x: 0, y: 0 },
        obstacles: [{ x: 2, y: 0 }],
        level: 2,
        dotsEaten: 4,
        score: 9,
        status: "running",
      });
    }

    it("lays out the next level when the obstacles, the dot and the snake fit exactly", () => {
      // Level 3: 2 obstacles, 1 dot and 6 segments make 9 cells of 9. On 3 x 3 with 1 cell ahead
      // there are 24 starts; 0 is (0,0) right, keeping (1,0) clear. Obstacles: (2,0), then (0,1).
      const choose = answers(0);
      const after = tick(smallBoard(5), choose);
      expect(after).toMatchObject({
        status: "ready",
        level: 3,
        snake: stacked({ x: 0, y: 0 }, 6),
        heading: "right",
        obstacles: [
          { x: 2, y: 0 },
          { x: 0, y: 1 },
        ],
        food: { x: 1, y: 0 },
        score: 10,
      });
      expect(choose.counts).toEqual([24, 7, 6, 6]);
    });

    it("wins when the snake is one segment longer, with no obstacles or dot", () => {
      const choose = answers(0);
      const before = smallBoard(6);
      const after = tick(before, choose);
      expect(after).toEqual({
        ...before,
        snake: [{ x: 0, y: 0 }, ...before.snake],
        food: null,
        obstacles: [],
        level: 2,
        dotsEaten: 5,
        score: 10,
        queue: [],
        status: "won",
        ended: "noRoom",
      });
      expect(choose.counts).toEqual([]);
    });

    it("wins with no queued turns, though a turn is still queued when the last dot is eaten", () => {
      // Heading left with up and right queued: the tick takes up into the dot at (0,0), leaving
      // right in the queue of the eaten state.
      const before = frozen({ ...smallBoard(6), heading: "left", queue: ["up", "right"] });
      const after = tick(before, answers(0));
      expect(after).toMatchObject({
        status: "won",
        ended: "noRoom",
        heading: "up",
        level: 2,
        score: 10,
      });
      expect(after.queue).toEqual([]);
    });

    /** A 9 x 9 board (the smallest with 8 cells ahead) about to clear `level`, snake of 3. */
    function crowded(level: number): GameState {
      return frozen({
        ...game(),
        size: 9,
        snake: [
          { x: 4, y: 4 },
          { x: 3, y: 4 },
          { x: 2, y: 4 },
        ],
        heading: "right",
        food: { x: 5, y: 4 },
        level,
        dotsEaten: 4,
        status: "running",
      });
    }

    it("lays out the next level when its obstacles exactly fill the cells off the start and its 8 cells ahead", () => {
      // Level 73: 72 obstacles fill all 81 cells but (0..8,0); the dot goes on a cell ahead.
      const choose = answers(0);
      const after = tick(crowded(72), choose);
      expect(after.status).toBe("ready");
      expect(after.obstacles).toHaveLength(72);
      expect(after.food).toEqual({ x: 1, y: 0 });
      expect(choose.counts).toEqual([36, ...Array.from({ length: 72 }, (_, i) => 72 - i), 8]);
    });

    it("wins when there are more obstacles than cells off the start and its 8 cells ahead", () => {
      // Level 76: 75 obstacles, 1 dot and 4 segments are 80 of 81 cells, but only 72 cells may
      // hold an obstacle.
      const choose = answers(0);
      const after = tick(crowded(75), choose);
      expect(after).toMatchObject({
        status: "won",
        ended: "noRoom",
        level: 75,
        obstacles: [],
        food: null,
      });
      expect(choose.counts).toEqual([]);
    });
  });
});

describe("levelDelay (docs/SPEC.md 2.10 (2))", () => {
  it.each([
    [1, 125],
    [2, 120],
    [3, 115],
    [15, 55],
    [16, 50],
    [17, 50],
    [100, 50],
  ])("level %i ticks every %i ms", (level, delay) => {
    expect(levelDelay(level, DELAYS)).toBe(delay);
  });

  it("uses the first delay, the step and the shortest delay it is given", () => {
    const delays = { first: 200, step: 20, shortest: 100 };
    expect(levelDelay(1, delays)).toBe(200);
    expect(levelDelay(3, delays)).toBe(160);
    expect(levelDelay(10, delays)).toBe(100);
  });

  it.each([0, -1, 1.5, Number.NaN])("throws a RangeError for level %p", (level) => {
    expect(() => levelDelay(level, DELAYS)).toThrow(RangeError);
  });
});

describe("a whole game through the commands", () => {
  it("plays a 2 x 2 board from a new game to a win", () => {
    // 2 x 2 with 1 cell ahead has 8 starts; 4 is (0,1) heading up. The dot goes on the first free
    // cell each time: (0,0), then (1,0), then (1,1).
    const choose = answers(4, 0);
    let state = newGame({ size: 2, startLength: 2, clearAhead: 1, dotsPerLevel: 5, choose });
    expect(state.snake).toEqual(stacked({ x: 0, y: 1 }, 2));
    expect(state.food).toEqual({ x: 0, y: 0 });

    state = turn(frozen(state), "up");
    expect(state.status).toBe("running");
    state = tick(frozen(state), choose); // eats at (0,0)
    expect(state.food).toEqual({ x: 1, y: 0 });
    state = turn(frozen(state), "right");
    state = tick(frozen(state), choose); // eats at (1,0)
    state = turn(frozen(state), "down");
    state = tick(frozen(state), choose); // eats at (1,1): no free cell is left

    expect(state.status).toBe("won");
    expect(state.score).toBe(3);
    expect(state.food).toBeNull();
    expect(choose.counts).toEqual([8, 3, 2, 1]);
    expect(tick(frozen(state), choose)).toBe(state);
  });

  it("clears level 1 with 5 dots straight ahead and goes on scoring on level 2", () => {
    // Level 1 starts at (10,10) heading right; dot k lies at (10 + k, 10), index 210 of 400 - k
    // free cells. Level 2 starts at (10,10) heading up, its obstacle on (0,0) and its dot on
    // (10,9), index 9 x 20 + 10 - 1 = 189.
    const choose = answers(CENTRE_RIGHT, 210, 210, 210, 210, 210, CENTRE_UP, 0, 189);
    let state = start(newGame({ ...RULES, choose }));
    for (let dot = 1; dot <= 5; dot++) {
      state = tick(frozen(state), choose);
      expect(state.score).toBe(dot);
    }
    expect(state).toMatchObject({
      level: 2,
      status: "ready",
      score: 5,
      dotsEaten: 0,
      snake: stacked(CENTRE, 8),
      obstacles: [{ x: 0, y: 0 }],
      food: { x: 10, y: 9 },
    });
    state = tick(frozen(start(frozen(state))), choose);
    expect(state).toMatchObject({ level: 2, score: 6, dotsEaten: 1, status: "running" });
    expect(choose.counts).toEqual([STARTS, 399, 398, 397, 396, 395, STARTS, 391, 398, 397]);
  });

  it("starts afresh with newGame after a lost game", () => {
    const lost = game({ status: "over", score: 5, queue: ["up"], level: 3 });
    const again = newGame({ ...RULES, size: lost.size, choose: answers(CENTRE_RIGHT, 0) });
    expect(again).toEqual(game());
  });
});
