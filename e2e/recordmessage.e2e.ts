import type { Locator, Page } from "@playwright/test";
import {
  answer,
  expect,
  focusNothing,
  freeIndex,
  openGame,
  runTicks,
  STARTS,
  splitPanel,
  startIndex,
  test,
} from "./helpers";

// The record message (docs/SPEC.md 2.18 (9)) and "First clear!" (2.18 (10)): the words before the ready
// line of the next level when a cleared level set a record that replaced one, or had none before. The
// page's random answers are fixed by each test (helpers.ts).

const RECORDS_KEY = "snake-demo.records";
const PLAY = "Arrow keys, W A S D, a swipe or Start to play";
const LEVEL_2 = `Level 2. ${PLAY}`;
const FEWEST = "New record: fewest turns.";
const FASTEST = "New record: fastest.";
const BOTH = "New records: fewest turns and fastest.";
const FIRST = "First clear!";
const NO_RECORDS_LINE = "Fewest turns: – · Fastest: –";

/** Level 1 (and 2, ...): from (10,10) heading right, its 5 dots straight ahead (see records.e2e.ts). */
function straightLevel(level: number): number[] {
  return [
    answer(startIndex("10,10", "right"), STARTS),
    ...Array.from({ length: level - 1 }, () => 0),
    ...[0, 1, 2, 3, 4].map((k) => answer(211 - level, 400 - level - k)),
  ];
}

/** Level 1 cleared by 5 moves right of 125 ms: 0 turns, 625 ms. */
const LEVEL_1 = straightLevel(1);
const LEVELS_1_TO_3 = [1, 2, 3].flatMap(straightLevel);

/** Level 1 whose 5th dot is at (14,9): cleared by 4 moves right and one up, 1 turn, 625 ms. */
const LEVEL_1_DETOUR = [
  ...LEVEL_1.slice(0, 5),
  answer(freeIndex("14,9", ["10,10", "11,10", "12,10", "13,10", "14,10"]), 395),
];

/** What level 2 asks of the chooser first: its start, its obstacle and its first dot. */
const LEVEL_2_LAID_OUT = straightLevel(2).slice(0, 3);

/** A level 1 played, level 2 laid out, and a new game that plays level 1 again, the same way. */
const TWICE = [...LEVEL_1, ...LEVEL_2_LAID_OUT, ...LEVEL_1];
/** The same with the first play of level 1 a turn longer than the second. */
const TWICE_DETOUR_FIRST = [...LEVEL_1_DETOUR, ...LEVEL_2_LAID_OUT, ...LEVEL_1];

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

const status = (page: Page): Locator => page.locator("#status");
const line = (page: Page): Locator => page.locator("#records-line");
const named = (page: Page, name: string): Locator =>
  page.getByRole("button", { name, exact: true });

/** The log's lines without their stamps and without the first line (opens the Log panel and closes it). */
async function logLines(page: Page): Promise<string[]> {
  await named(page, "Log").click();
  const text = (await page.locator("#log-text").textContent()) ?? "";
  await page.keyboard.press("Escape");
  return splitPanel(text)
    .lines.slice(1)
    .map((entry) => entry.replace(/^\[t=\d+ #\d+\] /, ""));
}

/** Plays level 1 straight to its end (5 moves right) and waits for level 2 to be laid out. */
async function clearLevel1(page: Page, game: Locator): Promise<void> {
  await page.keyboard.press("ArrowRight");
  await runTicks(page, 5);
  await expect(game).toHaveAttribute("data-level", "2");
  await expect(game).toHaveAttribute("data-status", "ready");
}

/** Plays the level 1 of LEVEL_1_DETOUR to its end: 4 moves right, a turn up, and the 5th dot. */
async function clearLevel1WithTurn(page: Page, game: Locator): Promise<void> {
  await page.keyboard.press("ArrowRight");
  await runTicks(page, 4);
  await page.keyboard.press("ArrowUp");
  await runTicks(page, 1);
  await expect(game).toHaveAttribute("data-level", "2");
  await expect(game).toHaveAttribute("data-status", "ready");
}

/**
 * Plays levels 1 to 67 laid out straight, each cleared in 5 moves: with the snake of 338 segments the
 * 67 obstacles and the dot of level 68 do not fit on 400 cells, so clearing level 67 ends the game as
 * won.
 */
async function playToWon(page: Page): Promise<Locator> {
  const levels = Array.from({ length: 67 }, (_, index) => index + 1);
  const game = await openGame(page, levels.flatMap(straightLevel));
  for (const level of levels) {
    await expect(game).toHaveAttribute("data-level", String(level));
    await page.keyboard.press("ArrowRight");
    const delay = Number(await game.getAttribute("data-delay"));
    for (let step = 0; step < 12; step++) {
      await page.clock.runFor(Math.ceil(delay));
      const now = await game.getAttribute("data-status");
      const at = await game.getAttribute("data-level");
      if (now === "won" || at !== String(level)) break;
    }
  }
  await expect(game).toHaveAttribute("data-status", "won");
  await expect(game).toHaveAttribute("data-level", "67");
  return game;
}

test.describe("the record message after a clear that set a record (docs/SPEC.md 2.18 (9))", () => {
  // Level 1 is cleared with 0 turns in 625 ms; each stored record below is one clear against it.
  const cases: Array<[string, string, string]> = [
    ["beats the stored fewest turns only", "1:3:2000:500:9", FEWEST],
    ["beats the stored fastest time only", "1:0:500:2000:9", FASTEST],
    ["beats both stored records", "1:3:2000:2000:9", BOTH],
    ["has equal turns and a shorter time than the fewest turns", "1:0:700:500:0", FEWEST],
    ["has an equal time and fewer turns than the fastest time", "1:0:500:625:9", FASTEST],
    ["equals the fewest-turns record and beats the fastest time", "1:0:625:2000:9", FASTEST],
    ["equals the fastest-time record and beats the fewest turns", "1:3:625:625:0", FEWEST],
  ];
  for (const [what, records, message] of cases) {
    test(`a level cleared that ${what} says "${message}" before the ready line of the next level`, async ({
      page,
    }) => {
      await seed(page, { [RECORDS_KEY]: records });
      const game = await openGame(page, LEVELS_1_TO_3);
      await clearLevel1(page, game);
      await expect(status(page)).toHaveText(`${message} ${LEVEL_2}`);
    });
  }

  test("the message is in the status line, which has the role status, and the line of the records and the table do not change", async ({
    page,
  }) => {
    await seed(page, { [RECORDS_KEY]: "1:3:2000:2000:9" });
    const game = await openGame(page, LEVELS_1_TO_3);
    await clearLevel1(page, game);
    await expect(page.getByRole("status").filter({ hasText: BOTH })).toHaveCount(1);
    // The line is level 2's own, with no records, and the table reads what is stored.
    await expect(line(page)).toHaveText(NO_RECORDS_LINE);
    await named(page, "Records").click();
    const cells = page.getByRole("dialog", { name: "Level records" }).locator("tbody td");
    await expect(cells).toHaveText(["1", "0 turns (0s)", "0s (0 turns)"]);
    expect(await stored(page)).toBe("1:0:625:625:0");
  });

  test("the message stays while the game is in ready: a turn that is ignored leaves it in place", async ({
    page,
  }) => {
    await seed(page, { [RECORDS_KEY]: "1:3:2000:2000:9" });
    const game = await openGame(page, LEVELS_1_TO_3);
    await clearLevel1(page, game);
    // Level 2 starts heading right, so Left is straight back and is ignored.
    await page.keyboard.press("ArrowLeft");
    await expect(game).toHaveAttribute("data-status", "ready");
    await expect(status(page)).toHaveText(`${BOTH} ${LEVEL_2}`);
  });

  test("the message goes with the first turn that starts the level, and does not come back", async ({
    page,
  }) => {
    await seed(page, { [RECORDS_KEY]: "1:3:2000:2000:9" });
    const game = await openGame(page, LEVELS_1_TO_3);
    await clearLevel1(page, game);
    await expect(status(page)).toContainText(BOTH);
    await page.keyboard.press("ArrowRight");
    await expect(game).toHaveAttribute("data-status", "running");
    await expect(status(page)).toHaveText("Space or P to pause");
    await page.keyboard.press("p");
    await expect(status(page)).toHaveText("Paused. Space, P or Resume to go on");
    await page.keyboard.press("p");
    await expect(status(page)).not.toContainText("New record");
  });

  test("the message goes with the Start button too", async ({ page }) => {
    await seed(page, { [RECORDS_KEY]: "1:3:2000:2000:9" });
    const game = await openGame(page, LEVELS_1_TO_3);
    await clearLevel1(page, game);
    await expect(status(page)).toContainText(BOTH);
    await named(page, "Start").click();
    await expect(game).toHaveAttribute("data-status", "running");
    await expect(status(page)).toHaveText("Space or P to pause");
  });

  test("the message adds no line to the event log", async ({ page }) => {
    await seed(page, { [RECORDS_KEY]: "1:3:2000:2000:9" });
    const game = await openGame(page, LEVELS_1_TO_3);
    await clearLevel1(page, game);
    await expect(status(page)).toContainText(BOTH);
    const lines = await logLines(page);
    const at = lines.findIndex((entry) => entry.startsWith("cleared level 1 "));
    expect(at).toBeGreaterThan(0);
    // The cleared line, the two record lines and the next level's line are all there is after it.
    expect(lines.slice(at)).toEqual([
      "cleared level 1 turns=0 time=625 score=5",
      "record fewest level=1 turns=0 time=625",
      "record fastest level=1 time=625 turns=0",
      expect.stringMatching(/^level 2 normal /),
    ]);
    expect(lines.some((entry) => /new record/i.test(entry))).toBe(false);
  });

  test("when the next level is special the message comes before Level 5, special", async ({
    page,
  }) => {
    await seed(page, { [RECORDS_KEY]: "4:3:2000:2000:9" });
    const game = await openGame(page, [1, 2, 3, 4, 5].flatMap(straightLevel));
    for (const [index, delay] of [125, 120, 115, 110].entries()) {
      await expect(game).toHaveAttribute("data-level", String(index + 1));
      await page.keyboard.press("ArrowRight");
      await runTicks(page, 5, delay);
    }
    await expect(game).toHaveAttribute("data-level", "5");
    await expect(status(page)).toHaveText(
      `${BOTH} Level 5, special: 20 turns, 30 seconds, shield of 3. ${PLAY}`,
    );
  });
});

test.describe("when the record message is not shown (docs/SPEC.md 2.18 (9))", () => {
  test("a clear that sets none shows none", async ({ page }) => {
    await seed(page, { [RECORDS_KEY]: "1:0:500:500:0" });
    const game = await openGame(page, LEVELS_1_TO_3);
    await clearLevel1(page, game);
    expect(await stored(page)).toBe("1:0:500:500:0");
    await expect(status(page)).toHaveText(LEVEL_2);
  });

  test("a clear that equals both records shows none", async ({ page }) => {
    await seed(page, { [RECORDS_KEY]: "1:0:625:625:0" });
    const game = await openGame(page, LEVELS_1_TO_3);
    await clearLevel1(page, game);
    await expect(status(page)).toHaveText(LEVEL_2);
  });

  test("a playtest page shows no record message, whatever the stored records", async ({ page }) => {
    await seed(page, { [RECORDS_KEY]: "1:3:2000:2000:9" });
    const game = await openGame(page, LEVELS_1_TO_3, "/?level=1");
    await clearLevel1(page, game);
    expect(await stored(page)).toBe("1:3:2000:2000:9");
    await expect(status(page)).toHaveText(LEVEL_2);
  });

  test("the other kind of playtest page shows none either", async ({ page }) => {
    await seed(page, { [RECORDS_KEY]: "1:3:2000:2000:9" });
    const game = await openGame(page, LEVELS_1_TO_3, "/?slow");
    await clearLevel1(page, game);
    await expect(status(page)).toHaveText(LEVEL_2);
  });

  test("a New game by the Enter key shows none", async ({ page }) => {
    await seed(page, { [RECORDS_KEY]: "1:3:2000:2000:9" });
    const game = await openGame(page, [...LEVELS_1_TO_3, ...LEVEL_1]);
    await clearLevel1(page, game);
    await expect(status(page)).toContainText(BOTH);
    await focusNothing(page);
    await page.keyboard.press("Enter");
    await expect(game).toHaveAttribute("data-level", "1");
    await expect(status(page)).toHaveText(`Level 1. ${PLAY}`);
  });

  test("a New game by the button shows none", async ({ page }) => {
    await seed(page, { [RECORDS_KEY]: "1:3:2000:2000:9" });
    const game = await openGame(page, LEVELS_1_TO_3);
    await clearLevel1(page, game);
    await expect(status(page)).toContainText(BOTH);
    await named(page, "New game").click();
    await expect(game).toHaveAttribute("data-level", "1");
    await expect(status(page)).toHaveText(`Level 1. ${PLAY}`);
  });

  test("a page load shows none, with records stored for level 1", async ({ page }) => {
    await seed(page, { [RECORDS_KEY]: "1:3:2000:2000:9" });
    await openGame(page, LEVELS_1_TO_3);
    await expect(status(page)).toHaveText(`Level 1. ${PLAY}`);
  });

  test("a page load after a clear that showed the message shows none", async ({ page }) => {
    await seed(page, { [RECORDS_KEY]: "1:3:2000:2000:9" });
    const game = await openGame(page, LEVELS_1_TO_3);
    await clearLevel1(page, game);
    await expect(status(page)).toContainText(BOTH);
    await page.reload();
    await expect(game).toHaveAttribute("data-status", "ready");
    await expect(status(page)).toHaveText(`Level 1. ${PLAY}`);
  });

  test("a clear that ends the game as won shows no record message: its status line is that of a won game", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    // Level 67 has records that the clear beats.
    await seed(page, { [RECORDS_KEY]: "67:5:2000:2000:5" });
    const game = await playToWon(page);
    // The clear did set records for level 67, which had them before.
    expect(await stored(page)).toContain(",67:0:250:250:0");
    await expect(status(page)).toContainText("You won! There is no room for the next level.");
    await expect(status(page)).not.toContainText("New record");
    await expect(game).toHaveAttribute("data-status", "won");
  });
});

test.describe("the record message and a store that fails (docs/SPEC.md 2.18 (9))", () => {
  test("with stored records and a write that fails the message is shown", async ({ page }) => {
    await seed(page, { [RECORDS_KEY]: "1:3:2000:2000:9" });
    await page.addInitScript(
      ([key]) => {
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function setItem(name: string, value: string) {
          if (name === key) throw new Error("quota");
          original.call(this, name, value);
        };
      },
      [RECORDS_KEY],
    );
    const game = await openGame(page, LEVELS_1_TO_3);
    await clearLevel1(page, game);
    expect(await stored(page)).toBe("1:3:2000:2000:9");
    await expect(status(page)).toHaveText(`${BOTH} ${LEVEL_2}`);
  });

  test("with a store that fails on reading only, every clear of the level says First clear!", async ({
    page,
  }) => {
    await page.addInitScript(
      ([key]) => {
        const original = Storage.prototype.getItem;
        (window as unknown as { rawGet: typeof original }).rawGet = original;
        Storage.prototype.getItem = function getItem(name: string) {
          if (name === key) throw new Error("read refused");
          return original.call(this, name);
        };
      },
      [RECORDS_KEY],
    );
    /** What is stored, read past the failing read. */
    const stored = (): Promise<string | null> =>
      page.evaluate((key) => {
        const raw = (window as unknown as { rawGet: Storage["getItem"] }).rawGet;
        return raw.call(window.localStorage, key);
      }, RECORDS_KEY);
    // The first play takes a turn more than the second, so a second clear that compared with the
    // first would beat it.
    const game = await openGame(page, TWICE_DETOUR_FIRST);
    await clearLevel1WithTurn(page, game);
    await expect(status(page)).toHaveText(`${FIRST} ${LEVEL_2}`);
    expect(await stored()).toBe("1:1:625:625:1");
    await focusNothing(page);
    await page.keyboard.press("Enter");
    await expect(game).toHaveAttribute("data-level", "1");
    await clearLevel1(page, game);
    await expect(status(page)).toHaveText(`${FIRST} ${LEVEL_2}`);
    expect(await stored()).toBe("1:0:625:625:0");
  });

  test("with a store that fails on reading and on writing the first clear says First clear!, and a second clear of the level can show a record message", async ({
    page,
  }) => {
    await page.addInitScript(
      ([key]) => {
        const read = Storage.prototype.getItem;
        const write = Storage.prototype.setItem;
        Storage.prototype.getItem = function getItem(name: string) {
          if (name === key) throw new Error("read refused");
          return read.call(this, name);
        };
        Storage.prototype.setItem = function setItem(name: string, value: string) {
          if (name === key) throw new Error("quota");
          write.call(this, name, value);
        };
      },
      [RECORDS_KEY],
    );
    const game = await openGame(page, TWICE_DETOUR_FIRST);
    await clearLevel1WithTurn(page, game);
    // The first clear: no records read, so the level counts as having none.
    await expect(status(page)).toHaveText(`${FIRST} ${LEVEL_2}`);
    await focusNothing(page);
    await page.keyboard.press("Enter");
    await expect(game).toHaveAttribute("data-level", "1");
    await clearLevel1(page, game);
    // The second clear compares with the records kept in memory (1 turn, 625 ms): 0 turns and an
    // equal time set both.
    await expect(status(page)).toHaveText(`${BOTH} ${LEVEL_2}`);
  });

  test("with a store that cannot even be got hold of the first clear says First clear!, and a second can show a record message", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new DOMException("denied", "SecurityError");
        },
      });
    });
    const game = await openGame(page, TWICE_DETOUR_FIRST);
    await clearLevel1WithTurn(page, game);
    await expect(status(page)).toHaveText(`${FIRST} ${LEVEL_2}`);
    await focusNothing(page);
    await page.keyboard.press("Enter");
    await expect(game).toHaveAttribute("data-level", "1");
    await clearLevel1(page, game);
    await expect(status(page)).toHaveText(`${BOTH} ${LEVEL_2}`);
  });

  test("with a store that fails on writing only and no stored records the first clear says First clear! and a second clear that equals it does not", async ({
    page,
  }) => {
    await page.addInitScript(
      ([key]) => {
        const write = Storage.prototype.setItem;
        Storage.prototype.setItem = function setItem(name: string, value: string) {
          if (name === key) throw new Error("quota");
          write.call(this, name, value);
        };
      },
      [RECORDS_KEY],
    );
    const game = await openGame(page, TWICE);
    await clearLevel1(page, game);
    await expect(status(page)).toHaveText(`${FIRST} ${LEVEL_2}`);
    await focusNothing(page);
    await page.keyboard.press("Enter");
    await expect(game).toHaveAttribute("data-level", "1");
    await clearLevel1(page, game);
    // The records are kept in memory, so the second clear compares with them: it equals both.
    await expect(status(page)).toHaveText(LEVEL_2);
    await expect(status(page)).not.toContainText(FIRST);
  });
});

test.describe(`"${FIRST}" on the first clear of a level (docs/SPEC.md 2.18 (10))`, () => {
  test("the first clear of a level says First clear! before the ready line of the next level, and sets both records", async ({
    page,
  }) => {
    const game = await openGame(page, LEVELS_1_TO_3);
    await clearLevel1(page, game);
    expect(await stored(page)).toBe("1:0:625:625:0");
    await expect(status(page)).toHaveText(`${FIRST} ${LEVEL_2}`);
  });

  test("the first clear of a level says First clear! when only other levels have records", async ({
    page,
  }) => {
    await seed(page, { [RECORDS_KEY]: "5:15:18040:15180:16" });
    const game = await openGame(page, LEVELS_1_TO_3);
    await clearLevel1(page, game);
    await expect(status(page)).toHaveText(`${FIRST} ${LEVEL_2}`);
  });

  test("the text is in the status line, which has the role status, and the line of the records and the table do not change", async ({
    page,
  }) => {
    const game = await openGame(page, LEVELS_1_TO_3);
    await clearLevel1(page, game);
    await expect(page.getByRole("status").filter({ hasText: FIRST })).toHaveCount(1);
    await expect(line(page)).toHaveText(NO_RECORDS_LINE);
    await named(page, "Records").click();
    const cells = page.getByRole("dialog", { name: "Level records" }).locator("tbody td");
    await expect(cells).toHaveText(["1", "0 turns (0s)", "0s (0 turns)"]);
  });

  test("the second clear of the same level on a store that works says no First clear!", async ({
    page,
  }) => {
    const game = await openGame(page, TWICE);
    await clearLevel1(page, game);
    await expect(status(page)).toHaveText(`${FIRST} ${LEVEL_2}`);
    await focusNothing(page);
    await page.keyboard.press("Enter");
    await expect(game).toHaveAttribute("data-level", "1");
    await clearLevel1(page, game);
    // It equals both records, so it sets none and has no message.
    await expect(status(page)).toHaveText(LEVEL_2);
  });

  test("the second clear of the same level that beats the first says the record message and not First clear!", async ({
    page,
  }) => {
    const game = await openGame(page, TWICE_DETOUR_FIRST);
    await clearLevel1WithTurn(page, game);
    await expect(status(page)).toHaveText(`${FIRST} ${LEVEL_2}`);
    await focusNothing(page);
    await page.keyboard.press("Enter");
    await expect(game).toHaveAttribute("data-level", "1");
    await clearLevel1(page, game);
    await expect(status(page)).toHaveText(`${BOTH} ${LEVEL_2}`);
  });

  test("the text stays while the game is in ready: a turn that is ignored leaves it in place", async ({
    page,
  }) => {
    const game = await openGame(page, LEVELS_1_TO_3);
    await clearLevel1(page, game);
    // Level 2 starts heading right, so Left is straight back and is ignored.
    await page.keyboard.press("ArrowLeft");
    await expect(game).toHaveAttribute("data-status", "ready");
    await expect(status(page)).toHaveText(`${FIRST} ${LEVEL_2}`);
  });

  test("the text goes with the first turn that starts the level, and does not come back", async ({
    page,
  }) => {
    const game = await openGame(page, LEVELS_1_TO_3);
    await clearLevel1(page, game);
    await expect(status(page)).toContainText(FIRST);
    await page.keyboard.press("ArrowRight");
    await expect(game).toHaveAttribute("data-status", "running");
    await expect(status(page)).toHaveText("Space or P to pause");
    await page.keyboard.press("p");
    await expect(status(page)).toHaveText("Paused. Space, P or Resume to go on");
    await page.keyboard.press("p");
    await expect(status(page)).not.toContainText(FIRST);
  });

  test("the text goes with the Start button too", async ({ page }) => {
    const game = await openGame(page, LEVELS_1_TO_3);
    await clearLevel1(page, game);
    await expect(status(page)).toContainText(FIRST);
    await named(page, "Start").click();
    await expect(game).toHaveAttribute("data-status", "running");
    await expect(status(page)).toHaveText("Space or P to pause");
  });

  test("the text adds no line to the event log", async ({ page }) => {
    const game = await openGame(page, LEVELS_1_TO_3);
    await clearLevel1(page, game);
    await expect(status(page)).toContainText(FIRST);
    const lines = await logLines(page);
    const at = lines.findIndex((entry) => entry.startsWith("cleared level 1 "));
    expect(at).toBeGreaterThan(0);
    expect(lines.slice(at)).toEqual([
      "cleared level 1 turns=0 time=625 score=5",
      "record fewest level=1 turns=0 time=625",
      "record fastest level=1 time=625 turns=0",
      expect.stringMatching(/^level 2 normal /),
    ]);
    expect(lines.some((entry) => /first clear/i.test(entry))).toBe(false);
  });

  test("when the next level is special the text comes before Level 5, special", async ({
    page,
  }) => {
    const game = await openGame(page, [1, 2, 3, 4, 5].flatMap(straightLevel));
    for (const [index, delay] of [125, 120, 115, 110].entries()) {
      await expect(game).toHaveAttribute("data-level", String(index + 1));
      await page.keyboard.press("ArrowRight");
      await runTicks(page, 5, delay);
    }
    await expect(game).toHaveAttribute("data-level", "5");
    await expect(status(page)).toHaveText(
      `${FIRST} Level 5, special: 20 turns, 30 seconds, shield of 3. ${PLAY}`,
    );
  });

  test("a playtest page says no First clear!, though no level has records", async ({ page }) => {
    const game = await openGame(page, LEVELS_1_TO_3, "/?level=1");
    await clearLevel1(page, game);
    expect(await stored(page)).toBeNull();
    await expect(status(page)).toHaveText(LEVEL_2);
  });

  test("the other kind of playtest page says no First clear! either", async ({ page }) => {
    const game = await openGame(page, LEVELS_1_TO_3, "/?slow");
    await clearLevel1(page, game);
    expect(await stored(page)).toBeNull();
    await expect(status(page)).toHaveText(LEVEL_2);
  });

  test("a clear that ends the game as won says no First clear!, though level 67 had no records", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const game = await playToWon(page);
    expect(await stored(page)).toContain(",67:0:250:250:0");
    await expect(status(page)).toContainText("You won! There is no room for the next level.");
    await expect(status(page)).not.toContainText(FIRST);
    await expect(game).toHaveAttribute("data-status", "won");
  });

  test("a New game by the Enter key says no First clear!", async ({ page }) => {
    const game = await openGame(page, [...LEVELS_1_TO_3, ...LEVEL_1]);
    await clearLevel1(page, game);
    await expect(status(page)).toContainText(FIRST);
    await focusNothing(page);
    await page.keyboard.press("Enter");
    await expect(game).toHaveAttribute("data-level", "1");
    await expect(status(page)).toHaveText(`Level 1. ${PLAY}`);
  });

  test("a New game by the button says no First clear!", async ({ page }) => {
    const game = await openGame(page, LEVELS_1_TO_3);
    await clearLevel1(page, game);
    await expect(status(page)).toContainText(FIRST);
    await named(page, "New game").click();
    await expect(game).toHaveAttribute("data-level", "1");
    await expect(status(page)).toHaveText(`Level 1. ${PLAY}`);
  });

  test("a page load after a first clear says no First clear!", async ({ page }) => {
    const game = await openGame(page, LEVELS_1_TO_3);
    await clearLevel1(page, game);
    await expect(status(page)).toContainText(FIRST);
    await page.reload();
    await expect(game).toHaveAttribute("data-status", "ready");
    await expect(status(page)).toHaveText(`Level 1. ${PLAY}`);
  });
});
