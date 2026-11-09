/**
 * The game rules of docs/SPEC.md 2.1 to 2.5, 2.8, 3 and 3.1, as pure functions over a game state.
 * No DOM and no timers. Every function returns a new state and never changes its arguments;
 * a command that the spec ignores returns the state it was given, unchanged.
 * The board size, start length and food chooser are passed in (docs/SPEC.md 3).
 */

export type Direction = "up" | "down" | "left" | "right";

/** A cell of the board: `x` from 0 (left), `y` from 0 (top). */
export type Cell = { readonly x: number; readonly y: number };

export type Status = "ready" | "running" | "paused" | "over" | "won";

/** Given the number of free cells, returns the index of the one to put the food on. */
export type FoodChooser = (freeCount: number) => number;

export interface GameState {
  /** Width and height of the square board, in cells. */
  readonly size: number;
  /** The snake's cells, head first. */
  readonly snake: readonly Cell[];
  readonly heading: Direction;
  /** Turns waiting for the next ticks, oldest first; at most `MAX_QUEUED_TURNS`. */
  readonly queue: readonly Direction[];
  /** The food's cell; `null` once the game is won. */
  readonly food: Cell | null;
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

function sameCell(a: Cell, b: Cell): boolean {
  return a.x === b.x && a.y === b.y;
}

function onBoard(cell: Cell, size: number): boolean {
  return cell.x >= 0 && cell.x < size && cell.y >= 0 && cell.y < size;
}

/**
 * Puts the food on a free cell (docs/SPEC.md 2.3): the free cells are listed row by row and the
 * chooser picks one by its index. Throws a RangeError if the index is not an integer from 0 to the
 * number of free cells minus one.
 */
function placeFood(size: number, snake: readonly Cell[], choose: FoodChooser): Cell {
  const taken = new Set(snake.map((cell) => cell.y * size + cell.x));
  const free: Cell[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!taken.has(y * size + x)) free.push({ x, y });
    }
  }
  const index = choose(free.length);
  const food = Number.isInteger(index) ? free[index] : undefined;
  if (food === undefined) {
    throw new RangeError(
      `food chooser returned ${index}; expected an integer from 0 to ${free.length - 1}`,
    );
  }
  return food;
}

/**
 * A new game in `ready` (docs/SPEC.md 2.1 (2), 3): the head at the board's centre (rounded down),
 * the body to its left, heading right, food placed, score 0, no queued turns.
 * Throws a RangeError if `size` is not a whole number of at least 1, if `startLength` is not a
 * whole number of at least 1, if the snake would not fit on the board, or if it leaves no free
 * cell for the food.
 */
export function newGame(options: {
  size: number;
  startLength: number;
  choose: FoodChooser;
}): GameState {
  const { size, startLength, choose } = options;
  if (!Number.isInteger(size) || size < 1) {
    throw new RangeError(`board size ${size}; expected a whole number of at least 1`);
  }
  const centre = Math.floor(size / 2);
  if (!Number.isInteger(startLength) || startLength < 1 || startLength > centre + 1) {
    throw new RangeError(
      `start length ${startLength}; expected a whole number from 1 to ${centre + 1}`,
    );
  }
  if (startLength >= size * size) {
    throw new RangeError(`a snake of ${startLength} leaves no free cell on a board of ${size}`);
  }
  const snake: Cell[] = [];
  for (let i = 0; i < startLength; i++) snake.push({ x: centre - i, y: centre });
  return {
    size,
    snake,
    heading: "right",
    queue: [],
    food: placeFood(size, snake, choose),
    score: 0,
    status: "ready",
  };
}

/**
 * A turn from a key or a swipe (docs/SPEC.md 2.1 (3), 2.4). In `ready`, any turn but the one
 * back into the neck starts the game with that heading. In `running`, a turn is checked against
 * the last queued turn, or the heading when none is queued: the same or the opposite direction is
 * ignored, and so is any turn while the queue is full. Elsewhere a turn is ignored.
 */
export function turn(state: GameState, direction: Direction): GameState {
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

/** The Start button (docs/SPEC.md 2.5): starts a `ready` game heading right; otherwise ignored. */
export function start(state: GameState): GameState {
  if (state.status !== "ready") return state;
  return { ...state, heading: "right", status: "running" };
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
 * One tick (docs/SPEC.md 2.2), only while `running`. A tick that ends the game (a wall or the
 * body) leaves the snake, food and score as they were and only sets the state to `over`. Filling
 * the board wins the game, with no food placed. Throws a RangeError if the chooser returns an
 * index that is not a free cell's, or if the state has a snake with no cells (no game made by
 * `newGame` has one).
 */
export function tick(state: GameState, choose: FoodChooser): GameState {
  if (state.status !== "running") return state;
  const [nextTurn, ...queue] = state.queue;
  const heading = nextTurn ?? state.heading;
  const head = state.snake[0];
  if (head === undefined) throw new RangeError("the snake has no cells");
  const step = STEP[heading];
  const newHead: Cell = { x: head.x + step.x, y: head.y + step.y };

  if (!onBoard(newHead, state.size)) return { ...state, status: "over" };
  const eats = state.food !== null && sameCell(newHead, state.food);
  const blocking = eats ? state.snake : state.snake.slice(0, -1);
  if (blocking.some((cell) => sameCell(cell, newHead))) return { ...state, status: "over" };

  const snake = eats ? [newHead, ...state.snake] : [newHead, ...state.snake.slice(0, -1)];
  if (!eats) return { ...state, snake, heading, queue };

  const score = state.score + 1;
  if (snake.length === state.size * state.size) {
    return { ...state, snake, heading, queue, food: null, score, status: "won" };
  }
  return { ...state, snake, heading, queue, food: placeFood(state.size, snake, choose), score };
}
