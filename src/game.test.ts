import {
  type Cell,
  type Direction,
  type FoodChooser,
  type GameState,
  newGame,
  pauseIfRunning,
  type Status,
  start,
  tick,
  togglePause,
  turn,
} from "./game";

// The spec's values (docs/SPEC.md 2.1); the module takes them as parameters.
const SIZE = 20;
const START_LENGTH = 3;

const first: FoodChooser = () => 0;

/** A chooser that always returns `index` and records every free count it is given. */
function recording(index: number): FoodChooser & { counts: number[] } {
  const counts: number[] = [];
  const choose = (freeCount: number): number => {
    counts.push(freeCount);
    return index;
  };
  return Object.assign(choose, { counts });
}

/** Freezes a state and everything in it, so a function that mutates its argument throws. */
function frozen(state: GameState): GameState {
  for (const cell of state.snake) Object.freeze(cell);
  Object.freeze(state.snake);
  Object.freeze(state.queue);
  if (state.food) Object.freeze(state.food);
  return Object.freeze(state);
}

function game(overrides: Partial<GameState> = {}): GameState {
  return frozen({
    ...newGame({ size: SIZE, startLength: START_LENGTH, choose: first }),
    ...overrides,
  });
}

const START_SNAKE: Cell[] = [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 },
];

describe("newGame", () => {
  it("starts ready, 3 cells long, head at the centre, body to its left, heading right, score 0", () => {
    const state = newGame({ size: SIZE, startLength: START_LENGTH, choose: first });
    expect(state).toEqual({
      size: 20,
      snake: START_SNAKE,
      heading: "right",
      queue: [],
      food: { x: 0, y: 0 },
      score: 0,
      status: "ready",
    });
  });

  it("rounds the centre down on an odd board", () => {
    const state = newGame({ size: 5, startLength: 3, choose: first });
    expect(state.snake).toEqual([
      { x: 2, y: 2 },
      { x: 1, y: 2 },
      { x: 0, y: 2 },
    ]);
  });

  it("gives the chooser the number of free cells, once", () => {
    const choose = recording(0);
    newGame({ size: SIZE, startLength: START_LENGTH, choose });
    expect(choose.counts).toEqual([397]);
  });

  it.each<[number, Cell]>([
    [0, { x: 0, y: 0 }],
    [19, { x: 19, y: 0 }],
    [20, { x: 0, y: 1 }],
    [207, { x: 7, y: 10 }],
    [208, { x: 11, y: 10 }],
    [396, { x: 19, y: 19 }],
  ])("places the food on free cell %i, counted row by row past the snake", (index, food) => {
    expect(newGame({ size: SIZE, startLength: START_LENGTH, choose: () => index }).food).toEqual(
      food,
    );
  });

  it("accepts the longest snake that fits, its tail at the left wall", () => {
    const state = newGame({ size: SIZE, startLength: 11, choose: first });
    expect(state.snake).toHaveLength(11);
    expect(state.snake[10]).toEqual({ x: 0, y: 10 });
  });

  it.each([0, -1, 1.5, 12])("throws a RangeError for start length %p", (startLength) => {
    expect(() => newGame({ size: SIZE, startLength, choose: first })).toThrow(RangeError);
  });

  it.each([0, -2, 2.5])("throws a RangeError for board size %p", (size) => {
    expect(() => newGame({ size, startLength: 1, choose: first })).toThrow(RangeError);
  });

  it("throws a RangeError when the snake leaves no free cell for the food", () => {
    expect(() => newGame({ size: 1, startLength: 1, choose: first })).toThrow(RangeError);
  });

  it.each([-1, 397, 1.5, Number.NaN])(
    "throws a RangeError when the chooser returns %p",
    (index) => {
      expect(() => newGame({ size: SIZE, startLength: START_LENGTH, choose: () => index })).toThrow(
        RangeError,
      );
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

    it("a turn left, back into the neck, is ignored", () => {
      const before = game();
      expect(turn(before, "left")).toBe(before);
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
  it("starts a ready game heading right", () => {
    const before = game();
    expect(start(before)).toEqual({ ...before, heading: "right", status: "running" });
  });

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
    const choose = recording(0);
    const before = game({ status });
    expect(tick(before, choose)).toBe(before);
    expect(choose.counts).toEqual([]);
  });

  it("moves the snake one cell along the heading and drops the tail", () => {
    const choose = recording(0);
    const before = running();
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
    expect(tick(running({ heading }), first).snake[0]).toEqual(head);
  });

  it("moves the head left", () => {
    const snake = [
      { x: 10, y: 10 },
      { x: 11, y: 10 },
    ];
    expect(tick(running({ heading: "left", snake }), first).snake[0]).toEqual({ x: 9, y: 10 });
  });

  it("takes one queued turn per tick, keeping the next for the next tick", () => {
    const once = tick(running({ queue: ["up", "left"] }), first);
    expect(once.heading).toBe("up");
    expect(once.queue).toEqual(["left"]);
    expect(once.snake[0]).toEqual({ x: 10, y: 9 });

    const twice = tick(frozen(once), first);
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
      const choose = recording(0);
      const before = running({ heading, snake: [head], score: 7 });
      expect(tick(before, choose)).toEqual({ ...before, status: "over" });
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
    expect(tick(before, first)).toEqual({ ...before, status: "over" });
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
      const after = tick(running({ heading: "down", snake: loop }), first);
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
      expect(tick(before, first)).toEqual({ ...before, status: "over" });
    });
  });

  describe("eating", () => {
    // newGame with index 208 puts the food at (11,10), right in front of the head.
    const fed = () =>
      frozen(start(newGame({ size: SIZE, startLength: START_LENGTH, choose: () => 208 })));

    it("grows the snake, keeps the tail and adds one to the score", () => {
      const after = tick(fed(), () => 0);
      expect(after.snake).toEqual([
        { x: 11, y: 10 },
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 },
      ]);
      expect(after.score).toBe(1);
      expect(after.status).toBe("running");
    });

    it("gives the chooser the free cells after the move, and places the food row by row", () => {
      const choose = recording(208);
      const after = tick(fed(), choose);
      expect(choose.counts).toEqual([396]);
      // Row 10: x 0..7 are indices 200..207, x 8..11 is the snake, so 208 is (12,10).
      expect(after.food).toEqual({ x: 12, y: 10 });
    });

    it.each([-1, 396, 0.5, Number.NaN])(
      "throws a RangeError when the chooser returns %p",
      (index) => {
        expect(() => tick(fed(), () => index)).toThrow(RangeError);
      },
    );
  });

  it("throws a RangeError for a state whose snake has no cells", () => {
    expect(() => tick(running({ snake: [] }), first)).toThrow(RangeError);
  });

  it("does not move the food when the snake does not eat", () => {
    const before = running({ food: { x: 3, y: 3 } });
    expect(tick(before, first).food).toEqual({ x: 3, y: 3 });
  });

  it("wins when the snake fills the board, with no food placed", () => {
    // Size 2: snake (1,1),(0,1),(0,0); the last free cell (1,0) holds the food.
    const choose = recording(0);
    const before = frozen({
      size: 2,
      snake: [
        { x: 1, y: 1 },
        { x: 0, y: 1 },
        { x: 0, y: 0 },
      ],
      heading: "up",
      queue: [],
      food: { x: 1, y: 0 },
      score: 1,
      status: "running",
    });
    expect(tick(before, choose)).toEqual({
      size: 2,
      snake: [
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
        { x: 0, y: 0 },
      ],
      heading: "up",
      queue: [],
      food: null,
      score: 2,
      status: "won",
    });
    expect(choose.counts).toEqual([]);
  });
});

describe("a whole game through the commands", () => {
  it("plays a 2 x 2 board from a new game to a win", () => {
    const choose = recording(0);
    let state = newGame({ size: 2, startLength: 2, choose });
    // Snake (1,1),(0,1); free (0,0),(1,0); index 0 puts the food at (0,0).
    expect(state.food).toEqual({ x: 0, y: 0 });

    state = turn(frozen(state), "up");
    expect(state.status).toBe("running");
    state = tick(frozen(state), choose); // (1,0)
    state = turn(frozen(state), "left");
    state = tick(frozen(state), choose); // eats at (0,0); only (0,1) is free
    expect(state.score).toBe(1);
    expect(state.food).toEqual({ x: 0, y: 1 });
    state = turn(frozen(state), "down");
    state = tick(frozen(state), choose); // eats at (0,1), fills the board

    expect(state.status).toBe("won");
    expect(state.score).toBe(2);
    expect(state.food).toBeNull();
    expect(choose.counts).toEqual([2, 1]);
    expect(tick(frozen(state), choose)).toBe(state);
  });

  it("starts afresh with newGame after a lost game", () => {
    const lost = game({ status: "over", score: 5, queue: ["up"] });
    const again = newGame({ size: lost.size, startLength: START_LENGTH, choose: first });
    expect(again).toEqual(game());
  });
});
