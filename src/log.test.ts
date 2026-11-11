import {
  type Cell,
  type GameState,
  newGame,
  type SpecialRules,
  start,
  tick,
  togglePause,
  turn,
} from "./game";
import {
  firstLine,
  type Log,
  type LogValues,
  logEnd,
  logInput,
  logPage,
  logPanelPause,
  logPanelResume,
  logScores,
  logSlow,
  logTick,
  startLog,
} from "./log";

// The event log (docs/SPEC.md 2.13): every kind of line of 2.13 (5), whole.
const DELAYS = { first: 125, step: 5, shortest: 50 };
const SPECIAL: SpecialRules = {
  every: 5,
  shieldLayers: 3,
  maxTurns: 20,
  seconds: 30,
  jumpSeconds: 3,
  clearAheadOfHead: 2,
};
const VALUES: LogValues = {
  size: 20,
  startLength: 3,
  clearAhead: 8,
  dotsPerLevel: 5,
  delays: DELAYS,
  special: SPECIAL,
};
const BASE = newGame({
  size: 20,
  startLength: 3,
  clearAhead: 8,
  dotsPerLevel: 5,
  delays: { first: 125, step: 5, shortest: 50 },
  special: SPECIAL,
  choose: () => 0,
});
const ZERO = () => 0;
const LINE: Cell[] = [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 },
];
const at = (t: number, k: number) => ({ t, k });

/** A running game on `level`, heading right with the snake in `LINE`, the dot on (0,19). */
function game(overrides: Partial<GameState> = {}, level = 1): GameState {
  return {
    ...BASE,
    level,
    status: "running",
    snake: LINE,
    heading: "right",
    food: { x: 0, y: 19 },
    obstacles: [],
    run: level % 5 === 0 ? { shieldUsed: 0, waiting: false } : null,
    ...overrides,
  };
}

/** A log with only the first line, so tests see just the lines they make. */
const EMPTY: Log = { lines: [], stretch: null, values: VALUES };
const added = (before: Log, after: Log): readonly string[] =>
  after.lines.slice(before.lines.length);

describe("firstLine (docs/SPEC.md 2.13 (3))", () => {
  it("names the version, the build and the named values", () => {
    expect(firstLine("0.2.0", "abc1234", VALUES)).toBe(
      "snake-demo version=0.2.0 build=abc1234 size=20 start-length=3 clear-ahead=8 dots=5 delays=125/5/50 special-every=5 shield=3 turns=20 seconds=30 jump=3 clear-head=2",
    );
  });

  it("puts the version in front of the build, a prerelease version whole", () => {
    expect(
      firstLine("0.3.0-rc.1", "abc1234", VALUES).startsWith(
        "snake-demo version=0.3.0-rc.1 build=abc1234 size=20 ",
      ),
    ).toBe(true);
  });

  it("says special=none without special levels", () => {
    expect(firstLine("1.10.3", "dev", { ...VALUES, special: null })).toBe(
      "snake-demo version=1.10.3 build=dev size=20 start-length=3 clear-ahead=8 dots=5 delays=125/5/50 special=none",
    );
  });
});

describe("firstLine on a playtest page (docs/SPEC.md 2.13 (3), 2.14 (4))", () => {
  const PLAIN =
    "snake-demo version=0.2.0 build=abc1234 size=20 start-length=3 clear-ahead=8 dots=5 delays=125/5/50 special-every=5 shield=3 turns=20 seconds=30 jump=3 clear-head=2";

  it.each([
    [{ startLevel: 5, slow: true }, "playtest start-level=5 slow"],
    [{ startLevel: 5, slow: false }, "playtest start-level=5"],
    [{ startLevel: null, slow: true }, "playtest slow"],
    [{ startLevel: 1, slow: false }, "playtest start-level=1"],
    [{ startLevel: 99, slow: true }, "playtest start-level=99 slow"],
  ])("%o ends the line with %p", (options, words) => {
    expect(firstLine("0.2.0", "abc1234", VALUES, options)).toBe(`${PLAIN} ${words}`);
  });

  it("a page with no option has the plain first line", () => {
    expect(firstLine("0.2.0", "abc1234", VALUES, { startLevel: null, slow: false })).toBe(PLAIN);
    expect(firstLine("0.2.0", "abc1234", VALUES, undefined)).toBe(PLAIN);
  });

  it("the options come after the special=none words too", () => {
    expect(
      firstLine("1.10.3", "dev", { ...VALUES, special: null }, { startLevel: 5, slow: true }),
    ).toBe(
      "snake-demo version=1.10.3 build=dev size=20 start-length=3 clear-ahead=8 dots=5 delays=125/5/50 special=none playtest start-level=5 slow",
    );
  });
});

describe("startLog and the level line (docs/SPEC.md 2.13 (5))", () => {
  it("starts with the first line and level 1", () => {
    const ready = game({ status: "ready", snake: [LINE[0], LINE[0], LINE[0]] as Cell[] });
    const log = startLog("FIRST", at(0, 0), ready, VALUES);
    expect(log.lines).toEqual([
      "FIRST",
      "[t=0 #0] level 1 normal delay=125 start=(10,10) right obstacles=- dot=(0,19)",
    ]);
  });

  it("a game made by the New game command starts with that input's line", () => {
    const ready = game({ status: "ready" });
    const log = startLog("F", at(0, 0), ready, VALUES, { kind: "button", label: "New game" });
    expect(log.lines).toEqual([
      "F",
      "[t=0 #0] button New game used",
      "[t=0 #0] level 1 normal delay=125 start=(10,10) right obstacles=- dot=(0,19)",
    ]);
  });

  it("writes a special level's limits", () => {
    const ready = game(
      {
        status: "ready",
        obstacles: [
          { x: 1, y: 2 },
          { x: 7, y: 9 },
        ],
      },
      5,
    );
    expect(startLog("F", at(5, 7), ready, VALUES).lines[1]).toBe(
      "[t=5 #7] level 5 special delay=55 start=(10,10) right obstacles=(1,2),(7,9) dot=(0,19) turns=20 seconds=30 shield=3",
    );
  });
});

describe("logInput (docs/SPEC.md 2.13 (4), (5))", () => {
  it("a key that starts the level: the input and the start turn", () => {
    const ready = game({ status: "ready" });
    const after = turn(ready, "up");
    const log = logInput(
      EMPTY,
      at(10, 0),
      { kind: "key", key: "ArrowUp", command: "up" },
      null,
      ready,
      after,
    );
    expect(log.lines).toEqual(["[t=10 #0] key ArrowUp up used", "[t=10 #0] turn up start"]);
  });

  it("an ignored key gives its reason", () => {
    const state = game();
    const log = logInput(
      EMPTY,
      at(1, 2),
      { kind: "key", key: "a", command: "left" },
      "straight back",
      state,
      state,
    );
    expect(log.lines).toEqual(["[t=1 #2] key a left ignored straight back"]);
  });

  it("a held key's reason is repeat", () => {
    const state = game({ status: "over", ended: "wall" });
    const log = logInput(
      EMPTY,
      at(1, 2),
      { kind: "key", key: "Enter", command: "new" },
      "repeat",
      state,
      state,
    );
    expect(log.lines).toEqual(["[t=1 #2] key Enter new ignored repeat"]);
  });

  it("a queued turn makes only the input line", () => {
    const state = game();
    const log = logInput(
      EMPTY,
      at(1, 2),
      { kind: "swipe", direction: "up" },
      null,
      state,
      turn(state, "up"),
    );
    expect(log.lines).toEqual(["[t=1 #2] swipe up used"]);
  });

  it("a button", () => {
    const ready = game({ status: "ready" });
    const log = logInput(
      EMPTY,
      at(3, 0),
      { kind: "button", label: "Start" },
      null,
      ready,
      start(ready),
    );
    expect(log.lines).toEqual(["[t=3 #0] button Start used"]);
  });

  it("pause ends the open stretch; resume", () => {
    const moved = logTick(EMPTY, at(125, 1), game(), tick(game(), ZERO));
    const running = tick(game(), ZERO);
    const paused = togglePause(running);
    const log = logInput(
      moved,
      at(200, 1),
      { kind: "key", key: "p", command: "pause" },
      null,
      running,
      paused,
    );
    expect(added(moved, log)).toEqual([
      "[t=200 #1] key p pause used",
      "[t=200 #1] move right 1 head=(11,10)",
      "[t=200 #1] pause",
    ]);
    const resumed = logInput(
      log,
      at(300, 1),
      { kind: "button", label: "Resume" },
      null,
      paused,
      togglePause(paused),
    );
    expect(added(log, resumed)).toEqual(["[t=300 #1] button Resume used", "[t=300 #1] resume"]);
  });

  it("a turn that ends a wait is free", () => {
    const waiting = game(
      {
        snake: [
          { x: 19, y: 10 },
          { x: 18, y: 10 },
          { x: 17, y: 10 },
        ],
        turns: 4,
        timeMs: 0,
        run: { shieldUsed: 1, waiting: true },
      },
      5,
    );
    const log = logInput(
      EMPTY,
      at(9, 9),
      { kind: "key", key: "ArrowUp", command: "up" },
      null,
      waiting,
      turn(waiting, "up"),
    );
    expect(log.lines).toEqual(["[t=9 #9] key ArrowUp up used", "[t=9 #9] turn up free"]);
  });
});

describe("logTick (docs/SPEC.md 2.13 (4), (5))", () => {
  /** Runs `ticks` ticks from `state`, logging each, with 125 ms per tick. */
  function run(state: GameState, ticks: number, log: Log = EMPTY): { state: GameState; log: Log } {
    let current = state;
    let currentLog = log;
    for (let k = 1; k <= ticks; k++) {
      const next = tick(current, ZERO);
      currentLog = logTick(currentLog, at(k * 125, k), current, next);
      current = next;
    }
    return { state: current, log: currentLog };
  }

  it("moves gather into one stretch, written when a turn is taken", () => {
    const three = run(game(), 3);
    expect(three.log.lines).toEqual([]);
    expect(three.log.stretch).toEqual({ heading: "right", cells: 3, head: { x: 13, y: 10 } });
    const queued = turn(three.state, "up");
    const next = tick(queued, ZERO);
    const log = logTick(three.log, at(500, 4), queued, next);
    expect(log.lines).toEqual([
      "[t=500 #4] move right 3 head=(13,10)",
      "[t=500 #4] turn up counted 1",
    ]);
    expect(log.stretch).toEqual({ heading: "up", cells: 1, head: { x: 13, y: 9 } });
  });

  it("a turn on a special level is counted", () => {
    const state = turn(
      game({ turns: 4, timeMs: 0, run: { shieldUsed: 0, waiting: false } }, 5),
      "up",
    );
    const log = logTick(EMPTY, at(55, 1), state, tick(state, ZERO));
    expect(log.lines).toEqual(["[t=55 #1] turn up counted 5/20"]);
  });

  it("a turn on a normal level is counted, with no limit after the count", () => {
    const state = turn(game({ turns: 4, timeMs: 0 }), "up");
    const log = logTick(EMPTY, at(125, 1), state, tick(state, ZERO));
    expect(log.lines).toEqual(["[t=125 #1] turn up counted 5"]);
  });

  it("a normal level cleared by a tick that takes a turn: the turn line, then the level's turns and time", () => {
    // The spec's example of 2.13 (5): 12 turns and 25 300 ms on level 4 (110 ms a tick).
    const state = turn(
      game({ food: { x: 10, y: 9 }, dotsEaten: 4, score: 19, turns: 11, timeMs: 25190 }, 4),
      "up",
    );
    const next = tick(state, ZERO);
    const lines = logTick(EMPTY, at(125, 1), state, next).lines;
    expect(lines.slice(0, 4)).toEqual([
      "[t=125 #1] turn up counted 12",
      "[t=125 #1] move up 1 head=(10,9)",
      "[t=125 #1] dot +1 score=20",
      "[t=125 #1] cleared level 4 turns=12 time=25300 score=20",
    ]);
  });

  it("a dot on a normal level: +1, and the new dot", () => {
    const state = game({ food: { x: 11, y: 10 } });
    const next = tick(state, ZERO);
    const log = logTick(EMPTY, at(125, 1), state, next);
    const dot = next.food as Cell;
    expect(log.lines).toEqual([
      "[t=125 #1] move right 1 head=(11,10)",
      "[t=125 #1] dot +1 score=1",
      `[t=125 #1] dot at (${dot.x},${dot.y})`,
    ]);
  });

  it("a dot on a special level gives +0", () => {
    const state = game({ food: { x: 11, y: 10 }, score: 20 }, 5);
    const log = logTick(EMPTY, at(55, 1), state, tick(state, ZERO));
    expect(log.lines.slice(0, 2)).toEqual([
      "[t=55 #1] move right 1 head=(11,10)",
      "[t=55 #1] dot +0 score=20",
    ]);
  });

  it("a shielded crash: what it hit, the layers left, the free directions", () => {
    const state = game({ snake: LINE.map((c) => ({ x: c.x + 9, y: c.y })) }, 5);
    const log = logTick(EMPTY, at(55, 1), state, tick(state, ZERO));
    expect(log.lines).toEqual(["[t=55 #1] crash wall shield=2 free=up,down"]);
  });

  it("a tick while the snake waits writes nothing", () => {
    const waiting = game({ turns: 0, timeMs: 0, run: { shieldUsed: 1, waiting: true } }, 5);
    expect(logTick(EMPTY, at(1, 1), waiting, tick(waiting, ZERO)).lines).toEqual([]);
  });

  it("an obstacle jump gives all the new cells", () => {
    const state = game(
      {
        turns: 0,
        timeMs: 2999,
        run: { shieldUsed: 0, waiting: false },
        obstacles: [
          { x: 0, y: 19 },
          { x: 1, y: 19 },
        ],
      },
      5,
    );
    const log = logTick(EMPTY, at(55, 1), state, tick(state, ZERO));
    expect(log.lines).toEqual(["[t=55 #1] jump obstacles=(0,0),(1,0)"]);
  });

  it("a normal level cleared: the dot, the cleared line, the next level's line", () => {
    const state = game({ food: { x: 11, y: 10 }, dotsEaten: 4, score: 19 }, 4);
    const next = tick(state, ZERO);
    const log = logTick(EMPTY, at(125, 1), state, next);
    const head = next.snake[0] as Cell;
    const dot = next.food as Cell;
    const obstacles = next.obstacles.map((c) => `(${c.x},${c.y})`).join(",");
    expect(log.lines).toEqual([
      "[t=125 #1] move right 1 head=(11,10)",
      "[t=125 #1] dot +1 score=20",
      "[t=125 #1] cleared level 4 turns=0 time=110 score=20",
      `[t=125 #1] level 5 special delay=55 start=(${head.x},${head.y}) ${next.heading} obstacles=${obstacles} dot=(${dot.x},${dot.y}) turns=20 seconds=30 shield=3`,
    ]);
    expect(log.stretch).toBeNull();
  });

  it("a special level cleared: its points and what they counted", () => {
    const state = game(
      {
        food: { x: 11, y: 10 },
        dotsEaten: 4,
        score: 20,
        turns: 15,
        timeMs: 17985,
        run: { shieldUsed: 1, waiting: false },
      },
      5,
    );
    const log = logTick(EMPTY, at(55, 1), state, tick(state, ZERO));
    expect(log.lines.slice(0, 3)).toEqual([
      "[t=55 #1] move right 1 head=(11,10)",
      "[t=55 #1] dot +0 score=20",
      "[t=55 #1] cleared level 5 points=11 turns-left=5 seconds-left=12 shield-used=1 turns=15 time=18040 score=31",
    ]);
    expect(log.lines[3]).toMatch(/^\[t=55 #1\] level 6 normal delay=105 start=/);
  });

  it("a level cleared with no room for the next: the dot and the cleared line, no level line", () => {
    // A 2 x 2 board, 2 dots a level: the last free cell (1,0) holds the 2nd dot.
    const state = game({
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
    });
    const next = tick(state, ZERO);
    expect(next.ended).toBe("noRoom");
    expect(logTick(EMPTY, at(125, 1), state, next).lines).toEqual([
      "[t=125 #1] move up 1 head=(1,0)",
      "[t=125 #1] dot +1 score=2",
      "[t=125 #1] cleared level 1 turns=0 time=125 score=2",
    ]);
  });

  it("the 21st turn writes no turn line", () => {
    const state = turn(
      game({ turns: 20, timeMs: 0, run: { shieldUsed: 0, waiting: false } }, 5),
      "up",
    );
    const next = tick(state, ZERO);
    expect(next.status).toBe("blown");
    expect(logTick(EMPTY, at(1, 1), state, next).lines).toEqual([]);
  });
});

describe("logSlow: a press of the Slow button (docs/SPEC.md 2.13 (4), (5), 2.14 (5))", () => {
  it.each([2, 4, 1])("a step to x%i: the input line, then the slow line", (factor) => {
    expect(logSlow(EMPTY, at(310, 4), factor).lines).toEqual([
      "[t=310 #4] button Slow used",
      `[t=310 #4] slow x${factor}`,
    ]);
  });

  it("does not end the open stretch of moves", () => {
    const running = game();
    const moved = logTick(EMPTY, at(55, 1), running, tick(running, ZERO));
    const slowed = logSlow(moved, at(60, 1), 2);
    expect(slowed.stretch).toEqual(moved.stretch);
    expect(added(moved, slowed)).toEqual(["[t=60 #1] button Slow used", "[t=60 #1] slow x2"]);
  });

  it("a press the state ignores is button Slow ignored state, and no slow line", () => {
    const over = game({ status: "over", ended: "wall" });
    const log = logInput(EMPTY, at(9, 2), { kind: "button", label: "Slow" }, "state", over, over);
    expect(log.lines).toEqual(["[t=9 #2] button Slow ignored state"]);
  });
});

describe("logPage (docs/SPEC.md 2.13 (4))", () => {
  it("hidden pauses a running game; shown", () => {
    const running = game();
    const moved = logTick(EMPTY, at(125, 1), running, tick(running, ZERO));
    const now = tick(running, ZERO);
    const hidden = logPage(moved, at(130, 1), true, now, togglePause(now));
    expect(added(moved, hidden)).toEqual([
      "[t=130 #1] hidden",
      "[t=130 #1] move right 1 head=(11,10)",
      "[t=130 #1] pause",
    ]);
    const shown = logPage(hidden, at(900, 1), false, togglePause(now), togglePause(now));
    expect(added(hidden, shown)).toEqual(["[t=900 #1] shown"]);
  });

  it("hidden with a game not running writes only hidden", () => {
    const over = game({ status: "over", ended: "wall" });
    expect(logPage(EMPTY, at(1, 1), true, over, over).lines).toEqual(["[t=1 #1] hidden"]);
  });
});

describe("logEnd (docs/SPEC.md 2.13 (5))", () => {
  it.each<[GameState["ended"], GameState["status"], string]>([
    ["wall", "over", "over wall"],
    ["obstacle", "over", "over obstacle"],
    ["self", "over", "over self"],
    ["boxed", "over", "over boxed"],
    ["turns", "blown", "blown turns"],
    ["time", "blown", "blown time"],
    ["full", "won", "won full"],
    ["noRoom", "won", "won noroom"],
  ])("%s: the state, the reason, the score and the best", (ended, status, words) => {
    const end = game({ status, ended, score: 43 });
    expect(logEnd(EMPTY, at(7, 3), end, true).lines).toEqual([
      `[t=7 #3] end ${words} score=43 best=yes`,
    ]);
    expect(logEnd(EMPTY, at(7, 3), end, false).lines).toEqual([
      `[t=7 #3] end ${words} score=43 best=no`,
    ]);
  });

  it("ends the open stretch first", () => {
    const running = game();
    const moved = logTick(EMPTY, at(125, 1), running, tick(running, ZERO));
    const end = game({ status: "over", ended: "wall" });
    expect(logEnd(moved, at(250, 2), end, false).lines).toEqual([
      "[t=250 #2] move right 1 head=(11,10)",
      "[t=250 #2] end over wall score=0 best=no",
    ]);
  });
});

describe("the log panel's pause and resume (docs/SPEC.md 2.13 (5), (6))", () => {
  it("pause log ends the open stretch and writes pause log", () => {
    const running = game();
    const moved = logTick(EMPTY, at(125, 1), running, tick(running, ZERO));
    const log = logPanelPause(moved, at(200, 1));
    expect(added(moved, log)).toEqual([
      "[t=200 #1] move right 1 head=(11,10)",
      "[t=200 #1] pause log",
    ]);
    expect(log.stretch).toBeNull();
  });

  it("pause log with no open stretch writes only pause log", () => {
    expect(logPanelPause(EMPTY, at(5, 0)).lines).toEqual(["[t=5 #0] pause log"]);
  });

  it("resume log writes resume log and nothing else", () => {
    expect(logPanelResume(EMPTY, at(900, 1)).lines).toEqual(["[t=900 #1] resume log"]);
  });
});

describe("the scores panel's pause and resume (docs/SPEC.md 2.13 (5), 2.15 (5))", () => {
  it("pause scores ends the open stretch and writes pause scores", () => {
    const running = game();
    const moved = logTick(EMPTY, at(125, 1), running, tick(running, ZERO));
    const log = logPanelPause(moved, at(200, 1), "scores");
    expect(added(moved, log)).toEqual([
      "[t=200 #1] move right 1 head=(11,10)",
      "[t=200 #1] pause scores",
    ]);
    expect(log.stretch).toBeNull();
  });

  it("resume scores writes resume scores and nothing else", () => {
    expect(logPanelResume(EMPTY, at(900, 1), "scores").lines).toEqual(["[t=900 #1] resume scores"]);
  });

  it("the log panel's lines are unchanged when no panel is named", () => {
    expect(logPanelPause(EMPTY, at(5, 0), "log").lines).toEqual(["[t=5 #0] pause log"]);
    expect(logPanelResume(EMPTY, at(5, 0), "log").lines).toEqual(["[t=5 #0] resume log"]);
  });
});

describe("logScores: the name entry's outcome (docs/SPEC.md 2.13 (5), 2.15 (4), (6))", () => {
  it("a name entered with its rank", () => {
    expect(logScores(EMPTY, at(4000, 12), { kind: "name", name: "ABC", rank: 3 }).lines).toEqual([
      "[t=4000 #12] scores name=ABC rank=3",
    ]);
  });

  it("a name entered when the list had no room left at the confirmation", () => {
    expect(logScores(EMPTY, at(4000, 12), { kind: "full", name: "ABC" }).lines).toEqual([
      "[t=4000 #12] scores name=ABC full",
    ]);
  });

  it("an entry skipped", () => {
    expect(logScores(EMPTY, at(4000, 12), { kind: "skipped" }).lines).toEqual([
      "[t=4000 #12] scores skipped",
    ]);
  });

  it("keeps the lines before it", () => {
    const first = logScores(EMPTY, at(1, 1), { kind: "skipped" });
    const second = logScores(first, at(2, 1), { kind: "name", name: "XYZ", rank: 1 });
    expect(second.lines).toEqual(["[t=1 #1] scores skipped", "[t=2 #1] scores name=XYZ rank=1"]);
  });
});
