import type { Locator, Page } from "@playwright/test";
import {
  answer,
  expect,
  focusNothing,
  openGame,
  runTicks,
  STARTS,
  splitPanel,
  startIndex,
  test,
} from "./helpers";

// The level records (docs/SPEC.md 2.18 (4) to (7)): the line, what a cleared level sets and the log
// lines it makes, the Records link and its table, and storage that fails. The page's random answers
// are fixed by each test (helpers.ts).

const RECORDS_KEY = "snake-demo.records";
const LEVEL_5_DELAY = 55;

/** The example of 2.18 (5): level 4 and level 5. */
const EXAMPLE = "4:12:25300:18150:14,5:15:18040:15180:16";

/** Level 1 (and 2, ...): from (10,10) heading right, its 5 dots straight ahead (see levelstats.e2e.ts). */
function straightLevel(level: number): number[] {
  return [
    answer(startIndex("10,10", "right"), STARTS),
    ...Array.from({ length: level - 1 }, () => 0),
    ...[0, 1, 2, 3, 4].map((k) => answer(211 - level, 400 - level - k)),
  ];
}

/** Levels 1, 2 and 3 laid out straight: level 1 cleared by 5 moves of 125 ms (625 ms, 0 turns), level 2 by 5 of 120 ms. */
const LEVELS_1_TO_3 = [1, 2, 3].flatMap(straightLevel);
const CLEAR_1 = "cleared level 1 turns=0 time=625 score=5";
const RECORD_1_BOTH = "1:0:625:625:0";

/** Level 5 from (0,19) heading up with its 4 obstacles in row 0 and its dot on (19,0): a staircase never meets anything. */
const LEVEL_5_STAIRS = [answer(startIndex("0,19", "up"), STARTS), 0, 0, 0, 0, answer(15, 395)];

/** The answers of a game that eats one dot and then hits the wall (as scores.e2e.ts has it). */
const SCORING_GAME = [
  answer(startIndex("10,10", "right"), STARTS),
  answer(11, 399),
  answer(0, 397),
];

/** Puts values in the page's local storage before the page loads, unless they are there already. */
async function seed(page: Page, values: Record<string, string>): Promise<void> {
  await page.addInitScript((entries) => {
    for (const [key, value] of Object.entries(entries)) {
      if (window.localStorage.getItem(key) === null) window.localStorage.setItem(key, value);
    }
  }, values);
}

const stored = (page: Page): Promise<string | null> =>
  page.evaluate((key) => window.localStorage.getItem(key), RECORDS_KEY);

const named = (page: Page, name: string): Locator =>
  page.getByRole("button", { name, exact: true });
const recordsLink = (page: Page): Locator => named(page, "Records");
const recordsPanel = (page: Page): Locator => page.getByRole("dialog", { name: "Level records" });
const closeButton = (page: Page): Locator =>
  recordsPanel(page).getByRole("button", { name: "Close" });
const tableBox = (page: Page): Locator => page.locator("#records-scroll");
const line = (page: Page): Locator => page.locator("#records-line");

const NO_RECORDS_LINE = "Fewest turns: – · Fastest: –";

/** The log's lines without their stamps and without the first line (opens the Log panel and closes it). */
async function logLines(page: Page): Promise<string[]> {
  await named(page, "Log").click();
  const text = (await page.locator("#log-text").textContent()) ?? "";
  await page.keyboard.press("Escape");
  return splitPanel(text)
    .lines.slice(1)
    .map((entry) => entry.replace(/^\[t=\d+ #\d+\] /, ""));
}

const recordLines = (lines: readonly string[]): string[] =>
  lines.filter((entry) => entry.startsWith("record "));

/** Starts the snake right and runs it into the wall: `over` after 10 ticks, score 0 (the dot is out of the way). */
async function playToWall(page: Page): Promise<void> {
  await page.keyboard.press("ArrowRight");
  await runTicks(page, 10);
}

/** The rows of the records table as the texts of their cells. */
async function rows(page: Page): Promise<string[][]> {
  const found = recordsPanel(page).locator("tbody tr");
  const result: string[][] = [];
  for (let index = 0; index < (await found.count()); index++) {
    result.push(await found.nth(index).locator("td").allTextContents());
  }
  return result;
}

const overflow = (page: Page): Promise<number> =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

// ---------------------------------------------------------------------------------------------
// 2.18 (6): the line.

test.describe("the line of the current level's records (docs/SPEC.md 2.18 (6))", () => {
  test("a level with no records shows an en dash in place of each text", async ({ page }) => {
    await openGame(page);
    await expect(line(page)).toHaveText(NO_RECORDS_LINE);
  });

  test("shows the records stored for the level before the page loads, with the exact text", async ({
    page,
  }) => {
    await seed(page, { [RECORDS_KEY]: "1:12:25300:18150:14,5:15:18040:15180:16" });
    await openGame(page);
    await expect(line(page)).toHaveText("Fewest turns: 12 turns (25s) · Fastest: 18s (14 turns)");
    await expect(
      page.getByText("Fewest turns: 12 turns (25s) · Fastest: 18s (14 turns)"),
    ).toBeVisible();
  });

  test("shows no records for a level the stored records do not hold", async ({ page }) => {
    await seed(page, { [RECORDS_KEY]: EXAMPLE });
    await openGame(page);
    await expect(line(page)).toHaveText(NO_RECORDS_LINE);
  });

  test("1 turn and 0 turns, and a time rounded down to whole seconds", async ({ page }) => {
    await seed(page, { [RECORDS_KEY]: "1:1:9999:24999:0" });
    await openGame(page);
    await expect(line(page)).toHaveText("Fewest turns: 1 turn (9s) · Fastest: 24s (0 turns)");
  });

  test("an invalid stored value reads as no records", async ({ page }) => {
    await seed(page, { [RECORDS_KEY]: "1:012:25300:18150:14" });
    await openGame(page);
    await expect(line(page)).toHaveText(NO_RECORDS_LINE);
  });

  test("a value with a number past its bound reads as no records", async ({ page }) => {
    await seed(page, { [RECORDS_KEY]: "1:100000:25300:18150:14" });
    await openGame(page);
    await expect(line(page)).toHaveText(NO_RECORDS_LINE);
  });

  test("is shown on a playtest page too, as the records are stored", async ({ page }) => {
    await seed(page, { [RECORDS_KEY]: "5:15:18040:15180:16" });
    await openGame(page, LEVEL_5_STAIRS, "/?level=5");
    await expect(line(page)).toHaveText("Fewest turns: 15 turns (18s) · Fastest: 15s (16 turns)");
  });

  test("is shown on a page with slow on, and with no records there", async ({ page }) => {
    await openGame(page, LEVEL_5_STAIRS, "/?level=5&slow");
    await expect(line(page)).toHaveText(NO_RECORDS_LINE);
  });

  test("is shown in every state: ready, running, paused and over", async ({ page }) => {
    await seed(page, { [RECORDS_KEY]: "1:3:2000:500:9" });
    const game = await openGame(page);
    const text = "Fewest turns: 3 turns (2s) · Fastest: 0s (9 turns)";
    await expect(line(page)).toHaveText(text);
    await page.keyboard.press("ArrowRight");
    await expect(game).toHaveAttribute("data-status", "running");
    await expect(line(page)).toHaveText(text);
    await focusNothing(page);
    await page.keyboard.press("p");
    await expect(game).toHaveAttribute("data-status", "paused");
    await expect(line(page)).toHaveText(text);
    await page.keyboard.press("p");
    await runTicks(page, 10);
    await expect(game).toHaveAttribute("data-status", "over");
    await expect(line(page)).toHaveText(text);
  });

  test("sits under the values and above the board", async ({ page }) => {
    await openGame(page);
    const values = await page.locator(".scores").boundingBox();
    const text = await line(page).boundingBox();
    const board = await page.locator("#board").boundingBox();
    expect(values && text && board).toBeTruthy();
    if (values === null || text === null || board === null) return;
    expect(text.y).toBeGreaterThanOrEqual(values.y + values.height - 1);
    expect(text.y + text.height).toBeLessThanOrEqual(board.y + 1);
  });

  test("on a special level sits under the special values too", async ({ page }) => {
    await openGame(page, LEVEL_5_STAIRS, "/?level=5");
    const special = await page.locator("#special").boundingBox();
    const text = await line(page).boundingBox();
    const board = await page.locator("#board").boundingBox();
    expect(special && text && board).toBeTruthy();
    if (special === null || text === null || board === null) return;
    expect(text.y).toBeGreaterThanOrEqual(special.y + special.height - 1);
    expect(text.y + text.height).toBeLessThanOrEqual(board.y + 1);
  });

  test("is in no live region, so the page does not announce its changes, and is in the muted colour", async ({
    page,
  }) => {
    await openGame(page);
    const inLiveRegion = await line(page).evaluate(
      (element) => element.closest("[aria-live], [role=status], [role=alert], [role=log]") !== null,
    );
    expect(inLiveRegion).toBe(false);
    const colours = await page.evaluate(() => {
      const element = document.getElementById("records-line");
      const probe = document.createElement("span");
      probe.style.color = "var(--muted)";
      document.body.append(probe);
      const muted = getComputedStyle(probe).color;
      probe.remove();
      return { line: element ? getComputedStyle(element).color : "", muted };
    });
    expect(colours.line).toBe(colours.muted);
  });

  test("changes when a level is laid out: a new game reads the records another tab stored", async ({
    page,
  }) => {
    const game = await openGame(page);
    await expect(line(page)).toHaveText(NO_RECORDS_LINE);
    await page.evaluate((key) => window.localStorage.setItem(key, "1:2:3000:2500:4"), RECORDS_KEY);
    // Not read again until a level is laid out.
    await expect(line(page)).toHaveText(NO_RECORDS_LINE);
    await focusNothing(page);
    await page.keyboard.press("Enter");
    await expect(game).toHaveAttribute("data-status", "ready");
    await expect(line(page)).toHaveText("Fewest turns: 2 turns (3s) · Fastest: 2s (4 turns)");
  });

  test("at 375 px the longest line wraps between its two texts and the page does not scroll sideways", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await seed(page, { [RECORDS_KEY]: "1:99999:99999999:99999999:99999" });
    await openGame(page);
    await expect(line(page)).toHaveText(
      "Fewest turns: 99999 turns (99999s) · Fastest: 99999s (99999 turns)",
    );
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    const parts = await line(page)
      .locator("span")
      .evaluateAll((spans) =>
        spans.map((span) => {
          const box = span.getBoundingClientRect();
          return { top: box.top, bottom: box.bottom, right: box.right };
        }),
      );
    expect(parts).toHaveLength(2);
    // The two texts are on two lines, and neither is wider than the screen.
    expect(parts[1]?.top ?? 0).toBeGreaterThanOrEqual((parts[0]?.bottom ?? 0) - 1);
    for (const part of parts) expect(part.right).toBeLessThanOrEqual(375);
  });
});

// ---------------------------------------------------------------------------------------------
// 2.18 (4), 2.13 (5): what a cleared level sets, and the log lines.

test.describe("what a cleared level sets (docs/SPEC.md 2.18 (4), 2.13 (5))", () => {
  test("the first clear of a level sets both records, and writes the two record lines after the cleared line", async ({
    page,
  }) => {
    const game = await openGame(page, LEVELS_1_TO_3);
    expect(await stored(page)).toBeNull();
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 5);
    await expect(game).toHaveAttribute("data-level", "2");
    expect(await stored(page)).toBe(RECORD_1_BOTH);
    const lines = await logLines(page);
    const at = lines.indexOf(CLEAR_1);
    expect(at).toBeGreaterThan(0);
    expect(lines[at + 1]).toBe("record fewest level=1 turns=0 time=625");
    expect(lines[at + 2]).toBe("record fastest level=1 time=625 turns=0");
    expect(lines[at + 3]).toMatch(/^level 2 normal /);
  });

  test("the line shows the records the next time that level is laid out, and not before", async ({
    page,
  }) => {
    const game = await openGame(page, LEVELS_1_TO_3);
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 5);
    // Level 2 is laid out: its line is its own, with no records yet.
    await expect(game).toHaveAttribute("data-level", "2");
    await expect(line(page)).toHaveText(NO_RECORDS_LINE);
    await focusNothing(page);
    await page.keyboard.press("Enter");
    await expect(game).toHaveAttribute("data-level", "1");
    await expect(line(page)).toHaveText("Fewest turns: 0 turns (0s) · Fastest: 0s (0 turns)");
  });

  test("a clear that is better in turns only sets only the fewest and keeps the fastest", async ({
    page,
  }) => {
    await seed(page, { [RECORDS_KEY]: "1:3:2000:500:9" });
    const game = await openGame(page, LEVELS_1_TO_3);
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 5);
    await expect(game).toHaveAttribute("data-level", "2");
    expect(await stored(page)).toBe("1:0:625:500:9");
    expect(recordLines(await logLines(page))).toEqual(["record fewest level=1 turns=0 time=625"]);
  });

  test("a clear that is better in time only sets only the fastest and keeps the fewest", async ({
    page,
  }) => {
    await seed(page, { [RECORDS_KEY]: "1:0:500:2000:9" });
    const game = await openGame(page, LEVELS_1_TO_3);
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 5);
    await expect(game).toHaveAttribute("data-level", "2");
    expect(await stored(page)).toBe("1:0:500:625:0");
    expect(recordLines(await logLines(page))).toEqual(["record fastest level=1 time=625 turns=0"]);
  });

  test("a clear that equals both records changes nothing and writes no record line", async ({
    page,
  }) => {
    await seed(page, { [RECORDS_KEY]: RECORD_1_BOTH });
    const game = await openGame(page, LEVELS_1_TO_3);
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 5);
    await expect(game).toHaveAttribute("data-level", "2");
    expect(await stored(page)).toBe(RECORD_1_BOTH);
    const lines = await logLines(page);
    expect(lines).toContain(CLEAR_1);
    expect(recordLines(lines)).toEqual([]);
  });

  test("a clear that is worse in both sets none", async ({ page }) => {
    await seed(page, { [RECORDS_KEY]: "1:0:500:500:0" });
    const game = await openGame(page, LEVELS_1_TO_3);
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 5);
    await expect(game).toHaveAttribute("data-level", "2");
    expect(await stored(page)).toBe("1:0:500:500:0");
    expect(recordLines(await logLines(page))).toEqual([]);
  });

  test("keeps the records of other levels, and those another tab stored between the page load and the clear", async ({
    page,
  }) => {
    await seed(page, { [RECORDS_KEY]: "5:15:18040:15180:16" });
    const game = await openGame(page, LEVELS_1_TO_3);
    await expect(line(page)).toHaveText(NO_RECORDS_LINE);
    await page.evaluate(
      (key) => window.localStorage.setItem(key, "3:2:2000:2000:2,5:15:18040:15180:16"),
      RECORDS_KEY,
    );
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 5);
    await expect(game).toHaveAttribute("data-level", "2");
    expect(await stored(page)).toBe(`${RECORD_1_BOTH},3:2:2000:2000:2,5:15:18040:15180:16`);
  });

  test("a stored value that is invalid is replaced by the clear's records alone", async ({
    page,
  }) => {
    await seed(page, { [RECORDS_KEY]: "garbage" });
    const game = await openGame(page, LEVELS_1_TO_3);
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 5);
    await expect(game).toHaveAttribute("data-level", "2");
    expect(await stored(page)).toBe(RECORD_1_BOTH);
  });

  test("a special level cleared sets its records and logs them after its cleared line", async ({
    page,
  }) => {
    // Levels 1 to 4 are cleared first, as special.e2e.ts does; each of the five levels lays its dots straight ahead.
    const levels = [1, 2, 3, 4, 5].flatMap(straightLevel);
    const game = await openGame(page, levels);
    for (const [index, delay] of [125, 120, 115, 110].entries()) {
      await expect(game).toHaveAttribute("data-level", String(index + 1));
      await page.keyboard.press("ArrowRight");
      await runTicks(page, 5, delay);
    }
    await expect(game).toHaveAttribute("data-level", "5");
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 5, LEVEL_5_DELAY);
    await expect(game).toHaveAttribute("data-level", "6");
    const lines = await logLines(page);
    const cleared = lines.findIndex((entry) => entry.startsWith("cleared level 5 "));
    expect(cleared).toBeGreaterThan(0);
    expect(lines[cleared + 1]).toBe("record fewest level=5 turns=0 time=275");
    expect(lines[cleared + 2]).toBe("record fastest level=5 time=275 turns=0");
    const text = (await stored(page)) ?? "";
    expect(text.split(",").map((entry) => entry.split(":")[0])).toEqual(["1", "2", "3", "4", "5"]);
    expect(text.endsWith("5:0:275:275:0")).toBe(true);
  });

  test("a playtest page sets no record, writes no record line and leaves the stored ones", async ({
    page,
  }) => {
    await seed(page, { [RECORDS_KEY]: "1:3:2000:500:9" });
    // ?level=1 is a playtest page that starts at level 1.
    const game = await openGame(page, LEVELS_1_TO_3, "/?level=1");
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 5);
    await expect(game).toHaveAttribute("data-level", "2");
    expect(await stored(page)).toBe("1:3:2000:500:9");
    const lines = await logLines(page);
    expect(lines).toContain(CLEAR_1);
    expect(recordLines(lines)).toEqual([]);
  });

  test("a playtest page with slow sets no record either", async ({ page }) => {
    const game = await openGame(page, LEVELS_1_TO_3, "/?slow");
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 5);
    await expect(game).toHaveAttribute("data-level", "2");
    expect(await stored(page)).toBeNull();
    expect(recordLines(await logLines(page))).toEqual([]);
  });

  test("a game that ends on a level without clearing it sets no record", async ({ page }) => {
    const game = await openGame(page);
    await playToWall(page);
    await expect(game).toHaveAttribute("data-status", "over");
    expect(await stored(page)).toBeNull();
    expect(recordLines(await logLines(page))).toEqual([]);
  });

  test("the first line of the log does not name the records' bounds", async ({ page }) => {
    await openGame(page);
    await named(page, "Log").click();
    const text = (await page.locator("#log-text").textContent()) ?? "";
    const first = text.split("\n")[0] ?? "";
    expect(first).not.toMatch(/99999|record/i);
    await page.keyboard.press("Escape");
  });
});

// ---------------------------------------------------------------------------------------------
// 2.18 (5): a store that fails.

test.describe("a store that fails (docs/SPEC.md 2.18 (5))", () => {
  test("a store that throws on reading: the line has dashes, the panel says no records, the game goes on", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Storage.prototype.getItem = () => {
        throw new Error("read refused");
      };
    });
    const game = await openGame(page);
    await expect(line(page)).toHaveText(NO_RECORDS_LINE);
    await recordsLink(page).click();
    await expect(recordsPanel(page)).toContainText("No records yet");
    await page.keyboard.press("Escape");
    await focusNothing(page);
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 1);
    await expect(game).toHaveAttribute("data-status", "running");
  });

  test("a store that cannot even be got hold of: the same, and a clear sets records in memory", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new DOMException("denied", "SecurityError");
        },
      });
    });
    const game = await openGame(page, LEVELS_1_TO_3);
    await expect(line(page)).toHaveText(NO_RECORDS_LINE);
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 5);
    await expect(game).toHaveAttribute("data-level", "2");
    expect(recordLines(await logLines(page))).toEqual([
      "record fewest level=1 turns=0 time=625",
      "record fastest level=1 time=625 turns=0",
    ]);
    await focusNothing(page);
    await page.keyboard.press("Enter");
    await expect(line(page)).toHaveText("Fewest turns: 0 turns (0s) · Fastest: 0s (0 turns)");
  });

  test("a write that fails: the records are kept in memory for the rest of the page's life, and the next clear writes them all again", async ({
    page,
  }) => {
    await page.addInitScript(
      ([key]) => {
        const original = Storage.prototype.setItem;
        let refused = 0;
        Storage.prototype.setItem = function setItem(name: string, value: string) {
          if (name === key && refused++ === 0) throw new Error("quota");
          original.call(this, name, value);
        };
      },
      [RECORDS_KEY],
    );
    const game = await openGame(page, LEVELS_1_TO_3);
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 5);
    await expect(game).toHaveAttribute("data-level", "2");
    // The write failed: nothing is stored, but the log has the lines, and the table has the row.
    expect(await stored(page)).toBeNull();
    expect(recordLines(await logLines(page))).toEqual([
      "record fewest level=1 turns=0 time=625",
      "record fastest level=1 time=625 turns=0",
    ]);
    await recordsLink(page).click();
    await expect(await rows(page)).toEqual([["1", "0 turns (0s)", "0s (0 turns)"]]);
    await page.keyboard.press("Escape");
    // Level 2 is cleared: the write goes through, with the records of level 1 from memory.
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 5, 120);
    await expect(game).toHaveAttribute("data-level", "3");
    expect(await stored(page)).toBe(`${RECORD_1_BOTH},2:0:600:600:0`);
  });

  test("after a failed write another tab's records are no longer read", async ({ page }) => {
    await page.addInitScript(
      ([key]) => {
        const original = Storage.prototype.setItem;
        (window as unknown as { rawSet: typeof original }).rawSet = original;
        Storage.prototype.setItem = function setItem(name: string, value: string) {
          if (name === key) throw new Error("quota");
          original.call(this, name, value);
        };
      },
      [RECORDS_KEY],
    );
    const game = await openGame(page, LEVELS_1_TO_3);
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 5);
    await expect(game).toHaveAttribute("data-level", "2");
    // Another tab stores records; this page uses its own memory from now on.
    await page.evaluate((key) => {
      const raw = (window as unknown as { rawSet: Storage["setItem"] }).rawSet;
      raw.call(window.localStorage, key, "7:1:1000:1000:1");
    }, RECORDS_KEY);
    expect(await stored(page)).toBe("7:1:1000:1000:1");
    await recordsLink(page).click();
    expect(await rows(page)).toEqual([["1", "0 turns (0s)", "0s (0 turns)"]]);
  });
});

// ---------------------------------------------------------------------------------------------
// 2.18 (7): the Records link and the panel with the table.

const EIGHTY = Array.from({ length: 80 }, (_, index) => `${index + 1}:5:20000:15000:7`).join(",");

/** The keys that were pressed in the page, with whether the page stopped them (`defaultPrevented`). */
async function watchKeys(page: Page): Promise<void> {
  await page.evaluate(() => {
    const seen: Array<[string, boolean]> = [];
    (window as unknown as { seenKeys: typeof seen }).seenKeys = seen;
    document.addEventListener("keydown", (event) => seen.push([event.key, event.defaultPrevented]));
  });
}
const keysSeen = (page: Page): Promise<Array<[string, boolean]>> =>
  page.evaluate(() => (window as unknown as { seenKeys: Array<[string, boolean]> }).seenKeys);

const scrollTop = (page: Page): Promise<number> => tableBox(page).evaluate((box) => box.scrollTop);

/** Level 5 played to a blown game by the staircase of special.e2e.ts: 21 turns on a level of 20. */
async function playToBlown(page: Page): Promise<void> {
  await page.keyboard.press("ArrowUp");
  await runTicks(page, 1, LEVEL_5_DELAY);
  for (let turn = 1; turn <= 20; turn++) {
    await page.keyboard.press(turn % 2 === 1 ? "ArrowRight" : "ArrowUp");
    await runTicks(page, 1, LEVEL_5_DELAY);
  }
  await page.keyboard.press("ArrowRight");
  await runTicks(page, 1, LEVEL_5_DELAY);
}

test.describe("the Records link and the panel (docs/SPEC.md 2.18 (7))", () => {
  test("the link is below the board next to the Log and Scores links; the panel is not on the page during play", async ({
    page,
  }) => {
    const game = await openGame(page);
    const link = await recordsLink(page).boundingBox();
    const board = await page.locator("#board").boundingBox();
    const log = await named(page, "Log").boundingBox();
    const scores = await named(page, "Scores").boundingBox();
    expect(link && board && log && scores).toBeTruthy();
    if (link === null || board === null || log === null || scores === null) return;
    expect(link.y).toBeGreaterThanOrEqual(board.y + board.height - 1);
    expect(Math.abs(link.y - log.y)).toBeLessThan(link.height);
    expect(Math.abs(link.y - scores.y)).toBeLessThan(link.height);
    await expect(recordsPanel(page)).toBeHidden();
    await expect(page.getByText("No records yet")).toBeHidden();
    await expect(page.getByText("Level records")).toBeHidden();
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 3);
    await expect(game).toHaveAttribute("data-status", "running");
    await expect(recordsPanel(page)).toBeHidden();
  });

  test("the panel is titled Level records and has a table with the headings Level, Fewest turns and Fastest", async ({
    page,
  }) => {
    await seed(page, { [RECORDS_KEY]: EXAMPLE });
    await openGame(page);
    await recordsLink(page).click();
    const panel = recordsPanel(page);
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("heading", { name: "Level records" })).toBeVisible();
    const headings = panel.getByRole("columnheader");
    await expect(headings).toHaveText(["Level", "Fewest turns", "Fastest"]);
    await expect(closeButton(page)).toBeVisible();
    await expect(panel.getByRole("table")).toBeVisible();
  });

  test("has a row for each level that has records, in ascending order of level, with the texts of the line", async ({
    page,
  }) => {
    await seed(page, { [RECORDS_KEY]: `1:1:9999:24999:0,${EXAMPLE}` });
    await openGame(page);
    await recordsLink(page).click();
    expect(await rows(page)).toEqual([
      ["1", "1 turn (9s)", "24s (0 turns)"],
      ["4", "12 turns (25s)", "18s (14 turns)"],
      ["5", "15 turns (18s)", "15s (16 turns)"],
    ]);
    await expect(recordsPanel(page)).not.toContainText("No records yet");
  });

  test("with no records it says No records yet instead of the rows, and the headings stay", async ({
    page,
  }) => {
    await openGame(page);
    await recordsLink(page).click();
    const panel = recordsPanel(page);
    await expect(panel).toContainText("No records yet");
    await expect(panel.getByRole("columnheader")).toHaveText(["Level", "Fewest turns", "Fastest"]);
    expect(await rows(page)).toEqual([]);
  });

  test("an invalid stored value reads as no records in the panel too", async ({ page }) => {
    await seed(page, { [RECORDS_KEY]: "4:12:25300:18150:14,4:1:1:1:1" });
    await openGame(page);
    await recordsLink(page).click();
    await expect(recordsPanel(page)).toContainText("No records yet");
  });

  test("reads what is stored when it opens, each time", async ({ page }) => {
    await openGame(page);
    await recordsLink(page).click();
    await expect(recordsPanel(page)).toContainText("No records yet");
    await page.keyboard.press("Escape");
    await page.evaluate((key) => window.localStorage.setItem(key, "2:3:4000:3000:5"), RECORDS_KEY);
    await recordsLink(page).click();
    expect(await rows(page)).toEqual([["2", "3 turns (4s)", "3s (5 turns)"]]);
  });

  test("has a row for each of 80 levels, and the table scrolls inside the panel", async ({
    page,
  }) => {
    await seed(page, { [RECORDS_KEY]: EIGHTY });
    await openGame(page);
    await recordsLink(page).click();
    await expect(recordsPanel(page).locator("tbody tr")).toHaveCount(80);
    const sizes = await tableBox(page).evaluate((box) => ({
      scroll: box.scrollHeight,
      client: box.clientHeight,
    }));
    expect(sizes.scroll).toBeGreaterThan(sizes.client);
    // The panel stays over the board: it is no taller than the board's frame.
    const panel = await recordsPanel(page).boundingBox();
    const frame = await page.locator(".board-frame").boundingBox();
    expect(panel && frame).toBeTruthy();
    if (panel !== null && frame !== null) {
      expect(panel.height).toBeLessThanOrEqual(frame.height + 1);
      expect(panel.width).toBeLessThanOrEqual(frame.width + 1);
    }
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });

  test("the table is a Tab stop", async ({ page }) => {
    await seed(page, { [RECORDS_KEY]: EXAMPLE });
    await openGame(page);
    await recordsLink(page).click();
    await expect(tableBox(page)).toHaveAttribute("tabindex", "0");
    await expect(tableBox(page).getByRole("table")).toBeVisible();
  });

  test("its look is the plain one of the log panel and not the arcade look", async ({ page }) => {
    await seed(page, { [RECORDS_KEY]: EXAMPLE });
    await openGame(page);
    await recordsLink(page).click();
    const look = await page.evaluate(() => {
      const read = (id: string) => {
        const element = document.getElementById(id);
        if (element === null) throw new Error(id);
        const style = getComputedStyle(element);
        return {
          background: style.backgroundColor,
          image: style.backgroundImage,
          border: style.borderTopColor,
          radius: style.borderTopLeftRadius,
          animation: style.animationName,
          after: getComputedStyle(element, "::after").content,
          arcade: element.classList.contains("score-panel"),
          drawn: element.querySelectorAll("[data-px], svg").length,
        };
      };
      return { records: read("records-panel"), log: read("log-panel") };
    });
    expect(look.records.arcade).toBe(false);
    expect(look.records.drawn).toBe(0);
    expect(look.records.animation).toBe("none");
    expect(look.records.image).toBe("none");
    expect(look.records.after).toBe(look.log.after);
    expect(look.records.background).toBe(look.log.background);
    expect(look.records.border).toBe(look.log.border);
    expect(look.records.radius).toBe(look.log.radius);
    // The text is real text, readable by its words.
    await expect(recordsPanel(page).getByText("12 turns (25s)")).toBeVisible();
  });

  test.describe("opening and closing in each state", () => {
    test("ready: opening and closing change nothing and make no line", async ({ page }) => {
      const game = await openGame(page);
      await recordsLink(page).click();
      await expect(recordsPanel(page)).toBeVisible();
      await expect(game).toHaveAttribute("data-status", "ready");
      await closeButton(page).click();
      await expect(recordsPanel(page)).toBeHidden();
      await expect(game).toHaveAttribute("data-status", "ready");
      const lines = await logLines(page);
      expect(lines).toHaveLength(1);
      expect(lines[0]).toMatch(/^level 1 normal /);
    });

    test("running: opening pauses the game, Close goes on, and the log says pause records and resume records", async ({
      page,
    }) => {
      const game = await openGame(page);
      await page.keyboard.press("ArrowRight");
      await runTicks(page, 2);
      await expect(game).toHaveAttribute("data-head", "12,10");
      await recordsLink(page).click();
      await expect(game).toHaveAttribute("data-status", "paused");
      await runTicks(page, 5);
      await expect(game).toHaveAttribute("data-head", "12,10");
      await expect(game).toHaveAttribute("data-time", "250");
      await closeButton(page).click();
      await expect(game).toHaveAttribute("data-status", "running");
      await runTicks(page, 1);
      await expect(game).toHaveAttribute("data-head", "13,10");
      const lines = await logLines(page);
      const pause = lines.indexOf("pause records");
      expect(pause).toBeGreaterThan(0);
      expect(lines[pause - 1]).toBe("move right 2 head=(12,10)");
      expect(lines[pause + 1]).toBe("resume records");
    });

    test("running: Escape closes it and goes on too", async ({ page }) => {
      const game = await openGame(page);
      await page.keyboard.press("ArrowRight");
      await runTicks(page, 1);
      await recordsLink(page).click();
      await expect(game).toHaveAttribute("data-status", "paused");
      await page.keyboard.press("Escape");
      await expect(recordsPanel(page)).toBeHidden();
      await expect(game).toHaveAttribute("data-status", "running");
      expect(await logLines(page)).toContain("resume records");
    });

    test("paused: opening and closing leave the game paused and make no line", async ({ page }) => {
      const game = await openGame(page);
      await page.keyboard.press("ArrowRight");
      await runTicks(page, 1);
      await focusNothing(page);
      await page.keyboard.press("p");
      await expect(game).toHaveAttribute("data-status", "paused");
      await recordsLink(page).click();
      await expect(game).toHaveAttribute("data-status", "paused");
      await closeButton(page).click();
      await expect(game).toHaveAttribute("data-status", "paused");
      const lines = await logLines(page);
      expect(lines.some((entry) => entry.includes("records"))).toBe(false);
    });

    test("a game paused before the panel is not resumed by closing it", async ({ page }) => {
      const game = await openGame(page);
      await page.keyboard.press("ArrowRight");
      await runTicks(page, 1);
      await recordsLink(page).click(); // pauses
      await page.keyboard.press("Escape"); // resumes
      await expect(game).toHaveAttribute("data-status", "running");
      await focusNothing(page);
      await page.keyboard.press("p");
      await expect(game).toHaveAttribute("data-status", "paused");
      await recordsLink(page).click(); // already paused
      await page.keyboard.press("Escape");
      await expect(game).toHaveAttribute("data-status", "paused");
      expect((await logLines(page)).filter((entry) => entry.endsWith(" records"))).toEqual([
        "pause records",
        "resume records",
      ]);
    });

    test("over: opening and closing change nothing and the status line keeps its words", async ({
      page,
    }) => {
      const game = await openGame(page);
      await playToWall(page);
      await expect(game).toHaveAttribute("data-status", "over");
      const words = "Game over: you hit the wall. Enter or New game to play again";
      await expect(page.locator("#status")).toHaveText(words);
      await recordsLink(page).click();
      await expect(recordsPanel(page)).toBeVisible();
      await expect(page.locator("#status")).toHaveText(words);
      await expect(game).toHaveAttribute("data-status", "over");
      await page.keyboard.press("Escape");
      await expect(game).toHaveAttribute("data-status", "over");
      await expect(page.locator("#status")).toHaveText(words);
      const lines = await logLines(page);
      expect(lines.some((entry) => entry.includes("records"))).toBe(false);
      expect(lines.at(-1)).toMatch(/^end over wall /);
    });

    test("blown: opening and closing change nothing and make no line", async ({ page }) => {
      const game = await openGame(page, LEVEL_5_STAIRS, "/?level=5");
      await playToBlown(page);
      await expect(game).toHaveAttribute("data-status", "blown");
      await recordsLink(page).click();
      await expect(recordsPanel(page)).toBeVisible();
      await expect(game).toHaveAttribute("data-status", "blown");
      await closeButton(page).click();
      await expect(game).toHaveAttribute("data-status", "blown");
      const lines = await logLines(page);
      expect(lines.some((entry) => entry.includes("records"))).toBe(false);
    });
  });

  test.describe("the focus", () => {
    test("goes to Close when the panel opens, and back to the Records link when Close closes it", async ({
      page,
    }) => {
      await openGame(page);
      await recordsLink(page).click();
      await expect(closeButton(page)).toBeFocused();
      await closeButton(page).click();
      await expect(recordsLink(page)).toBeFocused();
    });

    test("goes back to the Records link when Escape closes it, from Close and from the table", async ({
      page,
    }) => {
      await openGame(page);
      await recordsLink(page).click();
      await page.keyboard.press("Escape");
      await expect(recordsLink(page)).toBeFocused();
      await recordsLink(page).click();
      await tableBox(page).focus();
      await page.keyboard.press("Escape");
      await expect(recordsPanel(page)).toBeHidden();
      await expect(recordsLink(page)).toBeFocused();
    });

    test("Escape closes it from anywhere, also with the focus outside the panel", async ({
      page,
    }) => {
      await openGame(page);
      await recordsLink(page).click();
      await page.locator("h1").click();
      await page.keyboard.press("Escape");
      await expect(recordsPanel(page)).toBeHidden();
    });

    test("the New game button closes it, makes a new game and takes the focus", async ({
      page,
    }) => {
      const game = await openGame(page);
      await playToWall(page);
      await expect(game).toHaveAttribute("data-status", "over");
      await recordsLink(page).click();
      await named(page, "New game").click();
      await expect(recordsPanel(page)).toBeHidden();
      await expect(game).toHaveAttribute("data-status", "ready");
      await expect(named(page, "New game")).toBeFocused();
    });

    test("the New game button on a running game makes a new game without going on", async ({
      page,
    }) => {
      const game = await openGame(page);
      await page.keyboard.press("ArrowRight");
      await runTicks(page, 2);
      await recordsLink(page).click();
      await expect(game).toHaveAttribute("data-status", "paused");
      await named(page, "New game").click();
      await expect(recordsPanel(page)).toBeHidden();
      await expect(game).toHaveAttribute("data-status", "ready");
      await expect(named(page, "New game")).toBeFocused();
      await runTicks(page, 5);
      await expect(game).toHaveAttribute("data-status", "ready");
      const lines = await logLines(page);
      expect(lines.some((entry) => entry.includes("records"))).toBe(false);
    });

    test("Tab and Shift+Tab stay inside the panel, between the table and Close", async ({
      page,
    }) => {
      await seed(page, { [RECORDS_KEY]: EXAMPLE });
      await openGame(page);
      await recordsLink(page).click();
      await expect(closeButton(page)).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(tableBox(page)).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(closeButton(page)).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(tableBox(page)).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(closeButton(page)).toBeFocused();
      await expect(recordsPanel(page)).toBeVisible();
    });

    test("with the focus outside the panel, Tab goes to the table and Shift+Tab to Close", async ({
      page,
    }) => {
      await openGame(page);
      await recordsLink(page).click();
      await page.locator("h1").click();
      await page.keyboard.press("Tab");
      await expect(tableBox(page)).toBeFocused();
      await page.locator("h1").click();
      await page.keyboard.press("Shift+Tab");
      await expect(closeButton(page)).toBeFocused();
    });

    test("with the focus on a button outside the panel, Tab goes to the table and Shift+Tab to Close", async ({
      page,
    }) => {
      await openGame(page);
      await recordsLink(page).click();
      await named(page, "Start").focus();
      await page.keyboard.press("Tab");
      await expect(tableBox(page)).toBeFocused();
      await named(page, "Start").focus();
      await page.keyboard.press("Shift+Tab");
      await expect(closeButton(page)).toBeFocused();
    });
  });

  test.describe("what does nothing while it is open", () => {
    test("game keys and swipes turn nothing and make no line", async ({ page }) => {
      const game = await openGame(page);
      await recordsLink(page).click();
      for (const key of [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "w",
        "a",
        "s",
        "d",
        "p",
        "x",
      ]) {
        await page.keyboard.press(key);
      }
      await focusNothing(page);
      await page.keyboard.press("Space");
      await page.keyboard.press("Enter");
      await page.mouse.move(0, 0);
      await expect(game).toHaveAttribute("data-status", "ready");
      await expect(recordsPanel(page)).toBeVisible();
      await page.keyboard.press("Escape");
      expect(await logLines(page)).toHaveLength(1);
    });

    test("a swipe on the board does nothing", async ({ page }) => {
      const game = await openGame(page);
      await recordsLink(page).click();
      const board = page.locator("#board");
      const box = await board.boundingBox();
      if (box === null) throw new Error("no board");
      const common = { pointerId: 7, pointerType: "touch", isPrimary: true };
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      await board.dispatchEvent("pointerdown", { ...common, clientX: x, clientY: y });
      await board.dispatchEvent("pointerup", { ...common, clientX: x + 80, clientY: y });
      await expect(game).toHaveAttribute("data-status", "ready");
    });

    test("the Start, Pause and Resume buttons do nothing", async ({ page }) => {
      const game = await openGame(page);
      await recordsLink(page).click();
      await named(page, "Start").click();
      await named(page, "Pause").click();
      await expect(game).toHaveAttribute("data-status", "ready");
      await page.keyboard.press("Escape");
      await page.keyboard.press("ArrowRight");
      await runTicks(page, 1);
      await recordsLink(page).click(); // pauses
      await expect(game).toHaveAttribute("data-status", "paused");
      await named(page, "Resume").click();
      await expect(game).toHaveAttribute("data-status", "paused");
      await expect(recordsPanel(page)).toBeVisible();
    });

    test("the Log and Scores links do nothing", async ({ page }) => {
      await openGame(page);
      await recordsLink(page).click();
      await named(page, "Log").click();
      await named(page, "Scores").click();
      await expect(page.getByRole("dialog", { name: "Event log" })).toBeHidden();
      await expect(page.getByRole("dialog", { name: "Top 10 scores" })).toBeHidden();
      await expect(recordsPanel(page)).toBeVisible();
    });

    test("the Records link does nothing while the name entry is open", async ({ page }) => {
      await openGame(page, SCORING_GAME);
      await playToWall(page);
      await expect(page.getByRole("dialog", { name: "Enter your name" })).toBeVisible();
      await recordsLink(page).click();
      await expect(recordsPanel(page)).toBeHidden();
      await expect(page.getByRole("dialog", { name: "Enter your name" })).toBeVisible();
      await page.keyboard.press("Escape");
      await recordsLink(page).click();
      await expect(recordsPanel(page)).toBeVisible();
    });

    test("Enter does not make a new game: not with the focus on nothing, not on the table", async ({
      page,
    }) => {
      const game = await openGame(page);
      await playToWall(page);
      await expect(game).toHaveAttribute("data-status", "over");
      await recordsLink(page).click();
      await focusNothing(page);
      await page.keyboard.press("Enter");
      await expect(game).toHaveAttribute("data-status", "over");
      await expect(recordsPanel(page)).toBeVisible();
      await tableBox(page).focus();
      await page.keyboard.press("Enter");
      await expect(game).toHaveAttribute("data-status", "over");
      await expect(recordsPanel(page)).toBeVisible();
      await expect(tableBox(page)).toBeFocused();
    });

    test("Enter on the focused New game button while it is open does nothing", async ({ page }) => {
      const game = await openGame(page);
      await playToWall(page);
      await recordsLink(page).click();
      await named(page, "New game").focus();
      await page.keyboard.press("Enter");
      await expect(game).toHaveAttribute("data-status", "over");
      await expect(recordsPanel(page)).toBeVisible();
    });
  });

  test.describe("keys on Close and on the table", () => {
    test("Enter on Close presses it: the panel closes and Enter makes no new game", async ({
      page,
    }) => {
      const game = await openGame(page);
      await playToWall(page);
      await recordsLink(page).click();
      await expect(closeButton(page)).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(recordsPanel(page)).toBeHidden();
      await expect(game).toHaveAttribute("data-status", "over");
      await expect(recordsLink(page)).toBeFocused();
    });

    test("Space on Close presses it", async ({ page }) => {
      const game = await openGame(page);
      await playToWall(page);
      await recordsLink(page).click();
      await page.keyboard.press("Space");
      await expect(recordsPanel(page)).toBeHidden();
      await expect(game).toHaveAttribute("data-status", "over");
    });

    test("Enter or Space on Close resumes the game its opening paused", async ({ page }) => {
      const game = await openGame(page);
      await page.keyboard.press("ArrowRight");
      await runTicks(page, 1);
      await recordsLink(page).click();
      await expect(game).toHaveAttribute("data-status", "paused");
      await page.keyboard.press("Enter");
      await expect(game).toHaveAttribute("data-status", "running");
    });

    test("with the focus on the table the keys that scroll are left to the browser: it scrolls, the page does not stop them, nothing turns and no line is made", async ({
      page,
    }) => {
      await seed(page, { [RECORDS_KEY]: EIGHTY });
      const game = await openGame(page);
      await recordsLink(page).click();
      await tableBox(page).focus();
      await watchKeys(page);
      const pageScroll = await page.evaluate(() => window.scrollY);
      expect(await scrollTop(page)).toBe(0);

      await page.keyboard.press("ArrowDown");
      await expect.poll(() => scrollTop(page)).toBeGreaterThan(0);
      await page.keyboard.press("Home");
      await expect.poll(() => scrollTop(page)).toBe(0);
      await page.keyboard.press("Space");
      await expect.poll(() => scrollTop(page)).toBeGreaterThan(0);
      await page.keyboard.press("Home");
      await expect.poll(() => scrollTop(page)).toBe(0);
      await page.keyboard.press("PageDown");
      await expect.poll(() => scrollTop(page)).toBeGreaterThan(0);
      await page.keyboard.press("End");
      const maximum = await tableBox(page).evaluate((box) => box.scrollHeight - box.clientHeight);
      await expect.poll(() => scrollTop(page)).toBeGreaterThanOrEqual(maximum - 1);
      await page.keyboard.press("PageUp");
      await expect.poll(() => scrollTop(page)).toBeLessThan(maximum - 1);
      await page.keyboard.press("ArrowUp");
      await page.keyboard.press("Home");
      await expect.poll(() => scrollTop(page)).toBe(0);

      // The page did not stop any of them, and the page itself did not scroll.
      const seen = await keysSeen(page);
      expect(seen.map(([key]) => key)).toEqual([
        "ArrowDown",
        "Home",
        " ",
        "Home",
        "PageDown",
        "End",
        "PageUp",
        "ArrowUp",
        "Home",
      ]);
      expect(seen.filter(([, stopped]) => stopped)).toEqual([]);
      expect(await page.evaluate(() => window.scrollY)).toBe(pageScroll);
      // Nothing turned, nothing started, and no line was made.
      await expect(game).toHaveAttribute("data-status", "ready");
      await expect(tableBox(page)).toBeFocused();
      await page.keyboard.press("Escape");
      expect(await logLines(page)).toHaveLength(1);
    });

    test("the arrow keys and Space with the focus on Close are stopped, so the page does not scroll", async ({
      page,
    }) => {
      await openGame(page);
      await recordsLink(page).click();
      await watchKeys(page);
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowUp");
      const seen = await keysSeen(page);
      expect(seen).toEqual([
        ["ArrowDown", true],
        ["ArrowUp", true],
      ]);
    });

    test("Escape closes the panel with the focus on the table", async ({ page }) => {
      await openGame(page);
      await recordsLink(page).click();
      await tableBox(page).focus();
      await page.keyboard.press("Escape");
      await expect(recordsPanel(page)).toBeHidden();
    });

    test("a key already down when it opens does nothing, and nor do the repeats of Enter", async ({
      page,
    }) => {
      const game = await openGame(page);
      await playToWall(page);
      await recordsLink(page).focus();
      await page.keyboard.down("Enter"); // opens it
      await expect(recordsPanel(page)).toBeVisible();
      await expect(closeButton(page)).toBeFocused();
      await page.keyboard.down("Enter"); // a repeat of the key that is still down
      await page.keyboard.down("Enter");
      await expect(recordsPanel(page)).toBeVisible();
      await page.keyboard.up("Enter");
      await expect(recordsPanel(page)).toBeVisible();
      await expect(game).toHaveAttribute("data-status", "over");
      await page.keyboard.press("Enter"); // a fresh press closes it
      await expect(recordsPanel(page)).toBeHidden();
      await expect(game).toHaveAttribute("data-status", "over");
    });

    test("the repeats of Escape do nothing when it was already down as the panel opened", async ({
      page,
    }) => {
      await openGame(page);
      await page.keyboard.down("Escape");
      await recordsLink(page).click();
      await expect(recordsPanel(page)).toBeVisible();
      await page.keyboard.down("Escape");
      await expect(recordsPanel(page)).toBeVisible();
      await page.keyboard.up("Escape");
      await page.keyboard.press("Escape");
      await expect(recordsPanel(page)).toBeHidden();
    });

    test("Space on the Close button held down presses it once", async ({ page }) => {
      const game = await openGame(page);
      await page.keyboard.press("ArrowRight");
      await runTicks(page, 1);
      await recordsLink(page).click();
      await page.keyboard.down("Space");
      await page.keyboard.down("Space");
      await page.keyboard.up("Space");
      await expect(recordsPanel(page)).toBeHidden();
      await expect(game).toHaveAttribute("data-status", "running");
      await expect(recordsLink(page)).toBeFocused();
    });
  });
});
