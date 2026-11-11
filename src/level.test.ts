import {
  type Cell,
  type Chooser,
  type Direction,
  type GameState,
  newGame,
  type SpecialRules,
  start,
  tick,
  togglePause,
  turn,
} from "./game";
import { type Log, logTick } from "./log";

// The turns and the time of every level (docs/SPEC.md 2.18 (1), (2)), with the spec's values; the
// module takes them as parameters (docs/SPEC.md 3).
const DELAYS = { first: 125, step: 5, shortest: 50 };
const SPECIAL: SpecialRules = {
  every: 5,
  shieldLayers: 3,
  maxTurns: 20,
  seconds: 30,
  jumpSeconds: 3,
  clearAheadOfHead: 2,
};
const RULES = {
  size: 20,
  startLength: 3,
  clearAhead: 8,
  dotsPerLevel: 5,
  delays: DELAYS,
  special: SPECIAL,
};

/** The start (10,10) heading right in the list of 960 starts (docs/SPEC.md 2.11 (2)). */
const CENTRE_RIGHT = 513;

/** A chooser that gives `indices` in order, the last one repeating. */
function answers(...indices: number[]): Chooser {
  let calls = 0;
  return () => indices[Math.min(calls++, indices.length - 1)] ?? 0;
}

/** The snake in a line, head at the centre heading right, body to its left. */
const LINE: Cell[] = [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 },
];

/** A game at `level`, `running`, the snake in `LINE` heading right, the dot far away, no obstacles. */
function running(level: number, overrides: Partial<GameState> = {}): GameState {
  return {
    ...newGame({ ...RULES, startLevel: level, choose: answers(CENTRE_RIGHT, 0) }),
    status: "running",
    snake: LINE,
    heading: "right",
    food: { x: 0, y: 19 },
    obstacles: [],
    ...overrides,
  };
}

/** `ticks` ticks from `state`, the chooser answering 0 each time. */
function run(state: GameState, ticks: number): GameState {
  let next = state;
  for (let i = 0; i < ticks; i++) next = tick(next, answers(0));
  return next;
}

/** The turn pressed, then one tick, as the page runs them. */
const turnAndTick = (state: GameState, direction: Direction): GameState =>
  tick(turn(state, direction), answers(0));

describe("the turns of a level (docs/SPEC.md 2.18 (1))", () => {
  it.each([1, 4, 5, 6])("a turn a tick takes from the queue is counted on level %i", (level) => {
    const after = turnAndTick(running(level), "up");
    expect(after.heading).toBe("up");
    expect(after.turns).toBe(1);
  });

  it("each turn taken by a tick adds one, without a limit on a normal level", () => {
    let state = running(1);
    // 25 turns, more than the 20 of a special level; the snake is put back each time.
    for (let i = 0; i < 25; i++) {
      state = turnAndTick({ ...state, snake: LINE, heading: "right", queue: [] }, "up");
    }
    expect(state.turns).toBe(25);
    expect(state.status).toBe("running");
  });

  it("a queued turn is not counted until a tick takes it (a normal level)", () => {
    const queued = turn(running(1), "up");
    expect(queued.queue).toEqual(["up"]);
    expect(queued.turns).toBe(0);
    expect(tick(queued, answers(0)).turns).toBe(1);
  });

  it("two queued turns are counted one tick each", () => {
    const queued = turn(turn(running(1), "up"), "left");
    const first = tick(queued, answers(0));
    expect(first.turns).toBe(1);
    expect(first.queue).toEqual(["left"]);
    expect(tick(first, answers(0)).turns).toBe(2);
  });

  it.each([1, 5])("the turn that starts level %i from ready is not counted", (level) => {
    const ready = { ...running(level), status: "ready" as const };
    const started = turn(ready, "up");
    expect(started.status).toBe("running");
    expect(started.turns).toBe(0);
    expect(tick(started, answers(0)).turns).toBe(0);
  });

  it.each([1, 5])("the Start button on level %i is not counted", (level) => {
    const started = start({ ...running(level), status: "ready" });
    expect(started.turns).toBe(0);
    expect(tick(started, answers(0)).turns).toBe(0);
  });

  it.each<[string, Partial<GameState>, Direction]>([
    ["the same direction as the heading", {}, "right"],
    ["the opposite of the heading", {}, "left"],
    ["the same direction as the last queued turn", { queue: ["up"] }, "up"],
    ["the opposite of the last queued turn", { queue: ["up"] }, "down"],
    ["a third turn while two are queued", { queue: ["up", "left"] }, "down"],
  ])("a turn ignored is not counted: %s", (_name, overrides, direction) => {
    const state = running(1, overrides);
    const after = turn(state, direction);
    expect(after).toBe(state);
    expect(after.turns).toBe(0);
  });

  it("a turn in a state that takes none is not counted", () => {
    const paused = togglePause(running(1));
    expect(turn(paused, "up")).toBe(paused);
    expect(paused.turns).toBe(0);
  });

  it("the turn that ends the wait after a shielded crash is not counted, and the crash tick's turn is", () => {
    // Level 5, heading up along the left edge, the queued turn left is taken and counted in the
    // same tick that crashes it into the wall; the snake is on the board.
    const edge: Cell[] = [
      { x: 0, y: 5 },
      { x: 0, y: 6 },
      { x: 0, y: 7 },
    ];
    const atWall = running(5, { snake: edge, heading: "up" });
    const crashed = turnAndTick(atWall, "left");
    expect(crashed.run?.waiting).toBe(true);
    expect(crashed.turns).toBe(1);
    const freed = turn(crashed, "up");
    expect(freed.run?.waiting).toBe(false);
    expect(freed.turns).toBe(1);
    expect(tick(freed, answers(0)).turns).toBe(1);
  });

  it("a turn on a special level is counted as before, up to 20, and the 21st blows the snake up", () => {
    const state = running(5, { turns: 20 });
    expect(turnAndTick(running(5, { turns: 19 }), "up").turns).toBe(20);
    const blown = turnAndTick(state, "up");
    expect(blown.status).toBe("blown");
    expect(blown.ended).toBe("turns");
    expect(blown.turns).toBe(20);
  });

  it("the turns of a level cleared go back to 0 on the next level, normal or special", () => {
    const lastDot = (level: number) =>
      running(level, { food: { x: 11, y: 10 }, dotsEaten: 4, turns: 7, timeMs: 5000 });
    for (const level of [1, 4, 5, 9]) {
      const next = tick(lastDot(level), answers(CENTRE_RIGHT, 0));
      expect(next.level).toBe(level + 1);
      expect([next.turns, next.timeMs]).toEqual([0, 0]);
    }
  });

  it("a new game, and a game from a start level, begin with 0 turns", () => {
    for (const startLevel of [1, 4, 5, 12]) {
      const state = newGame({ ...RULES, startLevel, choose: answers(CENTRE_RIGHT, 0) });
      expect([state.turns, state.timeMs]).toEqual([0, 0]);
    }
  });

  it("a game without special levels counts turns too", () => {
    const { special: _special, ...plain } = RULES;
    const state = {
      ...newGame({ ...plain, choose: answers(CENTRE_RIGHT, 0) }),
      status: "running" as const,
      snake: LINE,
      food: { x: 0, y: 19 },
    };
    expect(turnAndTick(state, "up").turns).toBe(1);
  });
});

describe("the time of a level (docs/SPEC.md 2.18 (2))", () => {
  it.each([
    [1, 125],
    [2, 120],
    [4, 110],
    [5, 55],
    [6, 105],
    [10, 45],
    [19, 50],
    [20, 25],
  ])("a tick in which the snake moved adds the delay of level %i, %i ms", (level, delay) => {
    // A start level above 1 needs no obstacle-free path here: the snake is placed by hand.
    const state = running(level);
    expect(state.timeMs).toBe(0);
    expect(tick(state, answers(0)).timeMs).toBe(delay);
    expect(run(state, 3).timeMs).toBe(3 * delay);
  });

  it("is a whole number of milliseconds that adds up exactly over many ticks", () => {
    expect(run(running(2), 8).timeMs).toBe(960);
  });

  it("does not run in ready", () => {
    const ready = { ...running(1), status: "ready" as const };
    expect(tick(ready, answers(0))).toBe(ready);
    expect(ready.timeMs).toBe(0);
  });

  it("does not run in paused, and goes on from where it was", () => {
    const moved = run(running(1), 2);
    const paused = togglePause(moved);
    expect(tick(paused, answers(0))).toBe(paused);
    expect(paused.timeMs).toBe(250);
    expect(run(togglePause(paused), 1).timeMs).toBe(375);
  });

  it.each<[string, Partial<GameState>]>([
    ["the wall", { snake: LINE.map((c) => ({ x: c.x + 9, y: c.y })) }],
    ["an obstacle", { obstacles: [{ x: 11, y: 10 }] }],
  ])("is not added in the tick of a crash into %s that ends the game", (_name, overrides) => {
    const after = tick(running(1, { ...overrides, timeMs: 500 }), answers(0));
    expect(after.status).toBe("over");
    expect(after.timeMs).toBe(500);
  });

  it("is not added in the tick of a shielded crash, nor while the snake waits", () => {
    const atWall = running(5, { snake: LINE.map((c) => ({ x: c.x + 9, y: c.y })), timeMs: 1000 });
    const crashed = tick(atWall, answers(0));
    expect(crashed.run?.waiting).toBe(true);
    expect(crashed.timeMs).toBe(1000);
    expect(tick(crashed, answers(0)).timeMs).toBe(1000);
  });

  it("goes on after the turn that ends the wait: the next tick adds the delay", () => {
    const atWall = running(5, { snake: LINE.map((c) => ({ x: c.x + 9, y: c.y })), timeMs: 1000 });
    const freed = turn(tick(atWall, answers(0)), "up");
    expect(freed.timeMs).toBe(1000);
    expect(tick(freed, answers(0)).timeMs).toBe(1055);
  });

  it("is not added in the tick that ends the game by the snake's own body", () => {
    const loop: Cell[] = [
      { x: 10, y: 10 },
      { x: 10, y: 11 },
      { x: 11, y: 11 },
      { x: 11, y: 10 },
      { x: 11, y: 9 },
    ];
    const after = tick(running(1, { snake: loop, heading: "right", timeMs: 400 }), answers(0));
    expect(after.ended).toBe("self");
    expect(after.timeMs).toBe(400);
  });

  it("is not added in a tick that blows the snake up for its 21st turn", () => {
    const after = turnAndTick(running(5, { turns: 20, timeMs: 700 }), "up");
    expect(after.status).toBe("blown");
    expect(after.timeMs).toBe(700);
  });

  it("counts the tick that eats the 5th dot and clears the level, in the level's report", () => {
    const state = running(1, { food: { x: 11, y: 10 }, dotsEaten: 4, timeMs: 500 });
    const next = tick(state, answers(CENTRE_RIGHT, 0));
    expect(next.cleared).toMatchObject({ level: 1, turns: 0, timeMs: 625 });
    expect(next.timeMs).toBe(0);
  });

  it("counts the tick that clears the level and the turn it took, on a normal and a special level", () => {
    const normal = tick(
      running(4, { food: { x: 10, y: 9 }, dotsEaten: 4, timeMs: 25_190, turns: 11, queue: ["up"] }),
      answers(CENTRE_RIGHT, 0),
    );
    expect(normal.cleared).toMatchObject({ level: 4, turns: 12, timeMs: 25_300, special: null });
    const special = tick(
      running(5, { food: { x: 10, y: 9 }, dotsEaten: 4, timeMs: 17_985, turns: 14, queue: ["up"] }),
      answers(CENTRE_RIGHT, 0),
    );
    expect(special.cleared).toMatchObject({ level: 5, turns: 15, timeMs: 18_040 });
  });

  it("counts the tick that fills the board and wins the game", () => {
    const state = running(1, {
      size: 2,
      clearAhead: 1,
      dotsPerLevel: 5,
      snake: [
        { x: 1, y: 1 },
        { x: 0, y: 1 },
        { x: 0, y: 0 },
      ],
      heading: "up",
      food: { x: 1, y: 0 },
      timeMs: 250,
    });
    const won = tick(state, answers(0));
    expect(won.ended).toBe("full");
    expect(won.timeMs).toBe(375);
  });

  it("keeps the level's time and turns when the next level cannot be laid out", () => {
    const state = running(1, {
      size: 2,
      clearAhead: 1,
      dotsPerLevel: 1,
      snake: [
        { x: 1, y: 1 },
        { x: 0, y: 1 },
        { x: 0, y: 0 },
      ],
      heading: "up",
      food: { x: 1, y: 0 },
      timeMs: 250,
      queue: ["up"],
    });
    const won = tick(state, answers(0));
    expect(won.ended).toBe("noRoom");
    expect([won.turns, won.timeMs]).toEqual([1, 375]);
    expect(won.cleared).toMatchObject({ turns: 1, timeMs: 375 });
  });

  it("on a special level gives the seconds left it gave before: 30 minus the time, rounded up", () => {
    const after = run(running(5), 5);
    expect(after.timeMs).toBe(275);
    expect(Math.ceil((30_000 - after.timeMs) / 1000)).toBe(30);
    const late = tick(running(5, { timeMs: 29_000 }), answers(0));
    expect(late.timeMs).toBe(29_055);
    expect(late.status).toBe("running");
    expect(tick(running(5, { timeMs: 29_945 }), answers(0)).status).toBe("blown");
  });
});

describe("a turn taken by a tick that ends the game by a crash (docs/SPEC.md 2.2 step 1, 2.18 (1), 2.12 (4))", () => {
  const VALUES = {
    size: 20,
    startLength: 3,
    clearAhead: 8,
    dotsPerLevel: 5,
    delays: DELAYS,
    special: SPECIAL,
  };
  const EMPTY: Log = { lines: [], stretch: null, values: VALUES };

  /** The head at (10,0) heading right: a queued "up" takes it off the top of the board. */
  const wall: Partial<GameState> = {
    snake: [
      { x: 10, y: 0 },
      { x: 9, y: 0 },
      { x: 8, y: 0 },
    ],
  };
  /** A queued "up" takes the head onto the obstacle at (10,9). */
  const obstacle: Partial<GameState> = { obstacles: [{ x: 10, y: 9 }] };
  /** Heading left, a queued "up" takes the head onto the snake's own segment at (10,9). */
  const body: Partial<GameState> = {
    snake: [
      { x: 10, y: 10 },
      { x: 11, y: 10 },
      { x: 11, y: 9 },
      { x: 10, y: 9 },
      { x: 9, y: 9 },
    ],
    heading: "left",
  };

  // A normal level, and a special level with no shield layer left (the crash then ends the game).
  const levels: Array<[string, number, Partial<GameState>, string]> = [
    ["a normal level", 4, {}, "turn up counted 8"],
    [
      "a special level with no shield left",
      5,
      { run: { shieldUsed: 3, waiting: false } },
      "turn up counted 8/20",
    ],
  ];
  const crashes: Array<[string, Partial<GameState>, string]> = [
    ["a wall", wall, "wall"],
    ["an obstacle", obstacle, "obstacle"],
    ["the body", body, "self"],
  ];

  for (const [levelName, level, levelOverrides, counted] of levels) {
    for (const [crashName, crashOverrides, reason] of crashes) {
      describe(`${levelName}, into ${crashName}`, () => {
        const before = running(level, {
          turns: 7,
          timeMs: 400,
          ...levelOverrides,
          ...crashOverrides,
          queue: ["up"],
        });
        const after = tick(before, answers(0));

        it("ends the game and counts the turn the tick took", () => {
          expect(after.status).toBe("over");
          expect(after.ended).toBe(reason);
          expect(after.turns).toBe(8);
        });

        it("leaves the heading and the queue as step 1 left them: the turn is the heading, the queue empty", () => {
          expect(after.heading).toBe("up");
          expect(after.queue).toEqual([]);
        });

        it("adds no time and does not move the snake", () => {
          expect(after.timeMs).toBe(400);
          expect(after.snake).toEqual(before.snake);
        });

        it("is logged with a counted line that gives the number the state shows", () => {
          const lines = logTick(EMPTY, { t: 125, k: 1 }, before, after).lines;
          expect(lines).toEqual([`[t=125 #1] ${counted}`]);
          expect(counted).toContain(`counted ${after.turns}`);
        });
      });
    }
  }

  it("a crash tick with no queued turn counts nothing", () => {
    const after = tick(running(4, { ...wall, heading: "up", turns: 7 }), answers(0));
    expect(after.ended).toBe("wall");
    expect(after.turns).toBe(7);
  });

  it("the 21st turn is the exception: the state is unchanged and the turns stay 20", () => {
    const before = running(5, { ...wall, turns: 20, queue: ["up"] });
    const after = tick(before, answers(0));
    expect(after.status).toBe("blown");
    expect(after.ended).toBe("turns");
    expect(after.turns).toBe(20);
    expect(after.heading).toBe("right");
    expect(after.queue).toEqual(["up"]);
    expect(logTick(EMPTY, { t: 55, k: 1 }, before, after).lines).toEqual([]);
  });
});
