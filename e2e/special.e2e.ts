import type { Locator, Page } from "@playwright/test";
import {
  answer,
  expect,
  expectGame,
  type Heading,
  openGame,
  runTicks,
  STARTS,
  STORAGE_KEY,
  startIndex,
  test,
} from "./helpers";

// The special levels in the browser (docs/SPEC.md 2.9, 2.10 (2), 2.12). The page's random answers
// are fixed by each test (helpers.ts): every level starts at (10,10) heading right, its obstacles go
// to row 0 (answer 0 picks the first free cell), and its 5 dots lie one after another straight ahead,
// at (11,10) to (15,10); level 5 then starts where the test says.

/** The delays of levels 1 to 4 and of the special level 5 (docs/SPEC.md 2.10 (2), 2.12 (2)). */
const DELAYS = [125, 120, 115, 110];
const LEVEL_5_DELAY = 55;

/**
 * The answers for level `level` (1 to 4): the start, its `level - 1` obstacles in row 0, and its 5
 * dots. Each dot is free cell 211 - level: the 211 cells before (11,10), less the start, the
 * obstacles and the snake's cells left of it. The k-th dot is picked from 400 - level - (k - 1)
 * free cells, the snake covering k cells of row 10 by then.
 */
function straightLevel(level: number): number[] {
  return [
    answer(startIndex("10,10", "right"), STARTS),
    ...Array.from({ length: level - 1 }, () => 0),
    ...[0, 1, 2, 3, 4].map((k) => answer(211 - level, 400 - level - k)),
  ];
}

/** Answers that lay out level 5 from `start` heading `heading`, its 4 obstacles in row 0. */
function level5(start: string, heading: Heading, dotIndex: number): number[] {
  return [answer(startIndex(start, heading), STARTS), 0, 0, 0, 0, answer(dotIndex, 395)];
}

/** Plays levels 1 to 4 to their ends: each starts heading right and eats its 5 dots in 5 ticks. */
async function playToLevel5(page: Page, game: Locator): Promise<void> {
  for (const [index, delay] of DELAYS.entries()) {
    await expect(game).toHaveAttribute("data-level", String(index + 1));
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 5, delay);
  }
  await expect(game).toHaveAttribute("data-level", "5");
  await expect(game).toHaveAttribute("data-status", "ready");
}

/** Opens the game with levels 1 to 4 laid out straight and level 5 from `start`. */
async function openToLevel5(page: Page, start: string, heading: Heading, dotIndex: number) {
  const random = [1, 2, 3, 4].flatMap(straightLevel).concat(level5(start, heading, dotIndex));
  const game = await openGame(page, random);
  await playToLevel5(page, game);
  return game;
}

test("a normal level shows no special values; level 5 is special, with its limits and half the delay", async ({
  page,
}) => {
  const special = page.locator("#special");
  // (19,19) is free cell 394 of 395 on level 5: out of the way.
  const random = [1, 2, 3, 4].flatMap(straightLevel).concat(level5("10,10", "up", 394));
  const game = await openGame(page, random);
  await expect(game).toHaveAttribute("data-special", "false");
  await expect(special).toBeHidden();

  await playToLevel5(page, game);
  await expect(game).toHaveAttribute("data-score", "20");
  await expect(game).toHaveAttribute("data-special", "true");
  await expect(game).toHaveAttribute("data-delay", String(LEVEL_5_DELAY));
  await expect(special).toBeVisible();
  await expect(page.locator("#turns-left")).toHaveText("20");
  await expect(page.locator("#seconds-left")).toHaveText("30");
  await expect(page.locator("#shield-left")).toHaveText("3");
  await expect(page.locator("#status")).toContainText("Level 5, special");
  await expect(page.locator("#status")).toContainText("20 turns");
  await expect(page.locator("#status")).toContainText("30 seconds");
  await expect(page.locator("#status")).toContainText("shield of 3");
});

test("a wall on level 5 takes a shield layer; the snake waits, then a turn moves it on and counts", async ({
  page,
}) => {
  const game = await openToLevel5(page, "10,10", "up", 394);
  // Starting the level is not a turn.
  await page.keyboard.press("ArrowUp");
  await runTicks(page, 10, LEVEL_5_DELAY);
  await expectGame(game, "running", "10,0");
  await expect(page.locator("#turns-left")).toHaveText("20");
  await expect(page.locator("#seconds-left")).toHaveText("30");

  await runTicks(page, 1, LEVEL_5_DELAY);
  await expectGame(game, "running", "10,0");
  await expect(game).toHaveAttribute("data-waiting", "true");
  await expect(page.locator("#shield-left")).toHaveText("2");
  await expect(page.locator("#status")).toContainText("Turn to go on");

  // While it waits, nothing moves.
  await runTicks(page, 20, LEVEL_5_DELAY);
  await expectGame(game, "running", "10,0");

  await page.keyboard.press("ArrowLeft");
  await expect(game).toHaveAttribute("data-waiting", "false");
  await expect(page.locator("#turns-left")).toHaveText("19");
  await runTicks(page, 1, LEVEL_5_DELAY);
  await expectGame(game, "running", "9,0");
  await expect(game).toHaveAttribute("data-score", "20");
});

test("the 21st turn on level 5 blows the snake up, and the best score is saved", async ({
  page,
}) => {
  // From (0,19) heading up the snake climbs a staircase, right and up in turn, and never meets
  // itself, a wall or an obstacle. (19,0) is free cell 15 of 395: out of the way.
  const game = await openToLevel5(page, "0,19", "up", 15);
  await page.keyboard.press("ArrowUp");
  await runTicks(page, 1, LEVEL_5_DELAY);
  for (let turn = 1; turn <= 20; turn++) {
    await page.keyboard.press(turn % 2 === 1 ? "ArrowRight" : "ArrowUp");
    await runTicks(page, 1, LEVEL_5_DELAY);
  }
  await expectGame(game, "running", "10,8");
  await expect(page.locator("#turns-left")).toHaveText("0");

  await page.keyboard.press("ArrowRight");
  await runTicks(page, 1, LEVEL_5_DELAY);
  await expectGame(game, "blown", "10,8");
  await expect(page.locator("#status")).toContainText("Blown up");
  await expect(game).toHaveAttribute("data-best", "20");
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe("20");

  await page.keyboard.press("Enter");
  await expect(game).toHaveAttribute("data-status", "ready");
  await expect(game).toHaveAttribute("data-level", "1");
});
