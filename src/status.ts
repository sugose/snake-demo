/**
 * The status lines of an ended game (docs/SPEC.md 2.8) and of a snake waiting after a shielded
 * crash (2.12 (10)), as pure functions of the game state (docs/SPEC.md 3).
 */
import {
  type Direction,
  type EndReason,
  freeDirections,
  type GameState,
  specialInfo,
} from "./game";

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
 * a special level, then how to play again (docs/SPEC.md 2.8). Throws a RangeError for a game that
 * has not ended.
 */
export function endText(state: GameState): string {
  if (state.ended === null) throw new RangeError(`the game has not ended (${state.status})`);
  const crashed = state.ended === "wall" || state.ended === "obstacle";
  const noShield = crashed && state.run !== null ? " No shield left." : "";
  return `${END_REASON[state.ended]}${noShield} Enter or New game to play again`;
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
