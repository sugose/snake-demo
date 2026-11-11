import { type EndReason, type GameState, newGame, type SpecialRules } from "./game";
import { endText, waitingText } from "./status";

// The status line of an ended game (docs/SPEC.md 2.8), whole.
const SPECIAL: SpecialRules = {
  every: 5,
  shieldLayers: 3,
  maxTurns: 20,
  seconds: 30,
  jumpSeconds: 3,
  clearAheadOfHead: 2,
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
    turns: special ? 20 : 0,
    timeMs: special ? 30000 : 0,
    run: special ? { shieldUsed: 3, waiting: false } : null,
  };
}

describe("endText (docs/SPEC.md 2.8)", () => {
  it.each<[EndReason, string]>([
    ["wall", "Game over: you hit the wall."],
    ["obstacle", "Game over: you hit an obstacle."],
    ["self", "Game over: you ran into yourself."],
    ["boxed", "Game over: you are boxed in."],
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
    ["boxed", "Game over: you are boxed in."],
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

  it.each<[EndReason, boolean, string]>([
    ["wall", false, "Game over: you hit the wall. Enter your name"],
    ["wall", true, "Game over: you hit the wall. No shield left. Enter your name"],
    ["turns", true, "Blown up: no turns left. Enter your name"],
    ["full", false, "You won! The board is full. Enter your name"],
    ["self", false, "Game over: you ran into yourself. Enter your name"],
  ])(
    "while the name entry is open, %s (special level: %s) ends in Enter your name (docs/SPEC.md 2.8)",
    (reason, special, text) => {
      expect(endText(ended(reason, special), true)).toBe(text);
    },
  );

  it("with the name entry not open, the line is as before", () => {
    expect(endText(ended("wall", false), false)).toBe(`Game over: you hit the wall. ${PLAY_AGAIN}`);
  });
});

describe("waitingText (docs/SPEC.md 2.12 (10))", () => {
  /** A snake waiting after a crash at (5,5), with `shieldUsed` layers used and these blocked cells. */
  function waiting(shieldUsed: number, obstacles: { x: number; y: number }[]): GameState {
    return {
      ...BASE,
      level: 5,
      status: "running",
      heading: "right",
      snake: [
        { x: 5, y: 5 },
        { x: 5, y: 5 },
      ],
      food: { x: 19, y: 19 },
      obstacles,
      turns: 3,
      timeMs: 1000,
      run: { shieldUsed, waiting: true },
    };
  }
  const right = { x: 6, y: 5 };
  const left = { x: 4, y: 5 };
  const up = { x: 5, y: 4 };
  const down = { x: 5, y: 6 };

  it.each<[string, { x: number; y: number }[], string]>([
    ["three", [right], "up, down or left"],
    ["two", [right, left], "up or down"],
    ["one", [right, left, up], "down"],
    ["two, one of them right", [up, left], "down or right"],
    ["two, down blocked", [right, down], "up or left"],
  ])("names %s free directions in the order up, down, left, right", (_, blocked, words) => {
    expect(waitingText(waiting(1, blocked))).toBe(`Shield lost, 2 left. Turn ${words} to go on.`);
  });

  it("with no layer left, warns that the next crash ends the game", () => {
    expect(waitingText(waiting(3, [right, left]))).toBe(
      "Shield lost, none left. Turn up or down to go on. The next crash ends the game.",
    );
  });

  it("says 1 left", () => {
    expect(waitingText(waiting(2, [right]))).toBe(
      "Shield lost, 1 left. Turn up, down or left to go on.",
    );
  });

  it("throws a RangeError for a snake that is not waiting", () => {
    expect(() => waitingText(BASE)).toThrow(RangeError);
  });
});
