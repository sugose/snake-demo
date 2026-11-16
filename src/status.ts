/**
 * The status lines of an ended game (docs/SPEC.md 2.8) and of a snake waiting after a shielded
 * crash (2.12 (10)), as pure functions of the game state (docs/SPEC.md 3), and the record message
 * of 2.18 (9) and "First clear!" of 2.18 (10), a pure function of which records a clear set and whether
 * the level had records.
 */
import {
  type Direction,
  type EndReason,
  freeDirections,
  type GameState,
  specialInfo,
} from "./game";
import type { RecordsSet } from "./records";

/** The reason an ended game gives, by why it ended (docs/SPEC.md 2.8). */
const END_REASON: Readonly<Record<EndReason, string>> = {
  wall: "Game over: you hit the wall.",
  obstacle: "Game over: you hit an obstacle.",
  self: "Game over: you ran into yourself.",
  boxed: "Game over: you are boxed in.",
  turns: "Blown up: no turns left.",
  time: "Blown up: time ran out.",
  full: "You won! The board is full.",
  noRoom: "You won! There is no room for the next level.",
};

/**
 * The status line of an ended game: its reason, then "No shield left." for a wall or an obstacle on
 * a special level, then how to play again, or, while the name entry of docs/SPEC.md 2.15 (4) is
 * open, "Enter your name" (2.8). Throws a RangeError for a game that has not ended.
 */
export function endText(state: GameState, nameEntryOpen = false): string {
  if (state.ended === null) throw new RangeError(`the game has not ended (${state.status})`);
  const crashed = state.ended === "wall" || state.ended === "obstacle";
  const noShield = crashed && state.run !== null ? " No shield left." : "";
  const next = nameEntryOpen ? "Enter your name" : "Enter or New game to play again";
  return `${END_REASON[state.ended]}${noShield} ${next}`;
}

/** Names directions as the waiting line does: "up", "up or left", "up, down or left". */
function joinDirections(directions: readonly Direction[]): string {
  if (directions.length <= 1) return directions.join("");
  return `${directions.slice(0, -1).join(", ")} or ${directions[directions.length - 1]}`;
}

/**
 * The status line while the snake waits after a shielded crash (docs/SPEC.md 2.12 (10)): the
 * layers left, and the free directions that go on, in the order up, down, left, right. Throws a
 * RangeError for a snake that is not waiting.
 */
export function waitingText(state: GameState): string {
  const info = specialInfo(state);
  if (info === null || !state.run?.waiting) {
    throw new RangeError(`the snake is not waiting after a crash (${state.status})`);
  }
  const left = info.shieldLeft === 0 ? "none" : String(info.shieldLeft);
  const lost = `Shield lost, ${left} left. Turn ${joinDirections(freeDirections(state))} to go on.`;
  return info.shieldLeft === 0 ? `${lost} The next crash ends the game.` : lost;
}

/**
 * The text that opens the ready line of the next level after a clear (docs/SPEC.md 2.18 (9), (10)), to
 * be put before it with a space between. For a level that had records before the clear:
 * "New record: fewest turns." when the clear set only the fewest-turns record, "New record: fastest."
 * when it set only the fastest-time record, "New records: fewest turns and fastest." when it set both.
 * For a level that had none, "First clear!" when the clear set a record (the first clear of a level
 * sets both). `null`, for no message, when the clear set none.
 */
export function recordMessage(set: RecordsSet, hadRecords: boolean): string | null {
  if (!hadRecords) return set.fewest !== null || set.fastest !== null ? "First clear!" : null;
  if (set.fewest !== null && set.fastest !== null) return "New records: fewest turns and fastest.";
  if (set.fewest !== null) return "New record: fewest turns.";
  if (set.fastest !== null) return "New record: fastest.";
  return null;
}
