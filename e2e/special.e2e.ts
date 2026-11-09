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
  await expect(page.locator("#status")).toHaveText(
    "Shield lost, 2 left. Turn left or right to go on.",
  );

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
  // 21 moves of 55 ms: 1155 ms of the level's 30 s, so 29 whole seconds are left (rounded up).
  await expect(page.locator("#seconds-left")).toHaveText("29");

  await page.keyboard.press("ArrowRight");
  await runTicks(page, 1, LEVEL_5_DELAY);
  await expectGame(game, "blown", "10,8");
  await expect(page.locator("#status")).toContainText("Blown up");
  await expect(page.locator("#seconds-left")).toHaveText("29");
  await expect(game).toHaveAttribute("data-best", "20");
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe("20");

  await page.keyboard.press("Enter");
  await expect(game).toHaveAttribute("data-status", "ready");
  await expect(game).toHaveAttribute("data-level", "1");
});

test.describe("the best score's bound of 4000 (docs/SPEC.md 2.9 (3))", () => {
  for (const [stored, shown] of [
    ["401", "401"],
    ["4000", "4000"],
    ["4001", "0"],
  ] as const) {
    test(`a stored "${stored}" reads as ${shown}`, async ({ page }) => {
      await page.addInitScript(([key, value]) => window.localStorage.setItem(key, value), [
        STORAGE_KEY,
        stored,
      ] as const);
      const game = await openGame(page);
      await expect(game).toHaveAttribute("data-best", shown);
      await expect(page.locator("#best")).toHaveText(shown);
    });
  }
});

test("each shielded crash says the layers left and which turns go on, and warns at none left", async ({
  page,
}) => {
  // Level 5 from (10,10) heading up, its 4 obstacles on (0,0) to (3,0), the dot on (19,19).
  const game = await openToLevel5(page, "10,10", "up", 394);
  const status = page.locator("#status");
  await page.keyboard.press("ArrowUp");
  await runTicks(page, 11, LEVEL_5_DELAY);
  await expectGame(game, "running", "10,0");
  await expect(status).toHaveText("Shield lost, 2 left. Turn left or right to go on.");

  // Paused while waiting, the paused line shows; resumed, the wait line is back.
  await page.keyboard.press("Space");
  await expect(game).toHaveAttribute("data-status", "paused");
  await expect(status).toHaveText("Paused. Space, P or Resume to go on");
  await page.keyboard.press("Space");
  await expect(game).toHaveAttribute("data-status", "running");
  await expect(status).toHaveText("Shield lost, 2 left. Turn left or right to go on.");

  // Left along row 0 into the obstacle on (3,0).
  await page.keyboard.press("ArrowLeft");
  await runTicks(page, 7, LEVEL_5_DELAY);
  await expectGame(game, "running", "4,0");
  await expect(status).toHaveText("Shield lost, 1 left. Turn up or down to go on.");

  // Down column 4 into the bottom wall.
  await page.keyboard.press("ArrowDown");
  await runTicks(page, 20, LEVEL_5_DELAY);
  await expectGame(game, "running", "4,19");
  await expect(page.locator("#shield-left")).toHaveText("0");
  await expect(status).toHaveText(
    "Shield lost, none left. Turn left or right to go on. The next crash ends the game.",
  );

  // Moving on, the status line is the usual one again.
  await page.keyboard.press("ArrowRight");
  await runTicks(page, 1, LEVEL_5_DELAY);
  await expectGame(game, "running", "5,19");
  await expect(status).toHaveText("Space or P to pause");
});

test("a 21st turn that ends a wait blows the snake up and shows only Blown up", async ({
  page,
}) => {
  // The staircase of the 21st-turn test, then up column 10 into the top wall.
  const game = await openToLevel5(page, "0,19", "up", 15);
  await page.keyboard.press("ArrowUp");
  await runTicks(page, 1, LEVEL_5_DELAY);
  for (let turn = 1; turn <= 20; turn++) {
    await page.keyboard.press(turn % 2 === 1 ? "ArrowRight" : "ArrowUp");
    await runTicks(page, 1, LEVEL_5_DELAY);
  }
  await expectGame(game, "running", "10,8");
  // 8 moves to (10,0), then the crash: 29 moves in all, under the first jump at 3 s.
  await runTicks(page, 9, LEVEL_5_DELAY);
  await expectGame(game, "running", "10,0");
  await expect(game).toHaveAttribute("data-waiting", "true");

  await page.keyboard.press("ArrowRight");
  await expectGame(game, "blown", "10,0");
  await expect(game).toHaveAttribute("data-waiting", "true");
  await expect(page.locator("#status")).toHaveText("Blown up! Enter or New game to play again");
});

test.describe('the blinking "Special Level" text (docs/SPEC.md 2.12 (11))', () => {
  test("blinks twice a second over the board for 3 seconds from the level's layout, then goes", async ({
    page,
  }) => {
    const banner = page.locator("#banner");
    const random = [1, 2, 3, 4].flatMap(straightLevel).concat(level5("10,10", "up", 394));
    const game = await openGame(page, random);
    await expect(banner).toBeHidden();
    // Levels 1 to 4 are normal: no text when they are laid out.
    for (const [index, delay] of DELAYS.entries()) {
      await expect(game).toHaveAttribute("data-level", String(index + 1));
      await expect(banner).toBeHidden();
      await page.keyboard.press("ArrowRight");
      await runTicks(page, 5, delay);
    }
    await expect(game).toHaveAttribute("data-level", "5");
    await expect(banner).toBeVisible();
    await expect(banner).toHaveText("Special Level");
    for (let step = 1; step < 12; step++) {
      await page.clock.runFor(250);
      if (step % 2 === 1) await expect(banner).toBeHidden();
      else await expect(banner).toBeVisible();
    }
    // 2750 ms: shown; at 3000 ms it goes for good.
    await page.clock.runFor(250);
    await expect(banner).toBeHidden();
    await page.clock.runFor(1000);
    await expect(banner).toBeHidden();
    await expect(game).toHaveAttribute("data-status", "ready");
  });

  test("goes as soon as the level starts, and does not block the turn", async ({ page }) => {
    const banner = page.locator("#banner");
    const game = await openToLevel5(page, "10,10", "up", 394);
    await expect(banner).toBeVisible();
    // Swipes on the board go through it.
    await expect(banner).toHaveCSS("pointer-events", "none");
    // A turn that is ignored (straight back) leaves it.
    await page.keyboard.press("ArrowDown");
    await expect(game).toHaveAttribute("data-status", "ready");
    await expect(banner).toBeVisible();
    await page.keyboard.press("ArrowUp");
    await expect(game).toHaveAttribute("data-status", "running");
    await expect(banner).toBeHidden();
    await runTicks(page, 10, LEVEL_5_DELAY);
    await expect(banner).toBeHidden();
    await expectGame(game, "running", "10,0");
  });

  test("goes with a new game", async ({ page }) => {
    const banner = page.locator("#banner");
    await openToLevel5(page, "10,10", "up", 394);
    await expect(banner).toBeVisible();
    await page.getByRole("button", { name: "New game", exact: true }).click();
    await expect(banner).toBeHidden();
    await page.clock.runFor(500);
    await expect(banner).toBeHidden();
  });
});
