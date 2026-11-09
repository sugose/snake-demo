/**
 * The game rules of docs/SPEC.md 2.1 to 2.5, 2.8, 2.10, 2.11, 3 and 3.1, as pure functions over a
 * game state. No DOM and no timers. Every function returns a new state and never changes its
 * arguments; a command that the spec ignores returns the state it was given, unchanged.
 * The board size, start length, clear cells ahead, dots per level, delays and the chooser are
 * passed in (docs/SPEC.md 3).
 */

export type Direction = "up" | "down" | "left" | "right";

/** A cell of the board: `x` from 0 (left), `y` from 0 (top). */
export type Cell = { readonly x: number; readonly y: number };

export type Status = "ready" | "running" | "paused" | "over" | "won";

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

function ahead(cell: Cell, heading: Direction, distance: number): Cell {
  const step = STEP[heading];
  return { x: cell.x + distance * step.x, y: cell.y + distance * step.y };
}

function isWholeNumber(value: number, least: number): boolean {
  return Number.isInteger(value) && value >= least;
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
 * (fewer than `clearAhead + 1` cells a side), if the snake leaves no free cell for the dot, or if
 * the chooser returns an index out of range.
 */
export function newGame(options: {
  size: number;
  startLength: number;
  clearAhead: number;
  dotsPerLevel: number;
  choose: Chooser;
}): GameState {
  const { size, startLength, clearAhead, dotsPerLevel, choose } = options;
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
    throw new RangeError(`a snake of ${startLength} leaves no free cell on a board of ${size}`);
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
  };
}

/**
 * The delay between ticks on `level`, in milliseconds (docs/SPEC.md 2.10 (2)): `first` on level 1,
 * `step` shorter on each next level, and never shorter than `shortest`. Throws a RangeError if
 * `level` is not a whole number of at least 1.
 */
export function levelDelay(
  level: number,
  delays: { first: number; step: number; shortest: number },
): number {
  if (!isWholeNumber(level, 1)) {
    throw new RangeError(`level ${level}; expected a whole number of at least 1`);
  }
  return Math.max(delays.shortest, delays.first - delays.step * (level - 1));
}

/**
 * A turn from a key or a swipe (docs/SPEC.md 2.1 (3), 2.4). In `ready`, any turn but the one
 * opposite to the heading starts the game with that heading. In `running`, a turn is checked
 * against the last queued turn, or the heading when none is queued: the same or the opposite
 * direction is ignored, and so is any turn while the queue is full. Elsewhere a turn is ignored. A
 * value that is not one of the four directions (possible only past the type checker) is ignored in
 * every state.
 */
export function turn(state: GameState, direction: Direction): GameState {
  if (!Object.hasOwn(STEP, direction)) return state;
  if (state.status === "ready") {
    if (direction === OPPOSITE[state.heading]) return state;
    return { ...state, heading: direction, status: "running" };
  }
  if (state.status !== "running") return state;
  const last = state.queue[state.queue.length - 1] ?? state.heading;
  if (direction === last || direction === OPPOSITE[last]) return state;
  if (state.queue.length >= MAX_QUEUED_TURNS) return state;
  return { ...state, queue: [...state.queue, direction] };
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
    return { ...cleared, queue: [], obstacles: [], food: null, status: "won" };
  }
  return { ...cleared, ...layout, queue: [], level, dotsEaten: 0, status: "ready" };
}

/**
 * One tick (docs/SPEC.md 2.2), only while `running`. A tick that ends the game (a wall, an
 * obstacle or the body) leaves everything as it was and only sets the state to `over`. The body
 * is counted by segments: when the snake does not eat, its last segment does not count, but other
 * segments on the same cell do. The last dot of a level clears it and lays out the next one in the
 * same tick, with the same chooser; otherwise, leaving no free cell wins the game, with no dot
 * placed. Throws a RangeError if the chooser returns an index out of range, or if the state has a
 * snake with no segments (no game made by `newGame` has one).
 */
export function tick(state: GameState, choose: Chooser): GameState {
  if (state.status !== "running") return state;
  const [nextTurn, ...queue] = state.queue;
  const heading = nextTurn ?? state.heading;
  const head = state.snake[0];
  if (head === undefined) throw new RangeError("the snake has no segments");
  const newHead = ahead(head, heading, 1);

  if (!onBoard(newHead, state.size)) return { ...state, status: "over" };
  const eats = state.food !== null && sameCell(newHead, state.food);
  const body = eats ? state.snake : state.snake.slice(0, -1);
  if ([...state.obstacles, ...body].some((cell) => sameCell(cell, newHead))) {
    return { ...state, status: "over" };
  }

  const snake = eats ? [newHead, ...state.snake] : [newHead, ...state.snake.slice(0, -1)];
  if (!eats) return { ...state, snake, heading, queue };

  const eaten = {
    ...state,
    snake,
    heading,
    queue,
    score: state.score + 1,
    dotsEaten: state.dotsEaten + 1,
  };
  if (eaten.dotsEaten >= state.dotsPerLevel) return nextLevel(eaten, choose);
  const free = freeCells(state.size, [...snake, ...state.obstacles]);
  if (free.length === 0) return { ...eaten, food: null, status: "won" };
  return { ...eaten, food: pick(free, choose, "the dot") };
}
