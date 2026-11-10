/**
 * The status line of an ended game (docs/SPEC.md 2.8, 3), as a pure function of the game state.
 */
import type { EndReason, GameState } from "./game";

/** The reason an ended game gives, by why it ended (docs/SPEC.md 2.8). */
const END_REASON: Readonly<Record<EndReason, string>> = {
  wall: "Game over: you hit the wall.",
  obstacle: "Game over: you hit an obstacle.",
  self: "Game over: you ran into yourself.",
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
