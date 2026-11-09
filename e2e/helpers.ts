import { test as base, expect, type Locator, type Page } from "@playwright/test";

/** The spec's values (docs/SPEC.md 2.2, 2.9, 3), as the tests expect the page to use them. */
export const TICK_MS = 1000 / 8;
export const STORAGE_KEY = "snake-demo.best";

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

/** The element that carries the game's state as data- attributes, for the tests only. */
export function gameOf(page: Page): Locator {
  return page.locator("#game");
}

/**
 * Opens the page with a fake clock and pauses it once loaded, so the tick timer only runs when a
 * test advances the clock with `page.clock.runFor`. `Math.random` in the page returns `random`,
 * so the food is placed the same way every run; the default 0 puts it on the first free cell,
 * (0,0), out of the way of every test's path.
 */
export async function openGame(page: Page, random = 0): Promise<Locator> {
  await page.addInitScript((value) => {
    Math.random = () => value;
  }, random);
  await page.clock.install({ time: CLOCK_START });
  await page.goto("/");
  await page.clock.pauseAt(CLOCK_START + 60_000);
  const game = gameOf(page);
  await expect(game).toHaveAttribute("data-status", "ready");
  return game;
}

/** Runs the clock for `ticks` ticks of the game. */
export async function runTicks(page: Page, ticks: number): Promise<void> {
  await page.clock.runFor(ticks * TICK_MS);
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
