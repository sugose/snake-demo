import { test as base, expect, type Locator, type Page } from "@playwright/test";

/** The spec's values (docs/SPEC.md 2.9, 2.10, 2.11, 3), as the tests expect the page to use them. */
export const TICK_MS = 125;
export const LEVEL_2_TICK_MS = 120;
export const STORAGE_KEY = "snake-demo.best";
const GRID = 20;
const CLEAR_AHEAD = 8;

/** The fake clock's start; any fixed time will do. */
const CLOCK_START = new Date("2026-01-01T00:00:00Z").getTime();

/**
 * Every test fails on a console error or an uncaught error in the page (web pack rule
 * "Clean console"), whatever else it checks.
 */
export const test = base.extend<{ consoleProblems: string[] }>({
  consoleProblems: [
    async ({ page }, use) => {
      const problems: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") problems.push(`console error: ${message.text()}`);
      });
      page.on("pageerror", (error) => problems.push(`uncaught error: ${error.message}`));
      await use(problems);
      expect(problems, "console errors or uncaught errors").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export type Heading = "up" | "right" | "down" | "left";

const STEP: Readonly<Record<Heading, readonly [number, number]>> = {
  up: [0, -1],
  right: [1, 0],
  down: [0, 1],
  left: [-1, 0],
};

/** The value of `Math.random` that makes the page's chooser answer `index` of `count`. */
export function answer(index: number, count: number): number {
  return (index + 0.5) / count;
}

/**
 * The starts of the 20 x 20 board with 8 cells ahead, in the spec's order (docs/SPEC.md 2.11 (2)):
 * row by row, and up, right, down, left within a cell.
 */
const START_LIST: ReadonlyArray<string> = (() => {
  const list: string[] = [];
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      for (const heading of ["up", "right", "down", "left"] as const) {
        const [dx, dy] = STEP[heading];
        const farX = x + CLEAR_AHEAD * dx;
        const farY = y + CLEAR_AHEAD * dy;
        if (farX >= 0 && farX < GRID && farY >= 0 && farY < GRID) list.push(`${x},${y} ${heading}`);
      }
    }
  }
  return list;
})();

export const STARTS = START_LIST.length;

/** The index of the start on `cell` ("x,y") heading `heading` in the spec's list of starts. */
export function startIndex(cell: string, heading: Heading): number {
  const index = START_LIST.indexOf(`${cell} ${heading}`);
  if (index < 0) throw new Error(`${cell} heading ${heading} is not a start`);
  return index;
}

/** The 8 cells ahead of a start on `cell` heading `heading`, as "x,y". */
export function cellsAhead(cell: string, heading: Heading): string[] {
  const [x = 0, y = 0] = cell.split(",").map(Number);
  const [dx, dy] = STEP[heading];
  return Array.from({ length: CLEAR_AHEAD }, (_, i) => `${x + (i + 1) * dx},${y + (i + 1) * dy}`);
}

/** The index of `cell` ("x,y") among the cells not in `taken`, listed row by row (docs/SPEC.md 2.3). */
export function freeIndex(cell: string, taken: readonly string[]): number {
  let index = 0;
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const here = `${x},${y}`;
      if (here === cell) return index;
      if (!taken.includes(here)) index++;
    }
  }
  throw new Error(`${cell} is not on the board`);
}

/** Answers for a new game at (10,10) heading `heading`, with the dot at (0,0), out of the way. */
export function centreStart(heading: Heading): number[] {
  return [answer(startIndex("10,10", heading), STARTS), answer(0, GRID * GRID - 1)];
}

/** The element that carries the game's state as data- attributes, for the tests only. */
export function gameOf(page: Page): Locator {
  return page.locator("#game");
}

/**
 * Opens the page with a fake clock and pauses it once loaded, so the tick timer only runs when a
 * test advances the clock with `page.clock.runFor`. `Math.random` in the page gives the `random`
 * answers in turn, over and over, so the start, the obstacles and the dots are placed the same way
 * every run (docs/SPEC.md 2.11 (2)). The default starts at (10,10) heading right, with the dot at
 * (0,0), out of the way of every test's path; a new game in the page draws the same again as long
 * as the snake has eaten nothing.
 */
export async function openGame(
  page: Page,
  random: number | readonly number[] = centreStart("right"),
): Promise<Locator> {
  const answers = typeof random === "number" ? [random] : [...random];
  await page.addInitScript((values) => {
    let next = 0;
    Math.random = () => {
      const value = values[next % values.length] ?? 0;
      next++;
      return value;
    };
  }, answers);
  await page.clock.install({ time: CLOCK_START });
  await page.goto("/");
  await page.clock.pauseAt(CLOCK_START + 60_000);
  const game = gameOf(page);
  await expect(game).toHaveAttribute("data-status", "ready");
  return game;
}

/** Runs the clock for `ticks` ticks of the game, `delay` milliseconds each. */
export async function runTicks(page: Page, ticks: number, delay = TICK_MS): Promise<void> {
  await page.clock.runFor(ticks * delay);
}

/** Checks the status and the head together. */
export async function expectGame(game: Locator, status: string, head: string): Promise<void> {
  await expect(game).toHaveAttribute("data-status", status);
  await expect(game).toHaveAttribute("data-head", head);
}

/** A swipe on the board from its centre by (dx, dy) CSS pixels, as a touch or mouse pointer. */
export async function swipe(
  page: Page,
  dx: number,
  dy: number,
  pointerType: "touch" | "mouse" = "touch",
): Promise<void> {
  const board = page.locator("#board");
  const box = await board.boundingBox();
  if (box === null) throw new Error("the board is not visible");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const common = { pointerId: 7, pointerType, isPrimary: true };
  await board.dispatchEvent("pointerdown", { ...common, clientX: x, clientY: y });
  await board.dispatchEvent("pointerup", { ...common, clientX: x + dx, clientY: y + dy });
}

/**
 * The colour drawn on the board at the cell `cell` ("x,y"), `dx` and `dy` cells away from its
 * centre, as "rgb(r, g, b)".
 */
export async function pixel(page: Page, cell: string, dx = 0, dy = 0): Promise<string> {
  return page.locator("#board").evaluate(
    (element, at) => {
      const board = element as HTMLCanvasElement;
      const [x = 0, y = 0] = at.cell.split(",").map(Number);
      const side = board.width / at.grid;
      const context = board.getContext("2d");
      if (context === null) throw new Error("no 2D canvas");
      const [r, g, b] = context.getImageData(
        Math.floor((x + 0.5 + at.dx) * side),
        Math.floor((y + 0.5 + at.dy) * side),
        1,
        1,
      ).data;
      return `rgb(${r}, ${g}, ${b})`;
    },
    { cell, dx, dy, grid: GRID },
  );
}

/** The board's CSS colour variable `name` (such as "--head"), as "rgb(r, g, b)". */
export async function boardColour(page: Page, name: string): Promise<string> {
  return page.locator("#board").evaluate((element, variable) => {
    const value = getComputedStyle(element).getPropertyValue(variable).trim();
    const probe = document.createElement("canvas").getContext("2d");
    if (probe === null) throw new Error("no 2D canvas");
    probe.fillStyle = value;
    probe.fillRect(0, 0, 1, 1);
    const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
    return `rgb(${r}, ${g}, ${b})`;
  }, name);
}
