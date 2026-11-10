import type { Locator, Page } from "@playwright/test";
import {
  answer,
  boardColour,
  cellsAhead,
  expect,
  expectGame,
  freeIndex,
  type Heading,
  LEVEL_2_TICK_MS,
  openGame,
  pixel,
  runTicks,
  STARTS,
  startIndex,
  TICK_MS,
  test,
} from "./helpers";

// Levels, obstacles and the rising speed in the browser (docs/SPEC.md 2.9 (1), 2.10, 2.11). The
// page's random answers are fixed by each test (helpers.ts).

/**
 * Level 1 from (10,10) heading right, its 5 dots one after another straight ahead: the k-th at
 * (10 + k, 10), free cell 210 of 400 - k (the snake takes k cells when it is placed).
 */
const LEVEL_1 = [
  answer(startIndex("10,10", "right"), STARTS),
  ...[1, 2, 3, 4, 5].map((k) => answer(210, 400 - k)),
];

/** Level 2 from (10,10) heading up, its one obstacle on `obstacle` and its dot on `dot`. */
function level2(obstacle: string, dot: string): number[] {
  const kept = ["10,10", ...cellsAhead("10,10", "up")];
  return [
    answer(startIndex("10,10", "up"), STARTS),
    answer(freeIndex(obstacle, kept), 400 - kept.length),
    answer(freeIndex(dot, ["10,10", obstacle]), 398),
  ];
}

/** Plays level 1 to its end: heading right, 5 dots in 5 ticks. */
async function clearLevel1(page: Page, game: Locator): Promise<void> {
  await page.keyboard.press("ArrowRight");
  await runTicks(page, 4);
  await expect(game).toHaveAttribute("data-level", "1");
  await expect(game).toHaveAttribute("data-score", "4");
  await runTicks(page, 1);
  await expect(game).toHaveAttribute("data-level", "2");
}

/** The `data-snake` of a snake of `length` segments, all on `cell`. */
const stackedOn = (cell: string, length: number) => Array.from({ length }, () => cell).join(";");

test.describe("the first level", () => {
  const cases: Array<[string, number[], string, Heading, string]> = [
    ["the first start", [answer(0, STARTS), answer(398, 399)], "0,0", "right", "8,0"],
    ["the last start", [answer(STARTS - 1, STARTS), answer(0, 399)], "19,19", "left", "11,19"],
  ];
  for (const [name, random, head, heading, eighth] of cases) {
    test(`has no obstacles, and ${name} has 8 free cells ahead`, async ({ page }) => {
      const game = await openGame(page, random);
      await expect(game).toHaveAttribute("data-level", "1");
      await expect(game).toHaveAttribute("data-obstacles", "");
      await expect(game).toHaveAttribute("data-snake", stackedOn(head, 3));
      await expect(game).toHaveAttribute("data-heading", heading);
      await page.getByRole("button", { name: "Start", exact: true }).click();
      await runTicks(page, 8);
      await expectGame(game, "running", eighth);
    });
  }
});

test("the head shows its heading while all the snake's segments share one cell", async ({
  page,
}) => {
  const game = await openGame(page);
  const head = await boardColour(page, "--head");
  const mark = await boardColour(page, "--mark");
  expect(mark).not.toBe(head);
  // Heading right: the mark is on the right of the head's cell, the left of it is plain head.
  expect(await pixel(page, "10,10", 0.2, 0)).toBe(mark);
  expect(await pixel(page, "10,10", -0.3, 0)).toBe(head);

  await page.keyboard.press("ArrowRight");
  await runTicks(page, 1);
  await expect(game).toHaveAttribute("data-snake", "11,10;10,10;10,10");
  expect(await pixel(page, "11,10", 0.2, 0)).toBe(head);
});

test("eating 5 dots clears level 1: level 2 waits in ready with one obstacle and the snake on one cell", async ({
  page,
}) => {
  const game = await openGame(page, [...LEVEL_1, ...level2("0,0", "1,0")]);
  await clearLevel1(page, game);

  await expectGame(game, "ready", "10,10");
  await expect(game).toHaveAttribute("data-score", "5");
  await expect(game).toHaveAttribute("data-length", "8");
  await expect(game).toHaveAttribute("data-snake", stackedOn("10,10", 8));
  await expect(game).toHaveAttribute("data-heading", "up");
  await expect(game).toHaveAttribute("data-obstacles", "0,0");
  await expect(game).toHaveAttribute("data-delay", String(LEVEL_2_TICK_MS));
  await expect(page.locator("#level")).toHaveText("2");
  await expect(page.locator("#score")).toHaveText("5");
  await expect(page.locator("#status")).toContainText("Level 2");
  await expect(page.locator("#status")).toContainText("Start");

  // The heading is marked on the head: up.
  const head = await boardColour(page, "--head");
  expect(await pixel(page, "10,10", 0, -0.2)).toBe(await boardColour(page, "--mark"));
  expect(await pixel(page, "10,10", 0, 0.3)).toBe(head);

  // The obstacle is drawn in its own colour, unlike the board, the snake and the dot.
  const obstacle = await boardColour(page, "--obstacle");
  expect(await pixel(page, "0,0")).toBe(obstacle);
  for (const other of ["--board", "--snake", "--head", "--food"]) {
    expect(await boardColour(page, other), other).not.toBe(obstacle);
  }

  // Nothing moves until the level is started.
  await runTicks(page, 8, LEVEL_2_TICK_MS);
  await expectGame(game, "ready", "10,10");
});

test("level 2 moves one cell per 120 ms", async ({ page }) => {
  const game = await openGame(page, [...LEVEL_1, ...level2("0,0", "1,0")]);
  await clearLevel1(page, game);
  await page.keyboard.press("ArrowUp");
  await expectGame(game, "running", "10,10");
  await page.clock.runFor(LEVEL_2_TICK_MS - 1);
  await expect(game).toHaveAttribute("data-head", "10,10");
  await page.clock.runFor(1);
  await expect(game).toHaveAttribute("data-head", "10,9");
  await page.clock.runFor(LEVEL_2_TICK_MS - 1);
  await expect(game).toHaveAttribute("data-head", "10,9");
  await page.clock.runFor(1);
  await expect(game).toHaveAttribute("data-head", "10,8");
});

test("hitting an obstacle ends the game", async ({ page }) => {
  const game = await openGame(page, [...LEVEL_1, ...level2("11,9", "0,0")]);
  await clearLevel1(page, game);
  await expect(game).toHaveAttribute("data-obstacles", "11,9");
  await page.keyboard.press("ArrowUp");
  await runTicks(page, 1, LEVEL_2_TICK_MS);
  await expectGame(game, "running", "10,9");
  await page.keyboard.press("ArrowRight");
  await runTicks(page, 1, LEVEL_2_TICK_MS);
  await expectGame(game, "over", "10,9");
  await expect(page.locator("#status")).toHaveText(
    "Game over: you hit an obstacle. Enter or New game to play again",
  );
  await expect(game).toHaveAttribute("data-score", "5");
});

test("the score counts on across a level change", async ({ page }) => {
  const game = await openGame(page, [...LEVEL_1, ...level2("0,0", "10,9")]);
  await clearLevel1(page, game);
  await page.keyboard.press("ArrowUp");
  await runTicks(page, 1, LEVEL_2_TICK_MS);
  await expectGame(game, "running", "10,9");
  await expect(game).toHaveAttribute("data-level", "2");
  await expect(game).toHaveAttribute("data-score", "6");
  await expect(game).toHaveAttribute("data-length", "9");
  await expect(page.locator("#score")).toHaveText("6");
});

test("New game returns to level 1 with the score 0", async ({ page }) => {
  // The answers come round again for the new game: it starts at (10,10) heading right.
  const game = await openGame(page, [...LEVEL_1, ...level2("0,0", "1,0")]);
  await clearLevel1(page, game);
  await page.getByRole("button", { name: "New game", exact: true }).click();
  await expectGame(game, "ready", "10,10");
  await expect(game).toHaveAttribute("data-level", "1");
  await expect(game).toHaveAttribute("data-score", "0");
  await expect(game).toHaveAttribute("data-length", "3");
  await expect(game).toHaveAttribute("data-obstacles", "");
  await expect(game).toHaveAttribute("data-delay", String(TICK_MS));
  await expect(page.locator("#level")).toHaveText("1");
  await expect(page.locator("#status")).toContainText("Level 1");
  await page.keyboard.press("ArrowRight");
  await runTicks(page, 1);
  await expect(game).toHaveAttribute("data-head", "11,10");
});

test.describe("a first turn into a wall or an obstacle (docs/SPEC.md 2.1 (3))", () => {
  test("on a start against the right wall, Right is ignored and Left starts the game", async ({
    page,
  }) => {
    const game = await openGame(page, [answer(startIndex("19,10", "up"), STARTS), answer(0, 399)]);
    await expectGame(game, "ready", "19,10");
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 3);
    await expectGame(game, "ready", "19,10");
    await expect(game).toHaveAttribute("data-heading", "up");
    await page.keyboard.press("ArrowLeft");
    await runTicks(page, 1);
    await expectGame(game, "running", "18,10");
  });

  test("on level 2, a turn onto the obstacle next to the start is ignored", async ({ page }) => {
    const game = await openGame(page, [...LEVEL_1, ...level2("11,10", "0,0")]);
    await clearLevel1(page, game);
    await expect(game).toHaveAttribute("data-obstacles", "11,10");
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 2, LEVEL_2_TICK_MS);
    await expectGame(game, "ready", "10,10");
    await page.keyboard.press("ArrowUp");
    await runTicks(page, 1, LEVEL_2_TICK_MS);
    await expectGame(game, "running", "10,9");
  });
});
