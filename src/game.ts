/**
 * The game rules of docs/SPEC.md 2.1 to 2.5, 2.8, 2.10 to 2.12, 3 and 3.1, as pure functions over a
 * game state. No DOM and no timers. Every function returns a new state and never changes its
 * arguments; a command that the spec ignores returns the state it was given, unchanged.
 * The board size, start length, clear cells ahead, dots per level, delays, the special levels'
 * values and the chooser are passed in (docs/SPEC.md 3).
 */

export type Direction = "up" | "down" | "left" | "right";

/** A cell of the board: `x` from 0 (left), `y` from 0 (top). */
export type Cell = { readonly x: number; readonly y: number };

export type Status = "ready" | "running" | "paused" | "over" | "blown" | "won";

/** Why a game ended (docs/SPEC.md 2.8). */
export type EndReason =
  | "wall"
  | "obstacle"
  | "self"
  | "boxed"
  | "turns"
  | "time"
  | "full"
  | "noRoom";

/** The delays between ticks, in milliseconds (docs/SPEC.md 2.10 (2)). */
export interface Delays {
  readonly first: number;
  readonly step: number;
  readonly shortest: number;
}

/** The values of the special levels (docs/SPEC.md 2.12). */
export interface SpecialRules {
  /** Every level whose number this divides is special. */
  readonly every: number;
  readonly shieldLayers: number;
  /** Turns allowed on a special level; one more blows the snake up. */
  readonly maxTurns: number;
  /** The time a special level must be cleared in, in seconds. */
  readonly seconds: number;
  /** The obstacles jump each time the level's time passes a multiple of this, in seconds. */
  readonly jumpSeconds: number;
  /** Cells straight ahead of the head that a jumping obstacle never lands on. */
  readonly clearAheadOfHead: number;
  /** The delays, so that a tick knows how much time it takes. */
  readonly delays: Delays;
}

/** Where a special level stands (docs/SPEC.md 2.12 (3), 3.1). */
export interface SpecialRun {
  /** Turns counted on this level (2.12 (6)). */
  readonly turns: number;
  /** The level's time so far, in milliseconds: the delays of the ticks in which the snake moved. */
  readonly timeMs: number;
  readonly shieldUsed: number;
  /** True while the snake waits for a turn after a shielded crash (2.12 (5)). */
  readonly waiting: boolean;
}

/**
 * Given how many things there are to choose from, returns the index of the one to take. One
 * chooser picks the start, each obstacle and the dot (docs/SPEC.md 2.3, 2.11 (2)).
 */
export type Chooser = (count: number) => number;

export interface GameState {
  /** Width and height of the square board, in cells. */
  readonly size: number;
  /** Cells straight ahead of a start that lie on the board, kept free of obstacles. */
  readonly clearAhead: number;
  /** Dots eaten on a level that clear it. */
  readonly dotsPerLevel: number;
  /** The snake's segments, head first; several may share a cell. */
  readonly snake: readonly Cell[];
  readonly heading: Direction;
  /** Turns waiting for the next ticks, oldest first; at most `MAX_QUEUED_TURNS`. */
  readonly queue: readonly Direction[];
  /** The dot's cell; `null` once the game is won. */
  readonly food: Cell | null;
  /** The cells the snake must not enter. */
  readonly obstacles: readonly Cell[];
  /** The level, from 1. */
  readonly level: number;
  /** Dots eaten on this level. */
  readonly dotsEaten: number;
  /** Dots eaten in the whole game. */
  readonly score: number;
  readonly status: Status;
  /** The special levels' values; `null` in a game without special levels. */
  readonly special: SpecialRules | null;
  /** Where the current special level stands; `null` on a normal level. */
  readonly run: SpecialRun | null;
  /** Why the game ended; `null` while it has not (docs/SPEC.md 2.8). */
  readonly ended: EndReason | null;
}

/** At most two turns wait in the queue (docs/SPEC.md 2.4 (2), 3.1). */
const MAX_QUEUED_TURNS = 2;

const OPPOSITE: Readonly<Record<Direction, Direction>> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

const STEP: Readonly<Record<Direction, Cell>> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/** The order of the headings within a cell in the list of starts (docs/SPEC.md 2.11 (2)). */
const START_HEADINGS: readonly Direction[] = ["up", "right", "down", "left"];

type Start = { readonly cell: Cell; readonly heading: Direction };

/** A level's board as laid out (docs/SPEC.md 2.11). */
type Layout = Pick<GameState, "snake" | "heading" | "obstacles" | "food">;

function sameCell(a: Cell, b: Cell): boolean {
  return a.x === b.x && a.y === b.y;
}

function onBoard(cell: Cell, size: number): boolean {
  return cell.x >= 0 && cell.x < size && cell.y >= 0 && cell.y < size;
}

/** The four directions, in the order the waiting line names them (docs/SPEC.md 2.12 (10)). */
const DIRECTIONS: readonly Direction[] = ["up", "down", "left", "right"];

/**
 * The directions in which a move of the head one cell would not crash and not end the game, by
 * 2.2 steps 3 to 5 (docs/SPEC.md 2.12 (5)): on the board, not an obstacle, and not the body; the
 * last segment's cell counts as free unless the move eats the dot. In the order up, down, left,
 * right. Empty for a snake with no segments.
 */
export function freeDirections(state: GameState): Direction[] {
  const head = state.snake[0];
  if (head === undefined) return [];
  return DIRECTIONS.filter((direction) => {
    const next = ahead(head, direction, 1);
    if (!onBoard(next, state.size)) return false;
    if (state.obstacles.some((cell) => sameCell(cell, next))) return false;
    const eats = state.food !== null && sameCell(next, state.food);
    const body = eats ? state.snake : state.snake.slice(0, -1);
    return !body.some((cell) => sameCell(cell, next));
  });
}

function ahead(cell: Cell, heading: Direction, distance: number): Cell {
  const step = STEP[heading];
  return { x: cell.x + distance * step.x, y: cell.y + distance * step.y };
}

function isWholeNumber(value: number, least: number): boolean {
  return Number.isInteger(value) && value >= least;
}

const FRESH_RUN: SpecialRun = Object.freeze({ turns: 0, timeMs: 0, shieldUsed: 0, waiting: false });

/** True if `level` is special under `rules` (docs/SPEC.md 2.12 (1)). */
function isSpecial(level: number, rules: SpecialRules | null): boolean {
  return rules !== null && level % rules.every === 0;
}

/** The run a level starts with: a fresh one on a special level, none on a normal one. */
function runFor(level: number, rules: SpecialRules | null): SpecialRun | null {
  return isSpecial(level, rules) ? FRESH_RUN : null;
}

/** Throws a RangeError if the special levels' values cannot make a game (docs/SPEC.md 2.12). */
function checkSpecial(rules: SpecialRules): void {
  const checks: Array<[string, number, boolean]> = [
    ["every", rules.every, isWholeNumber(rules.every, 2)],
    ["shield layers", rules.shieldLayers, isWholeNumber(rules.shieldLayers, 1)],
    ["turns allowed", rules.maxTurns, isWholeNumber(rules.maxTurns, 0)],
    ["seconds", rules.seconds, rules.seconds > 0],
    ["jump seconds", rules.jumpSeconds, rules.jumpSeconds > 0],
    [
      "clear cells ahead of the head",
      rules.clearAheadOfHead,
      isWholeNumber(rules.clearAheadOfHead, 0),
    ],
  ];
  for (const [name, value, ok] of checks) {
    if (!ok) throw new RangeError(`special levels: ${name} ${value} is out of range`);
  }
}

/**
 * Takes the item at the index the chooser returns for `items`. Throws a RangeError if the index is
 * not an integer from 0 to the number of items minus one.
 */
function pick<T>(items: readonly T[], choose: Chooser, what: string): T {
  const index = choose(items.length);
  const item = Number.isInteger(index) ? items[index] : undefined;
  if (item === undefined) {
    throw new RangeError(
      `chooser returned ${index} for ${what}; expected an integer from 0 to ${items.length - 1}`,
    );
  }
  return item;
}

/** The cells of the board not in `taken`, listed row by row (docs/SPEC.md 2.3). */
function freeCells(size: number, taken: readonly Cell[]): Cell[] {
  const blocked = new Set(taken.map((cell) => cell.y * size + cell.x));
  const free: Cell[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!blocked.has(y * size + x)) free.push({ x, y });
    }
  }
  return free;
}

/**
 * Every cell and heading from which the `clearAhead` cells straight ahead lie on the board, row by
 * row and, within a cell, up, right, down, left (docs/SPEC.md 2.11 (2)).
 */
function starts(size: number, clearAhead: number): Start[] {
  const list: Start[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      for (const heading of START_HEADINGS) {
        if (onBoard(ahead({ x, y }, heading, clearAhead), size))
          list.push({ cell: { x, y }, heading });
      }
    }
  }
  return list;
}

/**
 * Lays out `level` with a snake of `length` segments (docs/SPEC.md 2.11): the start, the snake on
 * it, the level's `level - 1` obstacles and the dot, each picked by the chooser in that order.
 * Returns null, and asks the chooser nothing, when the board has not enough cells: for the
 * obstacles, the dot and the snake's length together, or for the obstacles off the start and the
 * cells ahead of it.
 */
function layOut(
  size: number,
  clearAhead: number,
  level: number,
  length: number,
  choose: Chooser,
): Layout | null {
  const cells = size * size;
  const obstacleCount = level - 1;
  if (obstacleCount + 1 + length > cells || obstacleCount > cells - 1 - clearAhead) return null;

  const start = pick(starts(size, clearAhead), choose, "the start");
  const kept = [start.cell];
  for (let distance = 1; distance <= clearAhead; distance++) {
    kept.push(ahead(start.cell, start.heading, distance));
  }
  const obstacles: Cell[] = [];
  for (let i = 0; i < obstacleCount; i++) {
    obstacles.push(pick(freeCells(size, [...kept, ...obstacles]), choose, "an obstacle"));
  }
  return {
    snake: Array.from({ length }, () => ({ ...start.cell })),
    heading: start.heading,
    obstacles,
    food: pick(freeCells(size, [start.cell, ...obstacles]), choose, "the dot"),
  };
}

/**
 * A new game in `ready` at level 1 (docs/SPEC.md 2.1 (2), 2.11): score 0, no dots eaten, no
 * queued turns, the snake's `startLength` segments all on a start the chooser picks, then the dot.
 * Throws a RangeError if `size`, `startLength` or `dotsPerLevel` is not a whole number of at least
 * 1, if `clearAhead` is not a whole number of at least 0, if the board is too small for a start
 * (fewer than `clearAhead + 1` cells a side), if `startLength` is `size × size` or more, if a
 * special levels' value is out of range (docs/SPEC.md 2.12), or if the chooser returns an index out
 * of range.
 */
export function newGame(options: {
  size: number;
  startLength: number;
  clearAhead: number;
  dotsPerLevel: number;
  /** The special levels' values (docs/SPEC.md 2.12); without them no level is special. */
  special?: SpecialRules;
  choose: Chooser;
}): GameState {
  const { size, startLength, clearAhead, dotsPerLevel, choose } = options;
  const special = options.special ?? null;
  if (special !== null) checkSpecial(special);
  if (!isWholeNumber(size, 1)) {
    throw new RangeError(`board size ${size}; expected a whole number of at least 1`);
  }
  if (!isWholeNumber(clearAhead, 0)) {
    throw new RangeError(`clear cells ahead ${clearAhead}; expected a whole number of at least 0`);
  }
  if (size <= clearAhead) {
    throw new RangeError(
      `a board of ${size} has no start with ${clearAhead} cells ahead; it needs at least ${clearAhead + 1}`,
    );
  }
  if (!isWholeNumber(startLength, 1)) {
    throw new RangeError(`start length ${startLength}; expected a whole number of at least 1`);
  }
  if (!isWholeNumber(dotsPerLevel, 1)) {
    throw new RangeError(`dots per level ${dotsPerLevel}; expected a whole number of at least 1`);
  }
  const layout = layOut(size, clearAhead, 1, startLength, choose);
  if (layout === null) {
    throw new RangeError(
      `start length ${startLength}; expected less than ${size * size}, the cells of a board of ${size}`,
    );
  }
  return {
    size,
    clearAhead,
    dotsPerLevel,
    ...layout,
    queue: [],
    level: 1,
    dotsEaten: 0,
    score: 0,
    status: "ready",
    special,
    run: runFor(1, special),
    ended: null,
  };
}

/**
 * The delay between ticks on `level`, in milliseconds (docs/SPEC.md 2.10 (2), 2.12 (2)). Without
 * `every`, no level is special: `first` on level 1, `step` shorter on each next level, and never
 * shorter than `shortest`. With `every`, a level whose number it divides is special and has half
 * the delay of the level before it, with no floor; a normal level is `step` shorter for each normal
 * level before it, and never shorter than `shortest`. Throws a RangeError if `level` is not a whole
 * number of at least 1, or `every` one of at least 2.
 */
export function levelDelay(level: number, delays: Delays & { every?: number }): number {
  if (!isWholeNumber(level, 1)) {
    throw new RangeError(`level ${level}; expected a whole number of at least 1`);
  }
  const { every } = delays;
  if (every !== undefined && !isWholeNumber(every, 2)) {
    throw new RangeError(`special every ${every} levels; expected a whole number of at least 2`);
  }
  const normalDelay = (normal: number): number => {
    const specialsBefore = every === undefined ? 0 : Math.floor((normal - 1) / every);
    return Math.max(delays.shortest, delays.first - delays.step * (normal - 1 - specialsBefore));
  };
  if (every !== undefined && level % every === 0) return normalDelay(level - 1) / 2;
  return normalDelay(level);
}

/** The delay of the state's level, counting its special levels (docs/SPEC.md 2.10 (2), 2.12 (2)). */
function delayOf(state: GameState, rules: SpecialRules): number {
  return levelDelay(state.level, { ...rules.delays, every: rules.every });
}

/** What the page shows on a special level (docs/SPEC.md 2.12 (8), (10)); `null` on a normal one. */
export function specialInfo(
  state: GameState,
): { turnsLeft: number; secondsLeft: number; shieldLeft: number } | null {
  const { run, special } = state;
  if (run === null || special === null) return null;
  return {
    turnsLeft: Math.max(0, special.maxTurns - run.turns),
    secondsLeft: Math.max(0, Math.ceil((special.seconds * 1000 - run.timeMs) / 1000)),
    shieldLeft: special.shieldLayers - run.shieldUsed,
  };
}

/**
 * A turn from a key or a swipe (docs/SPEC.md 2.1 (3), 2.4). In `ready`, a turn starts the game
 * with that heading, unless it is opposite to the heading or its next cell from the head is off the
 * board or on an obstacle. In `running`, a turn is checked
 * against the last queued turn, or the heading when none is queued: the same or the opposite
 * direction is ignored, and so is any turn while the queue is full. Elsewhere a turn is ignored. A
 * value that is not one of the four directions (possible only past the type checker) is ignored in
 * every state. On a special level a snake waiting after a shielded crash takes a turn into a free
 * direction at once, ignores any other, and does not count the turn (docs/SPEC.md 2.12 (5), (6)).
 */
export function turn(state: GameState, direction: Direction): GameState {
  if (!Object.hasOwn(STEP, direction)) return state;
  if (state.status === "ready") {
    if (direction === OPPOSITE[state.heading]) return state;
    const head = state.snake[0];
    if (head !== undefined) {
      const next = ahead(head, direction, 1);
      if (!onBoard(next, state.size) || state.obstacles.some((cell) => sameCell(cell, next))) {
        return state;
      }
    }
    return { ...state, heading: direction, status: "running" };
  }
  if (state.status !== "running") return state;
  if (state.run?.waiting) {
    // A snake waiting after a shielded crash takes a turn into a free direction at once, and the
    // turn is not counted (docs/SPEC.md 2.12 (5), (6)).
    if (!freeDirections(state).includes(direction)) return state;
    return { ...state, heading: direction, run: { ...state.run, waiting: false } };
  }
  const last = state.queue[state.queue.length - 1] ?? state.heading;
  if (direction === last || direction === OPPOSITE[last]) return state;
  if (state.queue.length >= MAX_QUEUED_TURNS) return state;
  return { ...state, queue: [...state.queue, direction] };
}

/**
 * Counts one turn on a special level (docs/SPEC.md 2.12 (6)): the run with it counted, or `null`
 * when it is one more than the turns allowed.
 */
function countTurn(state: GameState, run: SpecialRun): SpecialRun | null {
  const turns = run.turns + 1;
  if (state.special === null || turns > state.special.maxTurns) return null;
  return { ...run, turns };
}

/** The Start button (docs/SPEC.md 2.5): starts a `ready` game in the heading it has; otherwise ignored. */
export function start(state: GameState): GameState {
  if (state.status !== "ready") return state;
  return { ...state, status: "running" };
}

/** Pause and go on (docs/SPEC.md 2.5): `running` becomes `paused` and back; otherwise ignored. */
export function togglePause(state: GameState): GameState {
  if (state.status === "running") return { ...state, status: "paused" };
  if (state.status === "paused") return { ...state, status: "running" };
  return state;
}

/** The page is hidden (docs/SPEC.md 2.5): a `running` game is paused; any other is left as it is. */
export function pauseIfRunning(state: GameState): GameState {
  return state.status === "running" ? { ...state, status: "paused" } : state;
}

/**
 * Goes on from a cleared level (docs/SPEC.md 2.10 (3), 2.11): the next level, laid out anew with
 * the snake as long as it is, in `ready`, no dots eaten and no queued turns. If the board has not
 * enough cells for it, the game is `won` with the level, score and snake as they are, and no
 * obstacles or dot.
 */
function nextLevel(cleared: GameState, choose: Chooser): GameState {
  const level = cleared.level + 1;
  const layout = layOut(cleared.size, cleared.clearAhead, level, cleared.snake.length, choose);
  if (layout === null) {
    return { ...cleared, queue: [], obstacles: [], food: null, status: "won", ended: "noRoom" };
  }
  return {
    ...cleared,
    ...layout,
    queue: [],
    level,
    dotsEaten: 0,
    status: "ready",
    run: runFor(level, cleared.special),
  };
}

/**
 * The points a cleared special level gives (docs/SPEC.md 2.12 (8)): the turns and the whole seconds
 * left (a begun second counts), times the share of the shield not used, rounded.
 */
function levelPoints(state: GameState): number {
  const info = specialInfo(state);
  if (info === null || state.special === null) return 0;
  const layers = state.special.shieldLayers;
  return Math.round(((info.turnsLeft + info.secondsLeft) * info.shieldLeft) / layers);
}

/**
 * The obstacles jump (docs/SPEC.md 2.12 (9)): each picked anew by the chooser, one at a time, from
 * the cells with no snake segment, no dot and no obstacle already picked in this jump, and not one
 * of the cells straight ahead of the head kept clear. When there are fewer such cells than
 * obstacles, they stay where they are and the chooser is asked nothing.
 */
function jump(state: GameState, rules: SpecialRules, choose: Chooser): readonly Cell[] {
  const head = state.snake[0];
  if (head === undefined) return state.obstacles;
  const kept: Cell[] = [...state.snake];
  if (state.food !== null) kept.push(state.food);
  for (let distance = 1; distance <= rules.clearAheadOfHead; distance++) {
    const cell = ahead(head, state.heading, distance);
    if (onBoard(cell, state.size)) kept.push(cell);
  }
  if (freeCells(state.size, kept).length < state.obstacles.length) return state.obstacles;
  const obstacles: Cell[] = [];
  for (let i = 0; i < state.obstacles.length; i++) {
    obstacles.push(pick(freeCells(state.size, [...kept, ...obstacles]), choose, "an obstacle"));
  }
  return obstacles;
}

/**
 * The end of a tick on a special level in which the snake moved and the level was neither cleared
 * nor won (docs/SPEC.md 2.12 (4), (7), (9)): blown when the level's time is up, otherwise the
 * obstacles jump when the time passed a multiple of the jump interval.
 */
function afterMove(state: GameState, timeBefore: number, choose: Chooser): GameState {
  const { run, special } = state;
  if (run === null || special === null) return state;
  if (run.timeMs >= special.seconds * 1000) return { ...state, status: "blown", ended: "time" };
  const interval = special.jumpSeconds * 1000;
  if (Math.floor(run.timeMs / interval) <= Math.floor(timeBefore / interval)) return state;
  return { ...state, obstacles: jump(state, special, choose) };
}

/**
 * One tick (docs/SPEC.md 2.2), only while `running`. A tick that ends the game (a wall, an
 * obstacle or the body) leaves everything as it was and only sets the state to `over`. The body
 * is counted by segments: when the snake does not eat, its last segment does not count, but other
 * segments on the same cell do. The last dot of a level clears it and lays out the next one in the
 * same tick, with the same chooser; otherwise, leaving no free cell wins the game, with no dot
 * placed. On a special level (docs/SPEC.md 2.12 (4)): a waiting snake does nothing; a turn taken
 * from the queue is counted, and the 21st blows the snake up; a wall or an obstacle with a shield
 * layer left uses it and makes the snake wait; a dot scores nothing, and the 5th adds the level's
 * points; the time runs and may blow the snake up; and the obstacles jump. Throws a RangeError if
 * the chooser returns an index out of range, or if the state has a snake with no segments (no game
 * made by `newGame` has one).
 */
export function tick(state: GameState, choose: Chooser): GameState {
  if (state.status !== "running") return state;
  const { special } = state;
  let run = state.run;
  if (run?.waiting) return state;
  const [nextTurn, ...queue] = state.queue;
  const heading = nextTurn ?? state.heading;
  if (run !== null && nextTurn !== undefined) {
    run = countTurn(state, run);
    if (run === null) return { ...state, status: "blown", ended: "turns" };
  }
  const head = state.snake[0];
  if (head === undefined) throw new RangeError("the snake has no segments");
  const newHead = ahead(head, heading, 1);

  const crash = (ended: "wall" | "obstacle"): GameState => {
    if (run === null || special === null || run.shieldUsed >= special.shieldLayers) {
      return { ...state, status: "over", ended };
    }
    const waiting: GameState = {
      ...state,
      heading,
      queue: [],
      run: { ...run, shieldUsed: run.shieldUsed + 1, waiting: true },
    };
    if (freeDirections(waiting).length === 0) return { ...waiting, status: "over", ended: "boxed" };
    return waiting;
  };
  if (!onBoard(newHead, state.size)) return crash("wall");
  const eats = state.food !== null && sameCell(newHead, state.food);
  const body = eats ? state.snake : state.snake.slice(0, -1);
  if (state.obstacles.some((cell) => sameCell(cell, newHead))) return crash("obstacle");
  if (body.some((cell) => sameCell(cell, newHead))) {
    return { ...state, status: "over", ended: "self" };
  }

  const snake = eats ? [newHead, ...state.snake] : [newHead, ...state.snake.slice(0, -1)];
  const timeBefore = run?.timeMs ?? 0;
  if (run !== null && special !== null) {
    run = { ...run, timeMs: run.timeMs + delayOf(state, special) };
  }
  const moved = { ...state, snake, heading, queue, run };
  if (!eats) return afterMove(moved, timeBefore, choose);

  const eaten = {
    ...moved,
    score: state.score + (run === null ? 1 : 0),
    dotsEaten: state.dotsEaten + 1,
  };
  if (eaten.dotsEaten >= state.dotsPerLevel) {
    return nextLevel({ ...eaten, score: eaten.score + levelPoints(eaten) }, choose);
  }
  const free = freeCells(state.size, [...snake, ...state.obstacles]);
  if (free.length === 0) return { ...eaten, food: null, status: "won", ended: "full" };
  return afterMove({ ...eaten, food: pick(free, choose, "the dot") }, timeBefore, choose);
}
