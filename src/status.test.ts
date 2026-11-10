import { type EndReason, type GameState, newGame, type SpecialRules } from "./game";
import { endText } from "./status";

// The status line of an ended game (docs/SPEC.md 2.8), whole.
const SPECIAL: SpecialRules = {
  every: 5,
  shieldLayers: 3,
  maxTurns: 20,
  seconds: 30,
  jumpSeconds: 3,
  clearAheadOfHead: 2,
  delays: { first: 125, step: 5, shortest: 50 },
};
const BASE = newGame({
  size: 20,
  startLength: 3,
  clearAhead: 8,
  dotsPerLevel: 5,
  special: SPECIAL,
  choose: () => 0,
});
const PLAY_AGAIN = "Enter or New game to play again";

/** A game ended for `ended`, on a normal level or, with `special`, on a special one. */
function ended(reason: EndReason, special: boolean): GameState {
  const status =
    reason === "turns" || reason === "time"
      ? "blown"
      : reason === "full" || reason === "noRoom"
        ? "won"
        : "over";
  return {
    ...BASE,
    level: special ? 5 : 4,
    status,
    ended: reason,
    run: special ? { turns: 20, timeMs: 30000, shieldUsed: 3, waiting: false } : null,
  };
}

describe("endText (docs/SPEC.md 2.8)", () => {
  it.each<[EndReason, string]>([
    ["wall", "Game over: you hit the wall."],
    ["obstacle", "Game over: you hit an obstacle."],
    ["self", "Game over: you ran into yourself."],
    ["turns", "Blown up: no turns left."],
    ["time", "Blown up: time ran out."],
    ["full", "You won! The board is full."],
    ["noRoom", "You won! There is no room for the next level."],
  ])("on a normal level, %s gives the reason, then how to play again", (reason, text) => {
    expect(endText(ended(reason, false))).toBe(`${text} ${PLAY_AGAIN}`);
  });

  it.each<[EndReason, string]>([
    ["wall", "Game over: you hit the wall. No shield left."],
    ["obstacle", "Game over: you hit an obstacle. No shield left."],
    ["self", "Game over: you ran into yourself."],
    ["turns", "Blown up: no turns left."],
    ["time", "Blown up: time ran out."],
    ["full", "You won! The board is full."],
    ["noRoom", "You won! There is no room for the next level."],
  ])("on a special level, %s gives %p and how to play again", (reason, text) => {
    expect(endText(ended(reason, true))).toBe(`${text} ${PLAY_AGAIN}`);
  });

  it("throws a RangeError for a game that has not ended", () => {
    expect(() => endText(BASE)).toThrow(RangeError);
  });
});
