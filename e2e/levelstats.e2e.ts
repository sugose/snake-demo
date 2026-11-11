import type { Locator, Page } from "@playwright/test";
import {
  answer,
  cellsAhead,
  expect,
  expectGame,
  focusNothing,
  freeIndex,
  openGame,
  runTicks,
  STARTS,
  splitPanel,
  startIndex,
  test,
} from "./helpers";

// The turns and the time of every level on the page (docs/SPEC.md 2.18 (1) to (3), 2.13 (5)). The
// page's random answers are fixed by each test (helpers.ts).

const LEVEL_5_DELAY = 55;

/** Level 1 from (10,10) heading right, its 5 dots straight ahead, then level 2's layout. */
const LEVEL_1_THEN_2 = [
  answer(startIndex("10,10", "right"), STARTS),
  ...[1, 2, 3, 4, 5].map((k) => answer(210, 400 - k)),
  answer(startIndex("10,10", "up"), STARTS),
  answer(freeIndex("0,0", ["10,10", ...cellsAhead("10,10", "up")]), 400 - 9),
  answer(freeIndex("1,0", ["10,10", "0,0"]), 398),
];

/** Level 5 from (10,10) heading right, its 4 obstacles in row 0 and its dot on (19,19). */
const LEVEL_5 = [answer(startIndex("10,10", "right"), STARTS), 0, 0, 0, 0, answer(394, 395)];

/** The element showing "<label> <value>", found by its whole text. */
const shown = (page: Page, text: string): Locator => page.getByText(text, { exact: true });

/** The level's turns and time, in whole: the `data-` attributes of the game element (tests only). */
async function stats(game: Locator): Promise<[string | null, string | null]> {
  return [await game.getAttribute("data-turns"), await game.getAttribute("data-time")];
}

async function logEvents(page: Page): Promise<string[]> {
  await page.getByRole("button", { name: "Log", exact: true }).click();
  const text = (await page.locator("#log-text").textContent()) ?? "";
  await page.keyboard.press("Escape");
  return splitPanel(text).lines.map((line) => line.replace(/^\[t=\d+ #\d+\] /, ""));
}

test("a new game shows Turns 0 and Time 0s next to the level, the score and the best score, and no special values", async ({
  page,
}) => {
  await openGame(page);
  await expect(shown(page, "Level 1")).toBeVisible();
  await expect(shown(page, "Score 0")).toBeVisible();
  await expect(shown(page, "Best 0")).toBeVisible();
  await expect(shown(page, "Turns 0")).toBeVisible();
  await expect(shown(page, "Time 0s")).toBeVisible();
  // The special values have their own labels and are hidden on a normal level.
  await expect(page.locator("#special")).toBeHidden();
  await expect(shown(page, "Turns left 20")).toBeHidden();
  await expect(shown(page, "Seconds left 30")).toBeHidden();
  await expect(shown(page, "Shield left 3")).toBeHidden();
  // They sit in the row of the level, the score and the best score.
  const row = page.locator(".scores");
  await expect(row).toContainText("Level 1");
  await expect(row).toContainText("Turns 0");
  await expect(row).toContainText("Time 0s");
});

test("the values are in no live region, so the page does not announce their changes", async ({
  page,
}) => {
  await openGame(page, LEVEL_5, "/?level=5");
  for (const id of ["level-turns", "level-time", "turns-left", "seconds-left", "shield-left"]) {
    const inLiveRegion = await page
      .locator(`#${id}`)
      .evaluate(
        (element) =>
          element.closest("[aria-live], [role=status], [role=alert], [role=log]") !== null,
      );
    expect(inLiveRegion, id).toBe(false);
  }
});

test("the time runs only while the snake moves: not in ready, not in paused, and whole seconds are rounded down", async ({
  page,
}) => {
  const game = await openGame(page);
  await runTicks(page, 10);
  await expect(shown(page, "Time 0s")).toBeVisible();
  expect(await stats(game)).toEqual(["0", "0"]);

  // The turn that starts the level is not counted.
  await page.keyboard.press("ArrowRight");
  await expect(game).toHaveAttribute("data-status", "running");
  await expect(shown(page, "Turns 0")).toBeVisible();

  await runTicks(page, 7);
  expect(await stats(game)).toEqual(["0", "875"]);
  await expect(shown(page, "Time 0s")).toBeVisible();
  await runTicks(page, 1);
  expect(await stats(game)).toEqual(["0", "1000"]);
  await expect(shown(page, "Time 1s")).toBeVisible();

  // Paused: the clock may run on, the time does not.
  await focusNothing(page);
  await page.keyboard.press("p");
  await expect(game).toHaveAttribute("data-status", "paused");
  await runTicks(page, 5);
  expect(await stats(game)).toEqual(["0", "1000"]);
  await page.keyboard.press("p");
  await runTicks(page, 1);
  expect(await stats(game)).toEqual(["0", "1125"]);
  await expect(shown(page, "Time 1s")).toBeVisible();
});

test("a turn is counted when the tick takes it, not when it is pressed, queued, ignored or the start turn", async ({
  page,
}) => {
  const game = await openGame(page);
  await page.keyboard.press("ArrowRight");
  await runTicks(page, 1);
  await expect(shown(page, "Turns 0")).toBeVisible();

  await page.keyboard.press("ArrowRight"); // same direction: ignored
  await page.keyboard.press("ArrowLeft"); // straight back: ignored
  await page.keyboard.press("ArrowUp"); // queued
  await expect(shown(page, "Turns 0")).toBeVisible();
  await runTicks(page, 1);
  await expect(shown(page, "Turns 1")).toBeVisible();

  // Two turns in one tick: the second is kept for the next tick.
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowRight"); // queue full: ignored
  await expect(shown(page, "Turns 1")).toBeVisible();
  await runTicks(page, 1);
  await expect(shown(page, "Turns 2")).toBeVisible();
  await runTicks(page, 1);
  await expect(shown(page, "Turns 3")).toBeVisible();
  expect(await stats(game)).toEqual(["3", "500"]);
});

test("the Start button starts the level and counts no turn", async ({ page }) => {
  const game = await openGame(page);
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await runTicks(page, 2);
  await expect(game).toHaveAttribute("data-status", "running");
  expect(await stats(game)).toEqual(["0", "250"]);
});

test("a game that ends keeps its last turns and time; the crash tick adds no time; a new game starts at 0", async ({
  page,
}) => {
  const game = await openGame(page);
  await page.keyboard.press("ArrowRight");
  await runTicks(page, 3);
  await page.keyboard.press("ArrowUp");
  await runTicks(page, 1);
  expect(await stats(game)).toEqual(["1", "500"]);
  // Up from (13,9) to (13,0) takes 9 more ticks, the next one hits the wall.
  await runTicks(page, 8);
  await expectGame(game, "running", "13,1");
  await runTicks(page, 1);
  await expectGame(game, "running", "13,0");
  expect(await stats(game)).toEqual(["1", "1625"]);
  await runTicks(page, 1);
  await expect(game).toHaveAttribute("data-status", "over");
  expect(await stats(game)).toEqual(["1", "1625"]);
  await expect(shown(page, "Turns 1")).toBeVisible();
  await expect(shown(page, "Time 1s")).toBeVisible();

  await focusNothing(page);
  await page.keyboard.press("Enter");
  await expect(game).toHaveAttribute("data-status", "ready");
  expect(await stats(game)).toEqual(["0", "0"]);
  await expect(shown(page, "Turns 0")).toBeVisible();
  await expect(shown(page, "Time 0s")).toBeVisible();
});

test("a turn queued for the tick that hits the wall is counted: the game ends with it, the time of the crash tick is not", async ({
  page,
}) => {
  const game = await openGame(page);
  await page.keyboard.press("ArrowUp"); // starts the level, not counted
  await runTicks(page, 10);
  await expectGame(game, "running", "10,0");
  await page.keyboard.press("ArrowRight");
  await runTicks(page, 1);
  await expectGame(game, "running", "11,0");
  expect(await stats(game)).toEqual(["1", "1375"]);
  await page.keyboard.press("ArrowUp"); // queued; the next tick takes it into the wall
  await expect(shown(page, "Turns 1")).toBeVisible();
  await runTicks(page, 1);
  await expect(game).toHaveAttribute("data-status", "over");
  await expect(page.locator("#status")).toContainText("Game over: you hit the wall.");
  expect(await stats(game)).toEqual(["2", "1375"]);
  await expect(shown(page, "Turns 2")).toBeVisible();
  await expect(shown(page, "Time 1s")).toBeVisible();

  // The log says the same: the counted turn, then the end.
  const events = await logEvents(page);
  expect(events).toContain("turn up counted 2");
  expect(events.at(-1)).toMatch(/^end over wall /);
});

test("a cleared level gives its turns and time to the log, and the next level starts at 0 and 0s", async ({
  page,
}) => {
  const game = await openGame(page, LEVEL_1_THEN_2);
  await page.keyboard.press("ArrowRight");
  await runTicks(page, 5);
  await expect(game).toHaveAttribute("data-level", "2");
  await expect(game).toHaveAttribute("data-status", "ready");
  expect(await stats(game)).toEqual(["0", "0"]);
  await expect(shown(page, "Level 2")).toBeVisible();
  await expect(shown(page, "Turns 0")).toBeVisible();
  await expect(shown(page, "Time 0s")).toBeVisible();

  const events = await logEvents(page);
  expect(events).toContain("cleared level 1 turns=0 time=625 score=5");
});

test("a turn on a normal level is logged as counted with its number only; the cleared line has turns and time", async ({
  page,
}) => {
  // Level 1 heading right with the dots straight ahead: a turn to the side and back misses them,
  // so only the log of a turn is checked here.
  const game = await openGame(page);
  await page.keyboard.press("ArrowRight");
  await runTicks(page, 2);
  await page.keyboard.press("ArrowUp");
  await runTicks(page, 1);
  await page.keyboard.press("ArrowRight");
  await runTicks(page, 1);
  await expect(shown(page, "Turns 2")).toBeVisible();
  const events = await logEvents(page);
  expect(events).toContain("turn up counted 1");
  expect(events).toContain("turn right counted 2");
  expect(events.some((event) => /counted \d+\//.test(event))).toBe(false);
  await expect(game).toHaveAttribute("data-status", "running");
});

test("a special level shows five values by their whole labels: Turns, Time, Turns left, Seconds left, Shield left", async ({
  page,
}) => {
  const game = await openGame(page, LEVEL_5, "/?level=5");
  await expect(shown(page, "Turns 0")).toBeVisible();
  await expect(shown(page, "Time 0s")).toBeVisible();
  await expect(shown(page, "Turns left 20")).toBeVisible();
  await expect(shown(page, "Seconds left 30")).toBeVisible();
  await expect(shown(page, "Shield left 3")).toBeVisible();
  // "Turns" is the start of "Turns left": the labels are matched whole, so each matches one element.
  await expect(page.getByText(/^Turns \d+$/)).toHaveCount(1);
  await expect(page.getByText(/^Turns left \d+$/)).toHaveCount(1);
  await expect(page.getByText(/^Time \d+s$/)).toHaveCount(1);
  await expect(page.getByText(/^Seconds left \d+$/)).toHaveCount(1);
  await expect(page.getByText(/^Shield left \d+$/)).toHaveCount(1);
  // The old labels are gone.
  await expect(page.getByText(/^Seconds \d+$/)).toHaveCount(0);
  await expect(page.getByText(/^Shield \d+$/)).toHaveCount(0);
  await expect(game).toHaveAttribute("data-special", "true");
});

test("on a special level the time and the seconds left add up to 30, and the turns and turns left to 20", async ({
  page,
}) => {
  const game = await openGame(page, LEVEL_5, "/?level=5");
  await page.keyboard.press("ArrowRight");
  await runTicks(page, 8, LEVEL_5_DELAY);
  await page.keyboard.press("ArrowDown");
  await runTicks(page, 9, LEVEL_5_DELAY);
  await expectGame(game, "running", "18,19");
  await expect(shown(page, "Turns 1")).toBeVisible();
  await expect(shown(page, "Turns left 19")).toBeVisible();
  await expect(shown(page, "Time 0s")).toBeVisible();
  await expect(shown(page, "Seconds left 30")).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await runTicks(page, 2, LEVEL_5_DELAY);
  expect(await stats(game)).toEqual(["2", "1045"]);
  await expect(shown(page, "Turns 2")).toBeVisible();
  await expect(shown(page, "Turns left 18")).toBeVisible();
  await expect(shown(page, "Time 1s")).toBeVisible();
  await expect(shown(page, "Seconds left 29")).toBeVisible();
  await expect(shown(page, "Shield left 3")).toBeVisible();
});

test("a shielded crash on a special level adds no time, nor does the wait; the turn that ends the wait is not counted", async ({
  page,
}) => {
  const game = await openGame(page, LEVEL_5, "/?level=5");
  await page.keyboard.press("ArrowUp");
  await runTicks(page, 10, LEVEL_5_DELAY);
  await expectGame(game, "running", "10,0");
  expect(await stats(game)).toEqual(["0", "550"]);
  await runTicks(page, 1, LEVEL_5_DELAY);
  await expect(game).toHaveAttribute("data-waiting", "true");
  expect(await stats(game)).toEqual(["0", "550"]);
  await runTicks(page, 3, LEVEL_5_DELAY);
  expect(await stats(game)).toEqual(["0", "550"]);
  await page.keyboard.press("ArrowRight"); // free: ends the wait, not counted
  await expect(game).toHaveAttribute("data-waiting", "false");
  expect(await stats(game)).toEqual(["0", "550"]);
  await runTicks(page, 1, LEVEL_5_DELAY);
  expect(await stats(game)).toEqual(["0", "605"]);
  await expect(shown(page, "Turns 0")).toBeVisible();
  await expect(shown(page, "Turns left 20")).toBeVisible();
});

test("the Slow factor does not change the time: a move adds the level's delay, whatever the tick took", async ({
  page,
}) => {
  const game = await openGame(page, LEVEL_5, "/?level=5&slow");
  const slow = page.getByRole("button", { name: "Slow down", exact: true });
  await slow.click(); // x2
  await expect(game).toHaveAttribute("data-factor", "2");
  await page.keyboard.press("ArrowRight");
  await runTicks(page, 5, 2 * LEVEL_5_DELAY);
  expect(await stats(game)).toEqual(["0", "275"]);
  await slow.click(); // x4
  await expect(game).toHaveAttribute("data-factor", "4");
  await runTicks(page, 1, 2 * LEVEL_5_DELAY); // the tick already waiting keeps its delay
  await runTicks(page, 2, 4 * LEVEL_5_DELAY);
  expect(await stats(game)).toEqual(["0", "440"]);
});

test.describe("the layout", () => {
  test("at the longest values nothing scrolls sideways, on a normal and on a special level", async ({
    page,
  }) => {
    await openGame(page, LEVEL_5, "/?level=5");
    await expect(page.locator("#level-turns")).toBeVisible();
    await expect(page.locator("#level-time")).toBeVisible();
    const overflow = () =>
      page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
    expect(await overflow()).toBeLessThanOrEqual(0);
    // The longest numbers the page can show: level 80, the best bound 4000, 99999 turns, 99999 s.
    await page.evaluate(() => {
      const set = (id: string, text: string) => {
        const element = document.getElementById(id);
        if (element !== null) element.textContent = text;
      };
      set("level", "80");
      set("score", "4000");
      set("best", "4000");
      set("level-turns", "99999");
      set("level-time", "99999s");
      set("turns-left", "20");
      set("seconds-left", "30");
      set("shield-left", "3");
    });
    expect(await overflow()).toBeLessThanOrEqual(0);
    await expect(page.locator(".scores")).toBeVisible();
    await expect(page.locator("#special")).toBeVisible();
  });
});
