/**
 * The event log of docs/SPEC.md 2.13, as pure functions. Each takes the log so far and returns it
 * with the lines of one step added. The log keeps one thing of its own, the open stretch of moves
 * in one heading; every fact about the game comes from the states before and after the step and
 * from what src/game.ts reports (`ignoredBecause`, `crashed`, `cleared`, `freeDirections`).
 */
import {
  type Cell,
  type Delays,
  type Direction,
  freeDirections,
  type GameState,
  type IgnoreReason,
  levelDelay,
  type SpecialRules,
  specialInfo,
} from "./game";

/** The named values the first line gives (docs/SPEC.md 2.13 (3), 3). */
export interface LogValues {
  readonly size: number;
  readonly startLength: number;
  readonly clearAhead: number;
  readonly dotsPerLevel: number;
  readonly delays: Delays;
  readonly special: SpecialRules | null;
}

/** The time since the game was made, in whole milliseconds, and the tick count (2.13 (2)). */
export interface Stamp {
  readonly t: number;
  readonly k: number;
}

/** An input that makes a line (2.13 (4)). */
export type Input =
  | { readonly kind: "key"; readonly key: string; readonly command: string }
  | { readonly kind: "swipe"; readonly direction: Direction }
  | { readonly kind: "button"; readonly label: string };

/** The open stretch of moves in one heading, written when it ends (2.13 (5)). */
export interface Stretch {
  readonly heading: Direction;
  readonly cells: number;
  readonly head: Cell;
}

export interface Log {
  readonly lines: readonly string[];
  readonly stretch: Stretch | null;
  /** The named values, for the delay in a level's line. */
  readonly values: LogValues;
}

const cellText = (cell: Cell): string => `(${cell.x},${cell.y})`;
const cellsText = (cells: readonly Cell[]): string =>
  cells.length === 0 ? "-" : cells.map(cellText).join(",");
const stampText = (at: Stamp): string => `[t=${Math.round(at.t)} #${at.k}] `;
const sameCell = (a: Cell | null | undefined, b: Cell | null | undefined): boolean =>
  a != null && b != null && a.x === b.x && a.y === b.y;
const sameCells = (a: readonly Cell[], b: readonly Cell[]): boolean =>
  a.length === b.length && a.every((cell, i) => sameCell(cell, b[i]));

function add(log: Log, at: Stamp, ...events: string[]): Log {
  return { ...log, lines: [...log.lines, ...events.map((event) => stampText(at) + event)] };
}

/** Writes the open stretch, if it has a move, and closes it. */
function flush(log: Log, at: Stamp): Log {
  if (log.stretch === null) return log;
  const { heading, cells, head } = log.stretch;
  const closed = { ...log, stretch: null };
  return cells > 0 ? add(closed, at, `move ${heading} ${cells} head=${cellText(head)}`) : closed;
}

/** The first line: the build and the named values (2.13 (3)). */
export function firstLine(build: string, values: LogValues): string {
  const { delays, special } = values;
  const common =
    `snake-demo build=${build} size=${values.size} start-length=${values.startLength}` +
    ` clear-ahead=${values.clearAhead} dots=${values.dotsPerLevel}` +
    ` delays=${delays.first}/${delays.step}/${delays.shortest}`;
  if (special === null) return `${common} special=none`;
  return (
    `${common} special-every=${special.every} shield=${special.shieldLayers}` +
    ` turns=${special.maxTurns} seconds=${special.seconds} jump=${special.jumpSeconds}` +
    ` clear-head=${special.clearAheadOfHead}`
  );
}

/** The line of a level laid out (2.13 (5)). */
function levelLine(game: GameState, values: LogValues): string {
  const special = values.special;
  const delay = levelDelay(
    game.level,
    special === null ? values.delays : { ...values.delays, every: special.every },
  );
  const head = game.snake[0];
  const kind = game.run === null ? "normal" : "special";
  const line =
    `level ${game.level} ${kind} delay=${delay} start=${head === undefined ? "-" : cellText(head)}` +
    ` ${game.heading} obstacles=${cellsText(game.obstacles)}` +
    ` dot=${game.food === null ? "-" : cellText(game.food)}`;
  const info = specialInfo(game);
  if (info === null) return line;
  return `${line} turns=${info.turnsLeft} seconds=${info.secondsLeft} shield=${info.shieldLeft}`;
}

/**
 * A new log: the first line, then, for a game made by the New game command, that input's line,
 * then the first level's line (2.13 (4)).
 */
export function startLog(
  first: string,
  at: Stamp,
  game: GameState,
  values: LogValues,
  input?: Input,
): Log {
  const log: Log = { lines: [first], stretch: null, values };
  const opened = input === undefined ? log : add(log, at, `${inputText(input)} used`);
  return add(opened, at, levelLine(game, values));
}

/** The log as text, one line each (2.13 (2)). */
export function logText(log: Log): string {
  return log.lines.join("\n");
}

function inputText(input: Input): string {
  if (input.kind === "key") return `key ${input.key} ${input.command}`;
  if (input.kind === "swipe") return `swipe ${input.direction}`;
  return `button ${input.label}`;
}

/** Pause and resume lines, from the states before and after (2.13 (4)). */
function pauseLines(log: Log, at: Stamp, before: GameState, after: GameState): Log {
  if (before.status === "running" && after.status === "paused")
    return add(flush(log, at), at, "pause");
  if (before.status === "paused" && after.status === "running") return add(log, at, "resume");
  return log;
}

/**
 * An input (2.13 (4), (5)): the input line, used or ignored with its reason, then what it did at
 * once: the turn that starts a level or ends a wait, or pause and resume. A queued turn gets its
 * line when a tick takes it.
 */
export function logInput(
  log: Log,
  at: Stamp,
  input: Input,
  ignored: IgnoreReason | "repeat" | null,
  before: GameState,
  after: GameState,
): Log {
  const used = ignored === null && after !== before;
  const reason = ignored ?? "state";
  let next = add(log, at, `${inputText(input)} ${used ? "used" : `ignored ${reason}`}`);
  if (!used) return next;
  if (before.status === "ready" && after.status === "running" && input.kind !== "button") {
    next = add(next, at, `turn ${after.heading} start`);
  } else if (before.run?.waiting && after.run !== null && !after.run.waiting) {
    next = add(next, at, `turn ${after.heading} free`);
  }
  return pauseLines(next, at, before, after);
}

/** The page hidden or shown (2.13 (4)); hiding pauses a running game. */
export function logPage(
  log: Log,
  at: Stamp,
  hidden: boolean,
  before: GameState,
  after: GameState,
): Log {
  return pauseLines(add(log, at, hidden ? "hidden" : "shown"), at, before, after);
}

/**
 * The log panel pausing a running game as it opens (2.13 (5), (6)): the open stretch ends, then
 * `pause log`.
 */
export function logPanelPause(log: Log, at: Stamp): Log {
  return add(flush(log, at), at, "pause log");
}

/** The log panel going on as it closes, when its opening paused the game (2.13 (5), (6)). */
export function logPanelResume(log: Log, at: Stamp): Log {
  return add(log, at, "resume log");
}

/**
 * One tick (2.13 (4), (5)): a queued turn taken, the head's move, a dot, a new dot, a shielded crash,
 * an obstacle jump, a level cleared and the next one laid out. The end of the game is `logEnd`'s.
 */
export function logTick(log: Log, at: Stamp, before: GameState, after: GameState): Log {
  if (after === before) return log;
  let next = log;
  const taken = before.run?.waiting ? undefined : before.queue[0];
  const newLevel = after.level !== before.level;
  const cleared = after.cleared !== before.cleared;
  if (taken !== undefined && !(after.status === "blown" && after.ended === "turns")) {
    next = flush(next, at);
    const counted = before.run !== null && before.special !== null;
    next = add(
      next,
      at,
      counted
        ? `turn ${taken} counted ${(before.run?.turns ?? 0) + 1}/${before.special?.maxTurns}`
        : `turn ${taken}`,
    );
  }
  const shielded =
    !newLevel &&
    before.run !== null &&
    after.run !== null &&
    after.run.shieldUsed > before.run.shieldUsed;
  if (shielded) {
    const free = freeDirections(after);
    return add(
      flush(next, at),
      at,
      `crash ${after.crashed} shield=${specialInfo(after)?.shieldLeft} free=${free.length === 0 ? "-" : free.join(",")}`,
    );
  }
  // The head's move: to the dot eaten when the tick cleared the level, else to the new head.
  const moved = newLevel
    ? before.food
    : sameCell(after.snake[0], before.snake[0])
      ? null
      : after.snake[0];
  if (moved == null) return next;
  const heading = taken ?? before.heading;
  const open = next.stretch;
  const cells = open !== null && open.heading === heading ? open.cells + 1 : 1;
  if (open !== null && open.heading !== heading) next = flush(next, at);
  next = { ...next, stretch: { heading, cells, head: moved } };

  const ate = cleared || after.dotsEaten > before.dotsEaten;
  if (ate) {
    const levelPoints = cleared ? (after.cleared?.special?.points ?? 0) : 0;
    const dotPoints = after.score - before.score - levelPoints;
    next = add(flush(next, at), at, `dot +${dotPoints} score=${before.score + dotPoints}`);
  }
  if (cleared) {
    const special = after.cleared?.special;
    next = add(
      next,
      at,
      special == null
        ? `cleared level ${before.level} score=${after.score}`
        : `cleared level ${before.level} points=${special.points} turns-left=${special.turnsLeft}` +
            ` seconds-left=${special.secondsLeft} shield-used=${special.shieldUsed} score=${after.score}`,
    );
    // A level that cannot be laid out ends the game (2.11): no next level's line.
    return newLevel ? add(next, at, levelLine(after, next.values)) : next;
  }
  if (ate && after.food !== null) next = add(next, at, `dot at ${cellText(after.food)}`);
  if (!sameCells(after.obstacles, before.obstacles)) {
    next = add(next, at, `jump obstacles=${cellsText(after.obstacles)}`);
  }
  return next;
}

/** The end of the game (2.13 (5)): the open stretch, then the state, the reason and the score. */
export function logEnd(log: Log, at: Stamp, game: GameState, madeBest: boolean): Log {
  const reason = (game.ended ?? "-").toLowerCase();
  return add(
    flush(log, at),
    at,
    `end ${game.status} ${reason} score=${game.score} best=${madeBest ? "yes" : "no"}`,
  );
}
