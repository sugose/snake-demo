import type { Locator, Page } from "@playwright/test";
import {
  answer,
  cellsAhead,
  expect,
  expectGame,
  freeIndex,
  type Heading,
  openGame,
  runTicks,
  STARTS,
  STORAGE_KEY,
  splitPanel,
  startIndex,
  test,
} from "./helpers";

// The playtest options in the browser (docs/SPEC.md 2.14, and 2.1 (2), 2.5, 2.9 (2), 2.10, 2.11,
// 2.12 (3), 2.13). The page's random answers are fixed by each test (helpers.ts).

const GRID = 20;
const LEVEL_5_DELAY = 55;
/** The delays of levels 4 and 6: 110 ms, and 105 ms since the special level 5 is not counted. */
const LEVEL_4_DELAY = 110;
const LEVEL_6_DELAY = 105;

/**
 * The answers that lay out `level` from `start` heading `heading` and then place its dots one
 * after another on `dots` (docs/SPEC.md 2.11): the start, the level's `level - 1` obstacles (each
 * the first free cell, row by row, off the start and the 8 cells ahead of it), then the first dot
 * at laying out and each next dot when the one before is eaten. The snake goes straight through
 * the dots, so it covers the start and the dots eaten so far.
 */
function layout(level: number, start: string, heading: Heading, dots: readonly string[]): number[] {
  const kept = [start, ...cellsAhead(start, heading)];
  const obstacles: string[] = [];
  for (let y = 0; y < GRID && obstacles.length < level - 1; y++) {
    for (let x = 0; x < GRID && obstacles.length < level - 1; x++) {
      if (!kept.includes(`${x},${y}`)) obstacles.push(`${x},${y}`);
    }
  }
  const random = [answer(startIndex(start, heading), STARTS), ...obstacles.map(() => 0)];
  dots.forEach((dot, eaten) => {
    const taken = [start, ...dots.slice(0, eaten), ...obstacles];
    random.push(answer(freeIndex(dot, taken), GRID * GRID - taken.length));
  });
  return random;
}

/** Five dots in a row straight ahead of (10,10) heading right: eaten in five ticks. */
const DOTS_RIGHT = ["11,10", "12,10", "13,10", "14,10", "15,10"];
/** The cell far from every path of these tests. */
const FAR = "19,19";

/** Level `level` from (10,10) heading right, its dots straight ahead. */
const straight = (level: number): number[] => layout(level, "10,10", "right", DOTS_RIGHT);
/** Level `level` from (10,10) heading right with its only dot out of the way. */
const waiting = (level: number): number[] => layout(level, "10,10", "right", [FAR]);

const slowButton = (page: Page): Locator =>
  page.getByRole("button", { name: "Slow down", exact: true });

/** The log's first line and lines without stamps; opens the panel and closes it again. */
async function readLog(page: Page): Promise<{ first: string; events: string[]; raw: string[] }> {
  await page.getByRole("button", { name: "Log", exact: true }).click();
  const text = (await page.locator("#log-text").textContent()) ?? "";
  await page.keyboard.press("Escape");
  const [first = "", ...rest] = splitPanel(text).lines;
  return { first, events: rest.map((line) => line.replace(/^\[t=\d+ #\d+\] /, "")), raw: rest };
}

async function factor(game: Locator): Promise<string | null> {
  return game.getAttribute("data-factor");
}

// ---- ?level=N (2.14 (2)) ----

test("?level=5 starts at the special level 5: its obstacles, delay, limits and status line", async ({
  page,
}) => {
  const game = await openGame(page, waiting(5), "/?level=5");
  await expect(game).toHaveAttribute("data-status", "ready");
  await expect(game).toHaveAttribute("data-level", "5");
  await expect(page.locator("#level")).toHaveText("5");
  await expect(page.locator("#score")).toHaveText("0");
  await expect(game).toHaveAttribute("data-special", "true");
  await expect(game).toHaveAttribute("data-delay", String(LEVEL_5_DELAY));
  await expect(game).toHaveAttribute("data-length", "3");
  await expect(game).toHaveAttribute("data-obstacles", "0,0;1,0;2,0;3,0");
  await expect(page.locator("#special")).toBeVisible();
  await expect(page.locator("#turns-left")).toHaveText("20");
  await expect(page.locator("#seconds-left")).toHaveText("30");
  await expect(page.locator("#shield-left")).toHaveText("3");
  await expect(page.locator("#status")).toContainText("Level 5, special: 20 turns, 30 seconds");
});

test("?level=4 starts at the normal level 4 with 3 obstacles and no special values", async ({
  page,
}) => {
  const game = await openGame(page, waiting(4), "/?level=4");
  await expect(game).toHaveAttribute("data-level", "4");
  await expect(game).toHaveAttribute("data-delay", String(LEVEL_4_DELAY));
  await expect(game).toHaveAttribute("data-obstacles", "0,0;1,0;2,0");
  await expect(game).toHaveAttribute("data-special", "false");
  await expect(page.locator("#special")).toBeHidden();
  await expect(page.locator("#status")).toContainText("Level 4.");
});

test("?level=99, the highest start level, lays out 98 obstacles", async ({ page }) => {
  const game = await openGame(page, waiting(99), "/?level=99");
  await expect(game).toHaveAttribute("data-level", "99");
  await expect(game).toHaveAttribute("data-status", "ready");
  const obstacles = (await game.getAttribute("data-obstacles")) ?? "";
  expect(obstacles.split(";")).toHaveLength(98);
  // The 50 ms floor of the normal levels.
  await expect(game).toHaveAttribute("data-delay", "50");
});

test("clearing the start level goes on to the next as usual, with the points of the formula", async ({
  page,
}) => {
  const random = [...straight(5), ...waiting(6)];
  const game = await openGame(page, random, "/?level=5");
  await page.keyboard.press("ArrowRight");
  await runTicks(page, 5, LEVEL_5_DELAY);
  await expect(game).toHaveAttribute("data-level", "6");
  await expect(game).toHaveAttribute("data-status", "ready");
  // 20 turns and 30 whole seconds left (275 ms used), no layer used: (20 + 30) x 3/3.
  await expect(game).toHaveAttribute("data-score", "50");
  await expect(game).toHaveAttribute("data-delay", String(LEVEL_6_DELAY));
  await expect(game).toHaveAttribute("data-special", "false");
  await expect(page.locator("#slow")).toBeHidden();
});

test("every new game of the page starts at the start level: Enter and the New game button", async ({
  page,
}) => {
  // Only the six answers of the layout are used before each new game, so they come round again.
  const game = await openGame(page, waiting(5), "/?level=5");
  await page.keyboard.press("Enter");
  await expect(game).toHaveAttribute("data-level", "5");
  await expect(game).toHaveAttribute("data-status", "ready");
  await expect(game).toHaveAttribute("data-obstacles", "0,0;1,0;2,0;3,0");
  await page.getByRole("button", { name: "New game", exact: true }).click();
  await expect(game).toHaveAttribute("data-level", "5");
  await expect(game).toHaveAttribute("data-score", "0");
  await expect(game).toHaveAttribute("data-length", "3");
});

test("a new game after the page's game was played and ended is at the start level again", async ({
  page,
}) => {
  // Level 5 from (10,8) heading up; four crashes into the top wall end it, 9 ticks to the first.
  const game = await openGame(page, layout(5, "10,8", "up", [FAR]), "/?level=5");
  await page.keyboard.press("ArrowUp");
  await runTicks(page, 9, LEVEL_5_DELAY);
  await expect(game).toHaveAttribute("data-waiting", "true");
  await page.keyboard.press("Enter");
  await expect(game).toHaveAttribute("data-level", "5");
  await expect(game).toHaveAttribute("data-status", "ready");
  await expect(game).toHaveAttribute("data-waiting", "false");
});

test("the address is read once: a later change of it does nothing", async ({ page }) => {
  const game = await openGame(page, waiting(5), "/?level=5");
  await page.evaluate(() => history.replaceState(null, "", "/?level=7&slow"));
  await page.keyboard.press("Enter");
  await expect(game).toHaveAttribute("data-level", "5");
  await expect(slowButton(page)).toBeHidden();
});

// Values of `level` that are not valid: the game starts at level 1, and the page is not a
// playtest page (docs/SPEC.md 2.14 (2)).
const INVALID = [
  ["no value", "?level"],
  ["an empty value", "?level="],
  ["zero", "?level=0"],
  ["a leading zero", "?level=05"],
  ["above the highest", "?level=100"],
  ["a negative number", "?level=-5"],
  ["a decimal", "?level=5.5"],
  ["text", "?level=abc"],
  ["a plus sign", "?level=+5"],
  ["an exponent", "?level=1e1"],
  ["the second of two", "?level=abc&level=5"],
  ["a name in capitals", "?LEVEL=5"],
] as const;

for (const [what, query] of INVALID) {
  test(`${what} (${query}) is ignored: level 1, not a playtest page`, async ({ page }) => {
    const game = await openGame(page, undefined, `/${query}`);
    await expect(game).toHaveAttribute("data-level", "1");
    await expect(game).toHaveAttribute("data-obstacles", "");
    await expect(page.locator("#status")).toContainText("Level 1.");
    const { first } = await readLog(page);
    expect(first).not.toContain("playtest");
  });
}

test("a name given twice takes its first value; other names are ignored", async ({ page }) => {
  const game = await openGame(page, waiting(5), "/?foo=1&level=5&level=7&bar");
  await expect(game).toHaveAttribute("data-level", "5");
  const { first } = await readLog(page);
  expect(first).toMatch(/ playtest start-level=5$/);
});

test("?level=1 is level 1 and a playtest page", async ({ page }) => {
  const game = await openGame(page, undefined, "/?level=1");
  await expect(game).toHaveAttribute("data-level", "1");
  const { first } = await readLog(page);
  expect(first).toMatch(/ playtest start-level=1$/);
});

// ---- The playtest page and the log (2.14 (4), 2.13 (3)) ----

test("the log's first line names the options of the page", async ({ page }) => {
  await openGame(page, waiting(5), "/?level=5&slow");
  const { first, events } = await readLog(page);
  expect(first).toMatch(
    /^snake-demo build=\S+ size=20 start-length=3 clear-ahead=8 dots=5 delays=125\/5\/50 special-every=5 shield=3 turns=20 seconds=30 jump=3 clear-head=2 playtest start-level=5 slow$/,
  );
  expect(events[0]).toMatch(/^level 5 special delay=55 /);
});

test("?slow alone: the first line ends with playtest slow, and the game starts at level 1", async ({
  page,
}) => {
  const game = await openGame(page, undefined, "/?slow");
  await expect(game).toHaveAttribute("data-level", "1");
  const { first } = await readLog(page);
  expect(first).toMatch(/ playtest slow$/);
});

test("?level=5 alone: the first line ends with playtest start-level=5", async ({ page }) => {
  await openGame(page, waiting(5), "/?level=5");
  const { first } = await readLog(page);
  expect(first).toMatch(/ playtest start-level=5$/);
});

test("a page with no option has no playtest in its log", async ({ page }) => {
  await openGame(page);
  const { first } = await readLog(page);
  expect(first).not.toContain("playtest");
});

/**
 * Level `level` from (10,10) heading right with three dots straight ahead, a fourth out of the way:
 * eating three and running on to the wall ends the game with the score 3 on a normal level.
 */
const threeDots = (level: number): number[] =>
  layout(level, "10,10", "right", ["11,10", "12,10", "13,10", FAR]);

/** Plays the game of `threeDots` to its end: three dots, then the wall, a score of 3. */
async function playThreeDots(page: Page, game: Locator, delay: number): Promise<void> {
  await page.keyboard.press("ArrowRight");
  await runTicks(page, 10, delay);
  await expectGame(game, "over", "19,10");
  await expect(game).toHaveAttribute("data-score", "3");
}

const withBest = (best: string) => async (page: Page) => {
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key as string, value as string);
    },
    [STORAGE_KEY, best],
  );
};

test("control: a game with the score 3 on a page with no option saves it as the best score", async ({
  page,
}) => {
  await withBest("2")(page);
  const game = await openGame(page, threeDots(1));
  await playThreeDots(page, game, 125);
  await expect(page.locator("#best")).toHaveText("3");
  expect(await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY)).toBe("3");
  // The score of 3 qualifies for the high score list: skip the name entry, which the log then notes.
  await page.keyboard.press("Escape");
  const { events } = await readLog(page);
  expect(events.at(-2)).toBe("end over wall score=3 best=yes");
  expect(events.at(-1)).toBe("scores skipped");
});

test("a game on a ?level=N page leaves the best score as it was, shown and stored; best=no", async ({
  page,
}) => {
  await withBest("2")(page);
  const game = await openGame(page, threeDots(4), "/?level=4");
  await playThreeDots(page, game, LEVEL_4_DELAY);
  await expect(page.locator("#best")).toHaveText("2");
  await expect(game).toHaveAttribute("data-best", "2");
  expect(await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY)).toBe("2");
  const { events } = await readLog(page);
  expect(events.at(-1)).toBe("end over wall score=3 best=no");
});

test("a game on a ?slow page leaves the best score as it was; best=no", async ({ page }) => {
  await withBest("2")(page);
  const game = await openGame(page, threeDots(1), "/?slow");
  await playThreeDots(page, game, 125);
  await expect(page.locator("#best")).toHaveText("2");
  expect(await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY)).toBe("2");
  const { events } = await readLog(page);
  expect(events.at(-1)).toBe("end over wall score=3 best=no");
});

test("a ?level=1 page is a playtest page too: the best score stays", async ({ page }) => {
  await withBest("2")(page);
  const game = await openGame(page, threeDots(1), "/?level=1");
  await playThreeDots(page, game, 125);
  await expect(page.locator("#best")).toHaveText("2");
  expect(await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY)).toBe("2");
});

test("a playtest page shows the best score it finds in the storage, and writes none when it is empty", async ({
  page,
}) => {
  const game = await openGame(page, threeDots(4), "/?level=4");
  await expect(page.locator("#best")).toHaveText("0");
  await playThreeDots(page, game, LEVEL_4_DELAY);
  await expect(page.locator("#best")).toHaveText("0");
  expect(await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY)).toBeNull();
});

// ---- The Slow button (2.14 (5), (6)) ----

test("without ?slow there is no Slow button on a special level", async ({ page }) => {
  await openGame(page, waiting(5), "/?level=5");
  await expect(slowButton(page)).toHaveCount(0);
  await expect(page.locator("#slow")).toBeHidden();
});

test("the Slow button is hidden on a normal level and shown on a special one", async ({ page }) => {
  // ?level=4&slow: level 4 (normal), clear it into level 5 (special), clear that into level 6.
  const random = [...straight(4), ...straight(5), ...waiting(6)];
  const game = await openGame(page, random, "/?level=4&slow");
  await expect(game).toHaveAttribute("data-level", "4");
  await expect(slowButton(page)).toHaveCount(0);
  await expect(page.locator("#slow")).toBeHidden();

  await page.keyboard.press("ArrowRight");
  await runTicks(page, 5, LEVEL_4_DELAY);
  await expect(game).toHaveAttribute("data-level", "5");
  await expect(slowButton(page)).toBeVisible();

  await page.keyboard.press("ArrowRight");
  await runTicks(page, 5, LEVEL_5_DELAY);
  await expect(game).toHaveAttribute("data-level", "6");
  await expect(slowButton(page)).toHaveCount(0);
});

test("a ?slow page at level 1 has no visible sign: the button is hidden", async ({ page }) => {
  await openGame(page, undefined, "/?slow");
  await expect(slowButton(page)).toHaveCount(0);
  await expect(page.locator("#slow")).toBeHidden();
});

/** The names of the next 8 elements the Tab key reaches (an aria-label, else the text). */
async function tabNames(page: Page): Promise<string[]> {
  const found: string[] = [];
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    found.push(
      await page.evaluate(() => {
        const active = document.activeElement;
        return active?.getAttribute("aria-label") ?? active?.textContent?.trim() ?? "";
      }),
    );
  }
  return found;
}

test("the Slow button is not in the tab order on a normal level", async ({ page }) => {
  await openGame(page, waiting(4), "/?level=4&slow");
  expect(await tabNames(page)).not.toContain("Slow down");
});

test("the Slow button is in the tab order on a special level", async ({ page }) => {
  await openGame(page, waiting(5), "/?level=5&slow");
  expect(await tabNames(page)).toContain("Slow down");
});

test("the Slow button has no visible text, the name Slow down, and is 24 x 24 CSS pixels under the board's right edge", async ({
  page,
}) => {
  await openGame(page, waiting(5), "/?level=5&slow");
  const button = slowButton(page);
  await expect(button).toBeVisible();
  expect(((await button.textContent()) ?? "").trim()).toBe("");
  const box = await button.boundingBox();
  const board = await page.locator("#board").boundingBox();
  if (box === null || board === null) throw new Error("the button or the board is not visible");
  expect(box.width).toBe(24);
  expect(box.height).toBe(24);
  expect(box.y).toBeGreaterThanOrEqual(board.y + board.height);
  expect(Math.abs(box.x + box.width - (board.x + board.width))).toBeLessThanOrEqual(1);
});

/** The contrast ratio of two "rgb(r, g, b)" colours (WCAG 2.x relative luminance). */
function contrast(a: string, b: string): number {
  const luminance = (colour: string): number => {
    const parts = (colour.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
    const [r = 0, g = 0, bl = 0] = parts.map((value) => {
      const c = value / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

test("the Slow button's fill is hard to notice: a contrast of 1.5:1 to 2:1 with the page", async ({
  page,
}) => {
  await openGame(page, waiting(5), "/?level=5&slow");
  const fill = await slowButton(page).evaluate((el) => getComputedStyle(el).backgroundColor);
  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const ratio = contrast(fill, background);
  expect(ratio).toBeGreaterThanOrEqual(1.5);
  expect(ratio).toBeLessThanOrEqual(2);
});

test("the Slow button shows a 2 px outline of at least 3:1 with the page when it has the focus", async ({
  page,
}) => {
  await openGame(page, waiting(5), "/?level=5&slow");
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    if (await slowButton(page).evaluate((el) => el === document.activeElement)) break;
  }
  await expect(slowButton(page)).toBeFocused();
  const outline = await slowButton(page).evaluate((el) => {
    const style = getComputedStyle(el);
    return { width: style.outlineWidth, style: style.outlineStyle, colour: style.outlineColor };
  });
  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(outline.width).toBe("2px");
  expect(outline.style).not.toBe("none");
  expect(contrast(outline.colour, background)).toBeGreaterThanOrEqual(3);
});

test("each press steps the factor 1, 2, 4, 1 and is logged", async ({ page }) => {
  const game = await openGame(page, waiting(5), "/?level=5&slow");
  expect(await factor(game)).toBe("1");
  for (const next of ["2", "4", "1", "2"]) {
    await slowButton(page).click();
    expect(await factor(game)).toBe(next);
  }
  const { events } = await readLog(page);
  expect(events.slice(1)).toEqual([
    "button Slow used",
    "slow x2",
    "button Slow used",
    "slow x4",
    "button Slow used",
    "slow x1",
    "button Slow used",
    "slow x2",
  ]);
});

test("x2: the tick already waiting keeps its delay, the next comes after twice the level's", async ({
  page,
}) => {
  // From (0,10) heading right along row 10: no dot, obstacle or wall for 19 moves.
  const game = await openGame(page, layout(5, "0,10", "right", [FAR]), "/?level=5&slow");
  await page.keyboard.press("ArrowRight");
  await slowButton(page).click();
  expect(await factor(game)).toBe("2");
  await runTicks(page, 1, LEVEL_5_DELAY);
  await expectGame(game, "running", "1,10");
  await page.clock.runFor(2 * LEVEL_5_DELAY - 1);
  await expectGame(game, "running", "1,10");
  await page.clock.runFor(1);
  await expectGame(game, "running", "2,10");
  await page.clock.runFor(2 * LEVEL_5_DELAY);
  await expectGame(game, "running", "3,10");
});

test("x4: a move takes 4 x 55 ms of the clock but only 55 ms of the level's time", async ({
  page,
}) => {
  const game = await openGame(page, layout(5, "0,10", "right", [FAR]), "/?level=5&slow");
  await slowButton(page).click();
  await slowButton(page).click();
  expect(await factor(game)).toBe("4");
  await page.keyboard.press("ArrowRight");
  await page.clock.runFor(4 * LEVEL_5_DELAY * 19);
  await expectGame(game, "running", "19,10");
  // 19 moves x 55 ms = 1045 ms of the level's time: 28.955 s left, 29 whole seconds; the clock
  // on the wall has run 4.18 s, which would leave 25.82 s, 26.
  await expect(page.locator("#seconds-left")).toHaveText("29");
  await expect(page.locator("#turns-left")).toHaveText("20");
});

test("in paused a press steps the factor; going on uses the factor of that moment", async ({
  page,
}) => {
  const game = await openGame(page, layout(5, "0,10", "right", [FAR]), "/?level=5&slow");
  await page.keyboard.press("ArrowRight");
  await runTicks(page, 2, LEVEL_5_DELAY);
  await expectGame(game, "running", "2,10");
  await page.keyboard.press("Space");
  await expect(game).toHaveAttribute("data-status", "paused");
  await slowButton(page).click();
  expect(await factor(game)).toBe("2");
  await page.keyboard.press("Space");
  await expect(game).toHaveAttribute("data-status", "running");
  await page.clock.runFor(2 * LEVEL_5_DELAY - 1);
  await expectGame(game, "running", "2,10");
  await page.clock.runFor(1);
  await expectGame(game, "running", "3,10");
});

test("in ready a press steps the factor; the first tick after the start has it", async ({
  page,
}) => {
  const game = await openGame(page, layout(5, "0,10", "right", [FAR]), "/?level=5&slow");
  await slowButton(page).click();
  expect(await factor(game)).toBe("2");
  await expect(game).toHaveAttribute("data-status", "ready");
  await page.keyboard.press("ArrowRight");
  await page.clock.runFor(2 * LEVEL_5_DELAY - 1);
  await expectGame(game, "running", "0,10");
  await page.clock.runFor(1);
  await expectGame(game, "running", "1,10");
});

test("the factor is 1 again when the next level is laid out", async ({ page }) => {
  const game = await openGame(page, [...straight(5), ...waiting(6)], "/?level=5&slow");
  await slowButton(page).click();
  expect(await factor(game)).toBe("2");
  await page.keyboard.press("ArrowRight");
  await runTicks(page, 5, 2 * LEVEL_5_DELAY);
  await expect(game).toHaveAttribute("data-level", "6");
  expect(await factor(game)).toBe("1");
  // The same budget as unslowed: 275 ms of the level's time, so the full 50 points.
  await expect(game).toHaveAttribute("data-score", "50");
  await expect(slowButton(page)).toHaveCount(0);
});

test("the factor is 1 again when a new game is made", async ({ page }) => {
  const game = await openGame(page, waiting(5), "/?level=5&slow");
  await slowButton(page).click();
  await slowButton(page).click();
  expect(await factor(game)).toBe("4");
  await page.keyboard.press("Enter");
  expect(await factor(game)).toBe("1");
  await slowButton(page).click();
  await page.getByRole("button", { name: "New game", exact: true }).click();
  expect(await factor(game)).toBe("1");
});

test("the t= stamps and the tick count keep real time, whatever the factor", async ({ page }) => {
  await openGame(page, layout(5, "0,10", "right", [FAR]), "/?level=5&slow");
  await slowButton(page).click();
  await slowButton(page).click();
  await page.keyboard.press("ArrowRight");
  // x4: a tick every 220 ms of the clock, five of them in 1100 ms.
  await page.clock.runFor(1100);
  await page.keyboard.press("Space");
  const { raw } = await readLog(page);
  // The fake clock was moved to 60 s before the first line of the test; only differences count.
  const stamped = raw
    .map((line) => /^\[t=(\d+) #(\d+)\] (.*)$/.exec(line))
    .filter((m) => m !== null);
  const at = (words: string): { t: number; k: number } => {
    const found = stamped.find((m) => m[3] === words);
    if (found === undefined) throw new Error(`no line "${words}" in the log`);
    return { t: Number(found[1]), k: Number(found[2]) };
  };
  const slowed = at("slow x4");
  expect(slowed.k).toBe(0);
  expect(at("move right 5 head=(5,10)")).toEqual({ t: slowed.t + 1100, k: 5 });
  expect(at("pause")).toEqual({ t: slowed.t + 1100, k: 5 });
});

test("after a game is over the press is ignored: no step, and button Slow ignored state", async ({
  page,
}) => {
  // Level 5 from (10,8) heading up: 8 moves to the top wall; the 9th tick is the first crash.
  // Each next crash: turn left (free), move, turn up (counted), crash. The 4th crash has no layer.
  const game = await openGame(page, layout(5, "10,8", "up", [FAR]), "/?level=5&slow");
  await page.keyboard.press("ArrowUp");
  await runTicks(page, 9, LEVEL_5_DELAY);
  await expect(game).toHaveAttribute("data-waiting", "true");
  for (let crash = 2; crash <= 4; crash++) {
    await page.keyboard.press("ArrowLeft");
    await runTicks(page, 1, LEVEL_5_DELAY);
    await page.keyboard.press("ArrowUp");
    await runTicks(page, 1, LEVEL_5_DELAY);
  }
  await expect(game).toHaveAttribute("data-status", "over");
  await expect(slowButton(page)).toBeVisible();
  expect(await factor(game)).toBe("1");
  await slowButton(page).click();
  expect(await factor(game)).toBe("1");
  const { events } = await readLog(page);
  expect(events.at(-1)).toBe("button Slow ignored state");
  expect(events.at(-2)).toBe("end over wall score=0 best=no");
  expect(events.filter((line) => line.startsWith("slow"))).toEqual([]);
});

test("while the log panel is open the Slow button does nothing and makes no line", async ({
  page,
}) => {
  const game = await openGame(page, waiting(5), "/?level=5&slow");
  await page.getByRole("button", { name: "Log", exact: true }).click();
  await expect(page.locator("#log-panel")).toBeVisible();
  const before = await page.locator("#log-text").textContent();
  await slowButton(page).click();
  expect(await factor(game)).toBe("1");
  await expect(page.locator("#log-text")).toHaveText(before ?? "");
  await page.keyboard.press("Escape");
  const { events } = await readLog(page);
  expect(events.filter((line) => line.includes("Slow") || line.startsWith("slow"))).toEqual([]);
  // Closed again, the press works.
  await slowButton(page).click();
  expect(await factor(game)).toBe("2");
});
