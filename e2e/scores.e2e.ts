import type { Locator, Page } from "@playwright/test";
import {
  answer,
  expect,
  freeIndex,
  openGame,
  runTicks,
  STARTS,
  startIndex,
  swipe,
  test,
} from "./helpers";

// The browser-local high score list (docs/SPEC.md 2.15): the name entry, the table, the Scores link,
// storage and the log lines. The look of 2.16 is not tested here (it is not in this PR).

const SCORES_KEY = "snake-demo.scores";
const BEST_KEY = "snake-demo.best";

/**
 * The answers of a game that eats one dot and then hits the wall: the start (10,10) heading right,
 * the first dot at (12,10), the second out of the way at (0,0). Three answers per game, so a second
 * game in the same page starts the same way.
 */
function scoringGame(): number[] {
  return [
    answer(startIndex("10,10", "right"), STARTS),
    answer(freeIndex("12,10", ["10,10"]), 399),
    answer(0, 397),
  ];
}

/** Starts the snake and runs it to the wall: the dot at (12,10) is eaten on tick 2, the wall hit on tick 10. */
async function playToEnd(page: Page): Promise<void> {
  await page.keyboard.press("ArrowRight");
  await runTicks(page, 10);
}

/** Puts values in the page's local storage before the page loads, unless they are there already. */
async function seed(page: Page, values: Record<string, string>): Promise<void> {
  await page.addInitScript((entries) => {
    for (const [key, value] of Object.entries(entries)) {
      if (window.localStorage.getItem(key) === null) window.localStorage.setItem(key, value);
    }
  }, values);
}

const stored = (page: Page): Promise<string | null> =>
  page.evaluate((key) => window.localStorage.getItem(key), SCORES_KEY);

/** A stored list text from scores: SCORE:LEVEL:NAME, in the order given. */
const list = (...scores: Array<[number, number, string]>): string =>
  scores.map(([score, level, name]) => `${score}:${level}:${name}`).join(",");

const entryPanel = (page: Page): Locator => page.getByRole("dialog", { name: "Enter your name" });
const tablePanel = (page: Page): Locator => page.getByRole("dialog", { name: "Top 10 scores" });
const slot = (page: Page, number: number, letter: string): Locator =>
  page.getByRole("button", { name: `Letter ${number}, ${letter}`, exact: true });
const stepButton = (page: Page, number: number, way: "up" | "down"): Locator =>
  page.getByRole("button", { name: `Letter ${number} ${way}`, exact: true });
const named = (page: Page, name: string): Locator =>
  page.getByRole("button", { name, exact: true });
const scoresLink = (page: Page): Locator => named(page, "Scores");
const logLink = (page: Page): Locator => named(page, "Log");
const newGameButton = (page: Page): Locator => named(page, "New game");

/** The log's lines without their stamps (opens the log panel and closes it again with Escape). */
async function logLines(page: Page): Promise<string[]> {
  await logLink(page).click();
  const text = (await page.locator("#log-text").textContent()) ?? "";
  await page.keyboard.press("Escape");
  return text
    .split("\n")
    .slice(1)
    .map((line) => line.replace(/^\[t=\d+ #\d+\] /, ""));
}

/** The rows of the table as the texts of their cells (the heading row excluded). */
async function rows(page: Page): Promise<string[][]> {
  const found = tablePanel(page).locator("tbody tr");
  const result: string[][] = [];
  for (let index = 0; index < (await found.count()); index++) {
    result.push(await found.nth(index).locator("td").allTextContents());
  }
  return result;
}

const MARKED = 'tr[aria-current="true"]';

// ---------------------------------------------------------------------------------------------
// 2.15 (3), (4): a game that qualifies asks for a name.

test.describe("the name entry (docs/SPEC.md 2.15 (4))", () => {
  test("a game that ends with a score of 1 or more opens a dialog with its score, level and rank", async ({
    page,
  }) => {
    const game = await openGame(page, scoringGame());
    await playToEnd(page);
    await expect(game).toHaveAttribute("data-status", "over");
    await expect(game).toHaveAttribute("data-score", "1");
    const panel = entryPanel(page);
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("heading", { name: "ENTER YOUR NAME" })).toBeVisible();
    await expect(panel).toContainText("SCORE");
    await expect(panel).toContainText("LVL");
    await expect(panel).toContainText("RANK");
    await expect(panel.locator("#entry-score")).toHaveText("1");
    await expect(panel.locator("#entry-level")).toHaveText("1");
    await expect(panel.locator("#entry-rank")).toHaveText("1ST");
    await expect(named(page, "OK")).toBeVisible();
    await expect(named(page, "Skip")).toBeVisible();
    await expect(tablePanel(page)).toBeHidden();
  });

  test("has 3 slots that start at A, the first selected and focused; each has an Up and a Down button", async ({
    page,
  }) => {
    await openGame(page, scoringGame());
    await playToEnd(page);
    for (const number of [1, 2, 3]) {
      await expect(slot(page, number, "A")).toBeVisible();
      await expect(stepButton(page, number, "up")).toBeVisible();
      await expect(stepButton(page, number, "down")).toBeVisible();
    }
    await expect(slot(page, 4, "A")).toHaveCount(0);
    await expect(slot(page, 1, "A")).toHaveAttribute("aria-current", "true");
    await expect(slot(page, 2, "A")).not.toHaveAttribute("aria-current", "true");
    await expect(slot(page, 3, "A")).not.toHaveAttribute("aria-current", "true");
    await expect(slot(page, 1, "A")).toBeFocused();
  });

  test("the status line says Enter your name while it is open", async ({ page }) => {
    await openGame(page, scoringGame());
    await playToEnd(page);
    await expect(page.locator("#status")).toHaveText(
      "Game over: you hit the wall. Enter your name",
    );
  });

  test("ArrowUp and ArrowDown change the selected letter, wrapping at Z and A; ArrowLeft and ArrowRight move the selection and the focus, not past the ends", async ({
    page,
  }) => {
    await openGame(page, scoringGame());
    await playToEnd(page);
    await page.keyboard.press("ArrowUp");
    await expect(slot(page, 1, "B")).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await expect(slot(page, 1, "Z")).toBeVisible();
    await page.keyboard.press("ArrowUp");
    await expect(slot(page, 1, "A")).toBeVisible();

    await page.keyboard.press("ArrowLeft");
    await expect(slot(page, 1, "A")).toHaveAttribute("aria-current", "true");
    await page.keyboard.press("ArrowRight");
    await expect(slot(page, 2, "A")).toHaveAttribute("aria-current", "true");
    await expect(slot(page, 2, "A")).toBeFocused();
    await expect(slot(page, 1, "A")).not.toHaveAttribute("aria-current", "true");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(slot(page, 3, "A")).toHaveAttribute("aria-current", "true");
    await expect(slot(page, 3, "A")).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(slot(page, 3, "Z")).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect(slot(page, 1, "A")).toHaveAttribute("aria-current", "true");
    await expect(slot(page, 1, "A")).toBeFocused();
  });

  test("a repeat of an arrow key acts as a new press", async ({ page }) => {
    await openGame(page, scoringGame());
    await playToEnd(page);
    await page.keyboard.down("ArrowUp");
    await page.keyboard.down("ArrowUp");
    await page.keyboard.down("ArrowUp");
    await page.keyboard.up("ArrowUp");
    await expect(slot(page, 1, "D")).toBeVisible();
  });

  test("W, A, S, D and P do not type or move anything; Space on a slot does nothing", async ({
    page,
  }) => {
    await openGame(page, scoringGame());
    await playToEnd(page);
    for (const key of ["w", "a", "s", "d", "p", "Space", "x"]) await page.keyboard.press(key);
    await expect(entryPanel(page)).toBeVisible();
    await expect(slot(page, 1, "A")).toHaveAttribute("aria-current", "true");
    await expect(slot(page, 2, "A")).toBeVisible();
    await expect(slot(page, 3, "A")).toBeVisible();
  });

  test("the Up and Down buttons select their slot, change its letter, and keep the focus on themselves", async ({
    page,
  }) => {
    await openGame(page, scoringGame());
    await playToEnd(page);
    await stepButton(page, 2, "up").click();
    await expect(slot(page, 2, "B")).toHaveAttribute("aria-current", "true");
    await expect(slot(page, 1, "A")).not.toHaveAttribute("aria-current", "true");
    await expect(stepButton(page, 2, "up")).toBeFocused();
    await stepButton(page, 2, "up").click();
    await expect(slot(page, 2, "C")).toBeVisible();
    await stepButton(page, 3, "down").click();
    await expect(slot(page, 3, "Z")).toHaveAttribute("aria-current", "true");
    await expect(stepButton(page, 3, "down")).toBeFocused();
    await expect(entryPanel(page)).toBeVisible();
  });

  test("pressing a slot selects it and focuses it", async ({ page }) => {
    await openGame(page, scoringGame());
    await playToEnd(page);
    await slot(page, 3, "A").click();
    await expect(slot(page, 3, "A")).toHaveAttribute("aria-current", "true");
    await expect(slot(page, 3, "A")).toBeFocused();
    await expect(slot(page, 1, "A")).not.toHaveAttribute("aria-current", "true");
  });

  test("Enter and Space on a focused Up or Down button press it again and do not confirm the name", async ({
    page,
  }) => {
    await openGame(page, scoringGame());
    await playToEnd(page);
    await stepButton(page, 1, "up").focus();
    await page.keyboard.press("Enter");
    await expect(slot(page, 1, "B")).toBeVisible();
    await expect(stepButton(page, 1, "up")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(slot(page, 1, "C")).toBeVisible();
    await page.keyboard.press("Space");
    await expect(slot(page, 1, "D")).toBeVisible();
    await stepButton(page, 1, "down").focus();
    await page.keyboard.press("Space");
    await expect(slot(page, 1, "C")).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(slot(page, 1, "B")).toBeVisible();
    await expect(entryPanel(page)).toBeVisible();
    await expect(tablePanel(page)).toBeHidden();
    expect(await stored(page)).toBeNull();
  });

  test("Enter on a slot confirms: the name is stored with the score and level, and the panel turns into the table with the entry marked", async ({
    page,
  }) => {
    await openGame(page, scoringGame());
    await playToEnd(page);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowUp");
    await expect(slot(page, 2, "C")).toBeFocused();
    await page.keyboard.press("Enter");
    expect(await stored(page)).toBe("1:1:ZCA");
    await expect(entryPanel(page)).toBeHidden();
    await expect(tablePanel(page)).toBeVisible();
    await expect(tablePanel(page).locator(MARKED)).toHaveCount(1);
    expect(await rows(page)).toEqual([["1ST", "1", "1", "ZCA"]]);
    await expect(page.locator("#game")).toHaveAttribute("data-status", "over");
  });

  test("the OK button confirms, as does Enter on the focused OK; Space on a slot does not", async ({
    page,
  }) => {
    await openGame(page, scoringGame());
    await playToEnd(page);
    await page.keyboard.press("Space");
    await expect(entryPanel(page)).toBeVisible();
    await named(page, "OK").click();
    expect(await stored(page)).toBe("1:1:AAA");
    await expect(tablePanel(page)).toBeVisible();

    await page.keyboard.press("Escape");
    await newGameButton(page).click();
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 10);
    await expect(entryPanel(page)).toBeVisible();
    await named(page, "OK").focus();
    await page.keyboard.press("Enter");
    expect(await stored(page)).toBe("1:1:AAA,1:1:AAA");
  });

  test("Skip stores nothing, closes the panel, writes scores skipped and gives the focus to New game", async ({
    page,
  }) => {
    const game = await openGame(page, scoringGame());
    await playToEnd(page);
    await named(page, "Skip").click();
    await expect(entryPanel(page)).toBeHidden();
    await expect(tablePanel(page)).toBeHidden();
    expect(await stored(page)).toBeNull();
    await expect(newGameButton(page)).toBeFocused();
    await expect(game).toHaveAttribute("data-status", "over");
    await expect(page.locator("#status")).toHaveText(
      "Game over: you hit the wall. Enter or New game to play again",
    );
    expect(await logLines(page)).toContain("scores skipped");
  });

  test("Escape skips from anywhere in the entry; Enter then makes a new game from the New game button", async ({
    page,
  }) => {
    const game = await openGame(page, scoringGame());
    await playToEnd(page);
    await stepButton(page, 3, "down").focus();
    await page.keyboard.press("Escape");
    await expect(entryPanel(page)).toBeHidden();
    expect(await stored(page)).toBeNull();
    await expect(newGameButton(page)).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(game).toHaveAttribute("data-status", "ready");
    await expect(game).toHaveAttribute("data-score", "0");
  });

  test("Space on the focused Skip skips; Space on the focused OK confirms", async ({ page }) => {
    await openGame(page, scoringGame());
    await playToEnd(page);
    await named(page, "Skip").focus();
    await page.keyboard.press("Space");
    await expect(entryPanel(page)).toBeHidden();
    expect(await stored(page)).toBeNull();

    await newGameButton(page).click();
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 10);
    await expect(entryPanel(page)).toBeVisible();
    await named(page, "OK").focus();
    await page.keyboard.press("Space");
    await expect(tablePanel(page)).toBeVisible();
    expect(await stored(page)).toBe("1:1:AAA");
  });

  test("a repeat of Space does nothing: held Space on an Up button changes the letter once", async ({
    page,
  }) => {
    await openGame(page, scoringGame());
    await playToEnd(page);
    await stepButton(page, 1, "up").focus();
    await page.keyboard.down("Space");
    await page.keyboard.down("Space");
    await page.keyboard.down("Space");
    await page.keyboard.up("Space");
    await expect(slot(page, 1, "B")).toBeVisible();
    await expect(entryPanel(page)).toBeVisible();
  });

  test("Enter on the focused Skip skips", async ({ page }) => {
    await openGame(page, scoringGame());
    await playToEnd(page);
    await named(page, "Skip").focus();
    await page.keyboard.press("Enter");
    await expect(entryPanel(page)).toBeHidden();
    expect(await stored(page)).toBeNull();
  });

  test("Tab and Shift+Tab stay inside the dialog", async ({ page }) => {
    await openGame(page, scoringGame());
    await playToEnd(page);
    const inside = (): Promise<boolean> =>
      entryPanel(page).evaluate((panel) => panel.contains(document.activeElement));
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Shift+Tab");
    expect(await inside()).toBe(true);
    for (let presses = 0; presses < 14; presses++) {
      await page.keyboard.press("Tab");
      expect(await inside()).toBe(true);
    }
    await named(page, "Skip").focus();
    await page.keyboard.press("Tab");
    await expect(stepButton(page, 1, "up")).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(named(page, "Skip")).toBeFocused();
  });

  test("while it is open, game keys, swipes, Start, Pause, New game, Log and Scores do nothing and make no log line", async ({
    page,
  }) => {
    const game = await openGame(page, scoringGame());
    await playToEnd(page);
    for (const key of ["Space", "p", "P", "w", "d"]) await page.keyboard.press(key);
    await swipe(page, 80, 0);
    await swipe(page, 0, -80);
    await named(page, "Start").click();
    await named(page, "Pause").click();
    await newGameButton(page).click();
    await logLink(page).click();
    await scoresLink(page).click();
    await expect(entryPanel(page)).toBeVisible();
    await expect(page.locator("#log-panel")).toBeHidden();
    await expect(tablePanel(page)).toBeHidden();
    await expect(game).toHaveAttribute("data-status", "over");
    await expect(game).toHaveAttribute("data-score", "1");
    await page.keyboard.press("Escape");
    const lines = await logLines(page);
    expect(lines.filter((line) => /^(key|swipe|button)/.test(line))).toEqual([
      "key ArrowRight right used",
    ]);
    expect(lines.at(-2)).toBe("end over wall score=1 best=yes");
    expect(lines.at(-1)).toBe("scores skipped");
  });

  test("Enter confirms instead of making a new game, even with the focus outside the dialog", async ({
    page,
  }) => {
    const game = await openGame(page, scoringGame());
    await playToEnd(page);
    await page.locator("#status").click();
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press("Enter");
    expect(await stored(page)).toBe("1:1:AAA");
    await expect(game).toHaveAttribute("data-status", "over");
    await expect(game).toHaveAttribute("data-score", "1");
  });

  test("a key already down when the entry opens does nothing, its repeats included, until it is released", async ({
    page,
  }) => {
    await openGame(page, scoringGame());
    await page.keyboard.down("ArrowRight");
    await runTicks(page, 10);
    await expect(entryPanel(page)).toBeVisible();
    await page.keyboard.down("ArrowRight");
    await page.keyboard.down("ArrowRight");
    await expect(slot(page, 1, "A")).toHaveAttribute("aria-current", "true");
    await page.keyboard.up("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(slot(page, 2, "A")).toHaveAttribute("aria-current", "true");
  });

  test("a repeat of Enter does nothing: held Enter confirms once and the table stays", async ({
    page,
  }) => {
    await openGame(page, scoringGame());
    await playToEnd(page);
    await page.keyboard.down("Enter");
    await expect(tablePanel(page)).toBeVisible();
    await page.keyboard.down("Enter");
    await page.keyboard.down("Enter");
    await expect(tablePanel(page)).toBeVisible();
    expect(await stored(page)).toBe("1:1:AAA");
    await page.keyboard.up("Enter");
    await page.keyboard.press("Enter");
    await expect(tablePanel(page)).toBeHidden();
  });

  test("fits the board, with every button inside the panel, at phone and desktop width", async ({
    page,
  }) => {
    await openGame(page, scoringGame());
    await playToEnd(page);
    const panel = entryPanel(page);
    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    const fits = await panel.evaluate((element) => ({
      clipped: element.scrollHeight > element.clientHeight + 1,
      wide: element.scrollWidth > element.clientWidth + 1,
      page: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }));
    expect(fits).toEqual({ clipped: false, wide: false, page: false });
    const buttons = panel.getByRole("button");
    expect(await buttons.count()).toBe(11);
    for (let index = 0; index < (await buttons.count()); index++) {
      const inner = await buttons.nth(index).boundingBox();
      expect(inner).not.toBeNull();
      if (box === null || inner === null) continue;
      expect(inner.x).toBeGreaterThanOrEqual(box.x - 1);
      expect(inner.y).toBeGreaterThanOrEqual(box.y - 1);
      expect(inner.x + inner.width).toBeLessThanOrEqual(box.x + box.width + 1);
      expect(inner.y + inner.height).toBeLessThanOrEqual(box.y + box.height + 1);
    }
  });
});

// ---------------------------------------------------------------------------------------------
// 2.15 (2), (3): who qualifies, and the rank.

test.describe("qualification and rank (docs/SPEC.md 2.15 (2), (3))", () => {
  test("a game with a score of 0 does not ask for a name; Enter makes a new game", async ({
    page,
  }) => {
    const game = await openGame(page);
    await playToEnd(page);
    await expect(game).toHaveAttribute("data-status", "over");
    await expect(game).toHaveAttribute("data-score", "0");
    await expect(entryPanel(page)).toBeHidden();
    await expect(page.locator("#status")).toHaveText(
      "Game over: you hit the wall. Enter or New game to play again",
    );
    await page.keyboard.press("Enter");
    await expect(game).toHaveAttribute("data-status", "ready");
  });

  test("the rank shown is the place in the list as shown: 4TH behind three entries", async ({
    page,
  }) => {
    await seed(page, { [SCORES_KEY]: list([50, 6, "AAA"], [40, 5, "BBB"], [30, 4, "CCC"]) });
    await openGame(page, scoringGame());
    await playToEnd(page);
    await expect(entryPanel(page).locator("#entry-rank")).toHaveText("4TH");
  });

  test("a score equal to a stored one is ranked after it (the older first)", async ({ page }) => {
    await seed(page, { [SCORES_KEY]: list([1, 3, "OLD"]) });
    await openGame(page, scoringGame());
    await playToEnd(page);
    await expect(entryPanel(page).locator("#entry-rank")).toHaveText("2ND");
    await page.keyboard.press("Enter");
    expect(await stored(page)).toBe(list([1, 3, "OLD"], [1, 1, "AAA"]));
    expect(await rows(page)).toEqual([
      ["1ST", "1", "3", "OLD"],
      ["2ND", "1", "1", "AAA"],
    ]);
    await expect(tablePanel(page).locator(MARKED).locator("td").nth(3)).toHaveText("AAA");
  });

  test("a game that does not reach the 10 does not qualify: no entry, the status line is as before", async ({
    page,
  }) => {
    const full = list(
      [100, 9, "AAA"],
      [90, 9, "AAA"],
      [80, 9, "AAA"],
      [70, 9, "AAA"],
      [60, 9, "AAA"],
      [50, 9, "AAA"],
      [40, 9, "AAA"],
      [30, 9, "AAA"],
      [20, 9, "AAA"],
      [1, 9, "AAA"],
    );
    await seed(page, { [SCORES_KEY]: full });
    const game = await openGame(page, scoringGame());
    await playToEnd(page);
    await expect(game).toHaveAttribute("data-status", "over");
    await expect(entryPanel(page)).toBeHidden();
    await expect(page.locator("#status")).toHaveText(
      "Game over: you hit the wall. Enter or New game to play again",
    );
    expect(await stored(page)).toBe(full);
  });

  test("the best score is a row ahead of the entry: it counts in the rank, is shown as -- and ---, and is never stored", async ({
    page,
  }) => {
    await seed(page, { [BEST_KEY]: "50" });
    await openGame(page, scoringGame());
    await playToEnd(page);
    await expect(page.locator("#best")).toHaveText("50");
    await expect(entryPanel(page).locator("#entry-rank")).toHaveText("2ND");
    await page.keyboard.press("Enter");
    expect(await stored(page)).toBe("1:1:AAA");
    expect(await rows(page)).toEqual([
      ["1ST", "50", "--", "---"],
      ["2ND", "1", "1", "AAA"],
    ]);
    await expect(tablePanel(page).locator(MARKED)).toHaveCount(1);
    await expect(tablePanel(page).locator(MARKED).locator("td").nth(1)).toHaveText("1");
  });

  test("a best score equal to the game's score gives no best row: the game is 1ST", async ({
    page,
  }) => {
    await openGame(page, scoringGame());
    await playToEnd(page);
    await expect(page.locator("#best")).toHaveText("1");
    await expect(entryPanel(page).locator("#entry-rank")).toHaveText("1ST");
    await page.keyboard.press("Enter");
    expect(await rows(page)).toEqual([["1ST", "1", "1", "AAA"]]);
  });
});

// ---------------------------------------------------------------------------------------------
// 2.15 (5): the Scores link and the table.

test.describe("the Scores link and the table (docs/SPEC.md 2.15 (5))", () => {
  test("opens a table with the title, the headings and a row for each entry as stored, the best score's row first", async ({
    page,
  }) => {
    await seed(page, {
      [SCORES_KEY]: list([50, 6, "AAA"], [40, 5, "BBB"], [40, 2, "CCC"]),
      [BEST_KEY]: "60",
    });
    const game = await openGame(page);
    await expect(scoresLink(page)).toBeVisible();
    await scoresLink(page).click();
    const panel = tablePanel(page);
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("heading", { name: "TOP 10 SCORES" })).toBeVisible();
    await expect(panel.getByRole("table")).toBeVisible();
    await expect(panel.getByRole("columnheader")).toHaveText(["RANK", "SCORE", "LVL", "NAME"]);
    expect(await rows(page)).toEqual([
      ["1ST", "60", "--", "---"],
      ["2ND", "50", "6", "AAA"],
      ["3RD", "40", "5", "BBB"],
      ["4TH", "40", "2", "CCC"],
    ]);
    await expect(panel.locator(MARKED)).toHaveCount(0);
    await expect(named(page, "Close")).toBeFocused();
    await expect(game).toHaveAttribute("data-status", "ready");
  });

  test("says NO SCORES YET instead of the rows when there are no entries", async ({ page }) => {
    await openGame(page);
    await scoresLink(page).click();
    await expect(tablePanel(page)).toContainText("NO SCORES YET");
    await expect(tablePanel(page).locator("tbody tr")).toHaveCount(0);
  });

  test("shows 10 ranks to 10TH and fits the board", async ({ page }) => {
    const ten = list(
      [100, 9, "AAA"],
      [90, 9, "BBB"],
      [80, 9, "CCC"],
      [70, 9, "DDD"],
      [60, 9, "EEE"],
      [50, 9, "FFF"],
      [40, 9, "GGG"],
      [30, 9, "HHH"],
      [20, 9, "III"],
      [10, 9, "JJJ"],
    );
    await seed(page, { [SCORES_KEY]: ten });
    await openGame(page);
    await scoresLink(page).click();
    const found = await rows(page);
    expect(found.map((row) => row[0])).toEqual([
      "1ST",
      "2ND",
      "3RD",
      "4TH",
      "5TH",
      "6TH",
      "7TH",
      "8TH",
      "9TH",
      "10TH",
    ]);
    const fits = await tablePanel(page).evaluate((element) => ({
      clipped: element.scrollHeight > element.clientHeight + 1,
      wide: element.scrollWidth > element.clientWidth + 1,
    }));
    expect(fits).toEqual({ clipped: false, wide: false });
  });

  test("reads the list again each time it opens: another tab's entry is seen", async ({ page }) => {
    await seed(page, { [SCORES_KEY]: list([50, 6, "AAA"]) });
    await openGame(page);
    await scoresLink(page).click();
    expect(await rows(page)).toEqual([["1ST", "50", "6", "AAA"]]);
    await page.keyboard.press("Escape");
    await page.evaluate((key) => window.localStorage.setItem(key, "70:8:ZZZ,50:6:AAA"), SCORES_KEY);
    await scoresLink(page).click();
    expect(await rows(page)).toEqual([
      ["1ST", "70", "8", "ZZZ"],
      ["2ND", "50", "6", "AAA"],
    ]);
  });

  test("is usable in ready and paused: opening and closing change nothing, the focus goes back to New game", async ({
    page,
  }) => {
    const game = await openGame(page);
    await scoresLink(page).click();
    await expect(tablePanel(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(tablePanel(page)).toBeHidden();
    await expect(game).toHaveAttribute("data-status", "ready");
    await expect(newGameButton(page)).toBeFocused();

    await page.keyboard.press("ArrowRight");
    await runTicks(page, 3);
    await page.keyboard.press("Space");
    await expect(game).toHaveAttribute("data-status", "paused");
    await scoresLink(page).click();
    await expect(tablePanel(page)).toBeVisible();
    await expect(game).toHaveAttribute("data-status", "paused");
    await named(page, "Close").click();
    await expect(tablePanel(page)).toBeHidden();
    await expect(game).toHaveAttribute("data-status", "paused");
    await expect(game).toHaveAttribute("data-head", "13,10");
    expect(await logLines(page)).not.toContain("pause scores");
  });

  test("opening it on a running game pauses it; Close or Escape goes on, and the log says so", async ({
    page,
  }) => {
    const game = await openGame(page);
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 3);
    await expect(game).toHaveAttribute("data-head", "13,10");
    await scoresLink(page).click();
    await expect(game).toHaveAttribute("data-status", "paused");
    await runTicks(page, 5);
    await expect(game).toHaveAttribute("data-head", "13,10");
    await page.keyboard.press("Escape");
    await expect(game).toHaveAttribute("data-status", "running");
    await runTicks(page, 1);
    await expect(game).toHaveAttribute("data-head", "14,10");

    await scoresLink(page).click();
    await expect(game).toHaveAttribute("data-status", "paused");
    await named(page, "Close").click();
    await expect(game).toHaveAttribute("data-status", "running");
    await expect(newGameButton(page)).toBeFocused();

    await page.keyboard.press("Space");
    const lines = await logLines(page);
    expect(lines).toEqual(
      expect.arrayContaining([
        "move right 3 head=(13,10)",
        "pause scores",
        "resume scores",
        "pause",
      ]),
    );
    expect(lines.filter((line) => line === "pause scores")).toHaveLength(2);
    expect(lines.filter((line) => line === "resume scores")).toHaveLength(2);
    expect(lines.some((line) => line.startsWith("pause log"))).toBe(false);
  });

  test("is usable after the game has ended, and closing it leaves the ended game as it was", async ({
    page,
  }) => {
    const game = await openGame(page);
    await playToEnd(page);
    await expect(game).toHaveAttribute("data-status", "over");
    await scoresLink(page).click();
    await expect(tablePanel(page)).toBeVisible();
    await expect(page.locator("#status")).toHaveText(
      "Game over: you hit the wall. Enter or New game to play again",
    );
    await named(page, "Close").click();
    await expect(game).toHaveAttribute("data-status", "over");
    await expect(game).toHaveAttribute("data-head", "19,10");
  });

  test("while it is open, game keys, swipes and Start, Pause, Resume, Log do nothing and make no line", async ({
    page,
  }) => {
    const game = await openGame(page);
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 3);
    await scoresLink(page).click();
    await expect(game).toHaveAttribute("data-status", "paused");
    // Space is not among them: on the focused Close it presses Close (tested below).
    for (const key of ["p", "w", "ArrowUp", "ArrowDown", "s"]) {
      await page.keyboard.press(key);
    }
    await swipe(page, 0, -80);
    await named(page, "Start").click();
    await named(page, "Resume").click();
    await logLink(page).click();
    await expect(tablePanel(page)).toBeVisible();
    await expect(page.locator("#log-panel")).toBeHidden();
    await expect(game).toHaveAttribute("data-status", "paused");
    await expect(game).toHaveAttribute("data-heading", "right");
    await page.keyboard.press("Escape");
    const lines = await logLines(page);
    expect(lines.filter((line) => /^(key|swipe|button)/.test(line))).toEqual([
      "key ArrowRight right used",
    ]);
  });

  test("the Log link's panel blocks the Scores link", async ({ page }) => {
    await openGame(page);
    await logLink(page).click();
    await expect(page.locator("#log-panel")).toBeVisible();
    await scoresLink(page).click();
    await expect(tablePanel(page)).toBeHidden();
    await expect(page.locator("#log-panel")).toBeVisible();
  });

  test("the New game button closes it and makes a new game, without going on", async ({ page }) => {
    const game = await openGame(page);
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 3);
    await scoresLink(page).click();
    await newGameButton(page).click();
    await expect(tablePanel(page)).toBeHidden();
    await expect(game).toHaveAttribute("data-status", "ready");
    await expect(game).toHaveAttribute("data-score", "0");
    await runTicks(page, 3);
    await expect(game).toHaveAttribute("data-status", "ready");
  });

  test("Enter closes it and makes no new game; a second Enter, from the New game button, does", async ({
    page,
  }) => {
    const game = await openGame(page);
    await playToEnd(page);
    await scoresLink(page).click();
    await expect(named(page, "Close")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(tablePanel(page)).toBeHidden();
    await expect(game).toHaveAttribute("data-status", "over");
    await expect(newGameButton(page)).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(game).toHaveAttribute("data-status", "ready");
    await expect(tablePanel(page)).toBeHidden();
  });

  test("Space on the focused Close presses it: the table closes, no new game, no pause", async ({
    page,
  }) => {
    const game = await openGame(page);
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 2);
    await scoresLink(page).click();
    await expect(game).toHaveAttribute("data-status", "paused");
    await page.keyboard.press("Space");
    await expect(tablePanel(page)).toBeHidden();
    await expect(game).toHaveAttribute("data-status", "running");
    await expect(game).toHaveAttribute("data-head", "12,10");
    await expect(game).toHaveAttribute("data-score", "0");
  });

  test("Tab stays on Close, inside the panel", async ({ page }) => {
    await openGame(page);
    await scoresLink(page).click();
    await page.keyboard.press("Tab");
    await expect(named(page, "Close")).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(named(page, "Close")).toBeFocused();
  });

  test("a key already down when it opens, and the repeats of Enter, do nothing", async ({
    page,
  }) => {
    await openGame(page);
    await scoresLink(page).focus();
    await page.keyboard.down("Enter");
    await expect(tablePanel(page)).toBeVisible();
    await page.keyboard.down("Enter");
    await page.keyboard.down("Enter");
    await expect(tablePanel(page)).toBeVisible();
    await page.keyboard.up("Enter");
    await page.keyboard.press("Enter");
    await expect(tablePanel(page)).toBeHidden();
  });

  test("a focused Scores link, or Log link, opens its panel on Enter and Enter is not a new game there", async ({
    page,
  }) => {
    const game = await openGame(page);
    await playToEnd(page);
    await expect(game).toHaveAttribute("data-status", "over");

    await scoresLink(page).focus();
    await page.keyboard.press("Enter");
    await expect(tablePanel(page)).toBeVisible();
    await expect(game).toHaveAttribute("data-status", "over");
    await page.keyboard.press("Escape");

    await logLink(page).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#log-panel")).toBeVisible();
    await expect(game).toHaveAttribute("data-status", "over");
    await expect(game).toHaveAttribute("data-score", "0");
  });

  test("the Slow button does nothing while it is open and writes no line", async ({ page }) => {
    const game = await openGame(page, undefined, "/?level=5&slow");
    const slow = page.getByRole("button", { name: "Slow down", exact: true });
    await expect(game).toHaveAttribute("data-factor", "1");
    await scoresLink(page).click();
    await slow.click();
    await expect(game).toHaveAttribute("data-factor", "1");
    await page.keyboard.press("Escape");
    await slow.click();
    await expect(game).toHaveAttribute("data-factor", "2");
    const lines = await logLines(page);
    expect(lines.filter((line) => line.includes("Slow"))).toEqual(["button Slow used"]);
  });
});

// ---------------------------------------------------------------------------------------------
// 2.15 (3), (6), 2.14 (4): playtest pages, storage and the confirmation.

test.describe("a playtest page never enters the list (docs/SPEC.md 2.14 (4), 2.15 (3))", () => {
  for (const address of ["/?slow", "/?level=1", "/?level=1&slow"]) {
    test(`${address}: a game that scores asks for no name and stores nothing; the Scores link still shows the list`, async ({
      page,
    }) => {
      await seed(page, { [SCORES_KEY]: list([9, 3, "OLD"]) });
      const game = await openGame(page, scoringGame(), address);
      await playToEnd(page);
      await expect(game).toHaveAttribute("data-status", "over");
      await expect(game).toHaveAttribute("data-score", "1");
      await expect(entryPanel(page)).toBeHidden();
      await expect(page.locator("#status")).toHaveText(
        "Game over: you hit the wall. Enter or New game to play again",
      );
      expect(await stored(page)).toBe(list([9, 3, "OLD"]));
      await scoresLink(page).click();
      expect(await rows(page)).toEqual([["1ST", "9", "3", "OLD"]]);
    });
  }
});

test.describe("failed reads and writes (docs/SPEC.md 2.15 (6))", () => {
  test("storage that cannot be reached: the game and the entry work, and the list lasts for the page", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new DOMException("denied", "SecurityError");
        },
      });
    });
    const game = await openGame(page, scoringGame());
    await playToEnd(page);
    await expect(game).toHaveAttribute("data-status", "over");
    await expect(entryPanel(page).locator("#entry-rank")).toHaveText("1ST");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("Enter");
    expect(await rows(page)).toEqual([["1ST", "1", "1", "BAA"]]);
    await expect(tablePanel(page).locator(MARKED)).toHaveCount(1);
    await page.keyboard.press("Escape");
    await scoresLink(page).click();
    expect(await rows(page)).toEqual([["1ST", "1", "1", "BAA"]]);
    await page.keyboard.press("Escape");
    expect(await logLines(page)).toContain("scores name=BAA rank=1");
  });

  test("a store that reads but refuses writes: the entry is kept in memory and the store is not read again", async ({
    page,
  }) => {
    await page.addInitScript(
      ({ key }) => {
        const counter = { reads: 0 };
        (window as unknown as { scoreReads: typeof counter }).scoreReads = counter;
        const read = Storage.prototype.getItem;
        Storage.prototype.getItem = function (name: string) {
          if (name === key) counter.reads++;
          return read.call(this, name);
        };
        Storage.prototype.setItem = () => {
          throw new DOMException("quota", "QuotaExceededError");
        };
      },
      { key: SCORES_KEY },
    );
    await openGame(page, scoringGame());
    await playToEnd(page);
    await page.keyboard.press("Enter");
    expect(await rows(page)).toEqual([["1ST", "1", "1", "AAA"]]);
    expect(await stored(page)).toBeNull();
    const readsAfterFailedWrite = await page.evaluate(
      () => (window as unknown as { scoreReads: { reads: number } }).scoreReads.reads,
    );
    await page.keyboard.press("Escape");
    await scoresLink(page).click();
    expect(await rows(page)).toEqual([["1ST", "1", "1", "AAA"]]);
    await page.keyboard.press("Escape");
    await scoresLink(page).click();
    expect(await rows(page)).toEqual([["1ST", "1", "1", "AAA"]]);
    const readsAfterOpening = await page.evaluate(
      () => (window as unknown as { scoreReads: { reads: number } }).scoreReads.reads,
    );
    expect(readsAfterOpening).toBe(readsAfterFailedWrite);
  });

  test("a stored list that is malformed reads as an empty list: the game's entry is the only row", async ({
    page,
  }) => {
    await seed(page, { [SCORES_KEY]: "50:6:AAA,not a list" });
    await openGame(page, scoringGame());
    await playToEnd(page);
    await expect(entryPanel(page).locator("#entry-rank")).toHaveText("1ST");
    await page.keyboard.press("Enter");
    expect(await stored(page)).toBe("1:1:AAA");
  });
});

test.describe("the list is read again at the confirmation (docs/SPEC.md 2.15 (6))", () => {
  test("entries another tab stored in the meantime are kept, and the rank is the one found then", async ({
    page,
  }) => {
    await openGame(page, scoringGame());
    await playToEnd(page);
    await expect(entryPanel(page).locator("#entry-rank")).toHaveText("1ST");
    await page.evaluate((key) => window.localStorage.setItem(key, "5:2:TAB"), SCORES_KEY);
    await page.keyboard.press("Enter");
    expect(await stored(page)).toBe(list([5, 2, "TAB"], [1, 1, "AAA"]));
    expect(await rows(page)).toEqual([
      ["1ST", "5", "2", "TAB"],
      ["2ND", "1", "1", "AAA"],
    ]);
    await expect(tablePanel(page).locator(MARKED).locator("td").nth(3)).toHaveText("AAA");
    await page.keyboard.press("Escape");
    expect(await logLines(page)).toContain("scores name=AAA rank=2");
  });

  test("if the list has no room left then, nothing is stored, the line says full and the table has no marked row", async ({
    page,
  }) => {
    const nine = list(
      [100, 9, "AAA"],
      [90, 9, "AAA"],
      [80, 9, "AAA"],
      [70, 9, "AAA"],
      [60, 9, "AAA"],
      [50, 9, "AAA"],
      [40, 9, "AAA"],
      [30, 9, "AAA"],
      [20, 9, "AAA"],
    );
    const filled = list(
      [900, 9, "ZZZ"],
      [800, 9, "ZZZ"],
      [700, 9, "ZZZ"],
      [600, 9, "ZZZ"],
      [500, 9, "ZZZ"],
      [400, 9, "ZZZ"],
      [300, 9, "ZZZ"],
      [200, 9, "ZZZ"],
      [100, 9, "ZZZ"],
      [90, 9, "ZZZ"],
    );
    await seed(page, { [SCORES_KEY]: nine });
    await openGame(page, scoringGame());
    await playToEnd(page);
    await expect(entryPanel(page).locator("#entry-rank")).toHaveText("10TH");
    await page.evaluate(([key, value]) => window.localStorage.setItem(key, value), [
      SCORES_KEY,
      filled,
    ] as const);
    await page.keyboard.press("Enter");
    await expect(tablePanel(page)).toBeVisible();
    await expect(tablePanel(page).locator(MARKED)).toHaveCount(0);
    expect(await stored(page)).toBe(filled);
    expect((await rows(page)).map((row) => row[1])).toEqual([
      "900",
      "800",
      "700",
      "600",
      "500",
      "400",
      "300",
      "200",
      "100",
      "90",
    ]);
    await page.keyboard.press("Escape");
    expect(await logLines(page)).toContain("scores name=AAA full");
  });

  test("an entry that drops the 10th out of a full list: the stored list is the first 10", async ({
    page,
  }) => {
    const ten = list(
      [100, 9, "AAA"],
      [90, 9, "AAA"],
      [80, 9, "AAA"],
      [70, 9, "AAA"],
      [60, 9, "AAA"],
      [50, 9, "AAA"],
      [40, 9, "AAA"],
      [30, 9, "AAA"],
      [20, 9, "AAA"],
      [1, 9, "OLD"],
    );
    await seed(page, { [SCORES_KEY]: ten });
    // A game that scores 2: the dots at (12,10) and (13,10) are eaten on ticks 2 and 3.
    await openGame(page, [
      answer(startIndex("10,10", "right"), STARTS),
      answer(freeIndex("12,10", ["10,10"]), 399),
      answer(freeIndex("13,10", ["10,10", "11,10", "12,10"]), 397),
      answer(0, 396),
    ]);
    await playToEnd(page);
    await expect(page.locator("#game")).toHaveAttribute("data-score", "2");
    await expect(entryPanel(page).locator("#entry-rank")).toHaveText("10TH");
    await page.keyboard.press("Enter");
    const after = (await stored(page)) ?? "";
    expect(after.split(",")).toHaveLength(10);
    expect(after.endsWith("20:9:AAA,2:1:AAA")).toBe(true);
    expect(after).not.toContain("OLD");
    await expect(tablePanel(page).locator(MARKED).locator("td").first()).toHaveText("10TH");
  });

  test("the list outlives a reload, and the best score's row is derived again from the best score", async ({
    page,
  }) => {
    await seed(page, { [BEST_KEY]: "50" });
    const game = await openGame(page, scoringGame());
    await playToEnd(page);
    await page.keyboard.press("Enter");
    await page.reload();
    await expect(game).toHaveAttribute("data-status", "ready");
    await scoresLink(page).click();
    expect(await rows(page)).toEqual([
      ["1ST", "50", "--", "---"],
      ["2ND", "1", "1", "AAA"],
    ]);
    await expect(tablePanel(page).locator(MARKED)).toHaveCount(0);
  });
});
