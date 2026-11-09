/**
 * Input mapping (docs/SPEC.md 2.6, 2.7, 3): key names and swipes to commands.
 * Pure: no DOM, no state; every result is a new value and no argument is changed.
 */

import type { Direction } from "./game";

/** What a key asks the game to do (docs/SPEC.md 2.5). */
export type Command =
  | { type: "turn"; direction: Direction }
  | { type: "pause" }
  | { type: "newGame" };

/** The modifier keys held with a key. Shift is left out on purpose: it does not change the command. */
export type Modifiers = { ctrl: boolean; meta: boolean; alt: boolean };

/** A point on the screen in CSS pixels; `y` grows downward. */
export type Point = { x: number; y: number };

const TURN_KEYS: Readonly<Record<string, Direction>> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  a: "left",
  s: "down",
  d: "right",
};

/**
 * Maps `KeyboardEvent.key` to a command, or null for a key that does nothing.
 * A key held with Ctrl, Meta or Alt gives null, so browser shortcuts are not taken as commands.
 */
export function keyToCommand(key: string, modifiers: Modifiers): Command | null {
  if (modifiers.ctrl || modifiers.meta || modifiers.alt) {
    return null;
  }
  if (key === "Enter") {
    return { type: "newGame" };
  }
  if (key === " " || key === "p" || key === "P") {
    return { type: "pause" };
  }
  // Only single letters are folded to lower case, so "ArrowUp" and other named keys stay exact.
  const name = key.length === 1 ? key.toLowerCase() : key;
  const direction = Object.hasOwn(TURN_KEYS, name) ? TURN_KEYS[name] : undefined;
  return direction === undefined ? null : { type: "turn", direction };
}

/**
 * Maps a swipe from `start` to `end` to the direction of its longer axis.
 * Gives null when the longer axis is shorter than `minDistance`, when both axes are equal
 * (an exact diagonal), or when any input is not a finite number.
 */
export function swipeToDirection(start: Point, end: Point, minDistance: number): Direction | null {
  if (![start.x, start.y, end.x, end.y, minDistance].every(Number.isFinite)) {
    return null;
  }
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  if (absX === absY || Math.max(absX, absY) < minDistance) {
    return null;
  }
  if (absX > absY) {
    return dx > 0 ? "right" : "left";
  }
  return dy > 0 ? "down" : "up";
}
