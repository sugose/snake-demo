import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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

// The version history (docs/SPEC.md 2.19): the Version history link and its panel, the opening by
// itself after an upgrade, the stored version, and the log lines. The page's random answers are fixed
// by each test (helpers.ts).

const SEEN_KEY = "snake-demo.seen-version";
const LEVEL_5_DELAY = 55;

/** The `version` of package.json, read here from the file, not from the page. */
const VERSION = (
  JSON.parse(readFileSync(resolve(__dirname, "../package.json"), "utf8")) as { version: string }
).version;

/**
 * The test-only way to give the page a list (see `src/main.ts`): an automated browser sets this
 * property of `window` before the page loads. The page uses it only when `navigator.webdriver` is
 * true, and only if it is a list that `src/history.ts` accepts.
 */
const HOOK = "__snakeDemoTestHistory";

interface Entry {
  version: string;
  date: string;
  lines: string[];
}

/** A list with the build's version first, then lower ones, one line of it holding markup. */
const MARKUP = 'Fixed <b>bold</b> & <img src=x onerror="window.pwned=1"> and more';
const LIST: Entry[] = [
  { version: VERSION, date: "2026-11-11", lines: ["The newest line.", MARKUP] },
  { version: "0.0.9", date: "2026-11-05", lines: ["Nine one.", "Nine two."] },
  { version: "0.0.5", date: "2026-10-20", lines: ["Five."] },
  { version: "0.0.1", date: "2026-10-01", lines: ["One."] },
];

/** A long list, so that the text has to scroll inside the panel. */
const LONG: Entry[] = [
  { version: VERSION, date: "2026-11-11", lines: ["The newest line."] },
  ...Array.from({ length: 60 }, (_, index) => ({
    version: `0.0.${99 - index}`,
    date: "2026-10-01",
    lines: [
      `Line one of ${99 - index}.`,
      `Line two of ${99 - index}, a little longer than the first.`,
    ],
  })),
];

const SCORING_GAME = [
  answer(startIndex("10,10", "right"), STARTS),
  answer(211, 399),
  answer(0, 397),
];
const LEVEL_5_STAIRS = [answer(startIndex("0,19", "up"), STARTS), 0, 0, 0, 0, answer(15, 395)];

/** Gives the page a list before it loads (for every page of the test's browser context). */
async function giveList(page: Page, list: unknown): Promise<void> {
  await page.context().addInitScript(
    ([name, value]) => {
      Reflect.set(window, name as string, value);
    },
    [HOOK, list],
  );
}

/** Puts values in the local storage before the page loads, unless they are there already. */
async function seed(page: Page, values: Record<string, string>): Promise<void> {
  await page.context().addInitScript((entries) => {
    for (const [key, value] of Object.entries(entries)) {
      if (window.localStorage.getItem(key) === null) window.localStorage.setItem(key, value);
    }
  }, values);
}

const seen = (page: Page): Promise<string | null> =>
  page.evaluate((key) => window.localStorage.getItem(key), SEEN_KEY);

const named = (page: Page, name: string): Locator =>
  page.getByRole("button", { name, exact: true });
const historyLink = (page: Page): Locator => named(page, "Version history");
const panelOf = (page: Page): Locator => page.locator("#history-panel");
const closeButton = (page: Page): Locator => panelOf(page).getByRole("button", { name: "Close" });
const fullButton = (page: Page): Locator =>
  panelOf(page).getByRole("button", { name: "Show full history" });
const textBox = (page: Page): Locator => page.locator("#history-scroll");
const titleOf = (page: Page): Locator => page.locator("#history-title");

/** The log's lines without their stamps and without the first line (opens the Log panel and closes it). */
async function logLines(page: Page): Promise<string[]> {
  await named(page, "Log").click();
  const text = (await page.locator("#log-text").textContent()) ?? "";
  await page.keyboard.press("Escape");
  return splitPanel(text)
    .lines.slice(1)
    .map((entry) => entry.replace(/^\[t=\d+ #\d+\] /, ""));
}

/** Starts the snake right and runs it into the wall: `over` after 10 ticks, score 0 (the dot is out of the way). */
async function playToWall(page: Page): Promise<void> {
  await page.keyboard.press("ArrowRight");
  await runTicks(page, 10);
}

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

interface Shown {
  heading: string;
  items: string[];
  listUnderHeading: boolean;
}

/** The entries the panel shows, in order: the heading, the items of the list under it. */
async function shown(page: Page): Promise<Shown[]> {
  return panelOf(page)
    .locator(".history-entry")
    .evaluateAll((entries) =>
      entries.map((entry) => ({
        heading: entry.querySelector("h3")?.textContent ?? "",
        items: [...entry.querySelectorAll("h3 + ul > li")].map((item) => item.textContent ?? ""),
        listUnderHeading: entry.querySelector("h3 + ul") !== null,
      })),
    );
}

const headings = async (page: Page): Promise<string[]> =>
  (await shown(page)).map((entry) => entry.heading);

const heading = (entry: Entry): string => `Version ${entry.version} · ${entry.date}`;
const ALL = LIST.map(heading);
const NEW_ONLY = LIST.slice(0, 3).map(heading); // seen 0.0.1: higher than 0.0.1, not higher than the build's

const overflow = (page: Page): Promise<number> =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** The keys that were pressed in the page, with whether the page stopped them (`defaultPrevented`). */
async function watchKeys(page: Page): Promise<void> {
  await page.evaluate(() => {
    const keys: Array<[string, boolean]> = [];
    (window as unknown as { seenKeys: typeof keys }).seenKeys = keys;
    document.addEventListener("keydown", (event) => keys.push([event.key, event.defaultPrevented]));
  });
}
const keysSeen = (page: Page): Promise<Array<[string, boolean]>> =>
  page.evaluate(() => (window as unknown as { seenKeys: Array<[string, boolean]> }).seenKeys);

const scrollTop = (page: Page): Promise<number> => textBox(page).evaluate((box) => box.scrollTop);

/** The text's scroll position once it has stopped moving (the browser scrolls with the keys smoothly). */
async function settled(page: Page): Promise<number> {
  let last = -1;
  for (let tries = 0; tries < 40; tries++) {
    await page.waitForTimeout(150);
    const now = await scrollTop(page);
    if (now === last) return now;
    last = now;
  }
  return last;
}

// ---------------------------------------------------------------------------------------------
// 2.19 (1), (2), (4): the link, the panel from the link and what it shows.

test.describe("the Version history link and what it shows (docs/SPEC.md 2.19 (4))", () => {
  test("the link opens the panel with the title Version history and every entry, newest first", async ({
    page,
  }) => {
    await giveList(page, LIST);
    await openGame(page);
    await expect(panelOf(page)).toBeHidden();
    await historyLink(page).click();
    await expect(panelOf(page)).toBeVisible();
    await expect(titleOf(page)).toHaveText("Version history");
    await expect(page.getByRole("dialog", { name: "Version history" })).toBeVisible();
    expect(await headings(page)).toEqual(ALL);
    await expect(fullButton(page)).toHaveCount(0);
    await expect(closeButton(page)).toBeVisible();
  });

  test("an entry is a heading `Version 0.2.0 · 2026-11-11` with its lines as list items under it, in order", async ({
    page,
  }) => {
    await giveList(page, LIST);
    await openGame(page);
    await historyLink(page).click();
    const entries = await shown(page);
    expect(entries.map((entry) => entry.heading)).toEqual(ALL);
    expect(entries.every((entry) => entry.listUnderHeading)).toBe(true);
    expect(entries.map((entry) => entry.items)).toEqual(LIST.map((entry) => entry.lines));
    // The heading is a real heading, and the middle dot is U+00B7.
    await expect(panelOf(page).getByRole("heading", { name: ALL[1] ?? "" })).toBeVisible();
    expect(entries[1]?.heading.charCodeAt("Version 0.0.9 ".length)).toBe(0xb7);
  });

  test("the built list: every entry has a heading of that form and at least one item, the build's version is the first", async ({
    page,
  }) => {
    await openGame(page);
    await historyLink(page).click();
    const entries = await shown(page);
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(entry.heading).toMatch(/^Version \S+ · \d{4}-\d{2}-\d{2}$/);
      expect(entry.listUnderHeading).toBe(true);
      expect(entry.items.length).toBeGreaterThanOrEqual(1);
      for (const item of entry.items) expect(item.trim()).not.toBe("");
    }
    expect(entries[0]?.heading.startsWith(`Version ${VERSION} · `)).toBe(true);
    await expect(titleOf(page)).toHaveText("Version history");
  });

  test("a line with `<` in it is shown as text, not as HTML", async ({ page }) => {
    await giveList(page, LIST);
    await openGame(page);
    await historyLink(page).click();
    const entries = await shown(page);
    expect(entries[0]?.items).toEqual(["The newest line.", MARKUP]);
    await expect(panelOf(page).getByText(MARKUP, { exact: true })).toBeVisible();
    // No element was made from the markup, and nothing in it ran.
    await expect(panelOf(page).locator("b, img")).toHaveCount(0);
    expect(await page.evaluate(() => Reflect.get(window, "pwned"))).toBeUndefined();
  });

  test("the panel is not on the page during play, and the link is there in every state", async ({
    page,
  }) => {
    await giveList(page, LIST);
    const game = await openGame(page);
    await expect(historyLink(page)).toBeVisible();
    await expect(panelOf(page)).toBeHidden();
    await expect(page.getByText("Nine one.")).toBeHidden();
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 3);
    await expect(game).toHaveAttribute("data-status", "running");
    await expect(panelOf(page)).toBeHidden();
    await expect(historyLink(page)).toBeVisible();
  });

  test("the link is below the board, next to the Log, Scores and Records links", async ({
    page,
  }) => {
    await openGame(page);
    const board = await page.locator("#board").boundingBox();
    const boxes = await Promise.all(
      ["Scores", "Records", "Log", "Version history"].map((name) =>
        named(page, name).boundingBox(),
      ),
    );
    expect(board).toBeTruthy();
    if (board === null) return;
    for (const box of boxes) {
      expect(box).toBeTruthy();
      if (box === null) return;
      expect(box.y).toBeGreaterThanOrEqual(board.y + board.height - 1);
    }
  });

  test("at 375 px the four links are all on the page and it does not scroll sideways", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await openGame(page);
    for (const name of ["Scores", "Records", "Log", "Version history"]) {
      const box = await named(page, name).boundingBox();
      expect(box, name).toBeTruthy();
      if (box === null) return;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(375);
    }
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });

  test("when the four links do not fit the width they wrap onto another line, with no sideways scrolling", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await openGame(page);
    const tops = new Set<number>();
    for (const name of ["Scores", "Records", "Log", "Version history"]) {
      const box = await named(page, name).boundingBox();
      expect(box, name).toBeTruthy();
      if (box === null) return;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(320);
      tops.add(Math.round(box.y));
    }
    expect(tops.size).toBeGreaterThanOrEqual(2);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    await historyLink(page).click();
    await expect(panelOf(page)).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });

  test("at 375 px the panel stays over the board and the page does not scroll sideways, with a long line", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    const list = [
      { version: VERSION, date: "2026-11-11", lines: [`${"word ".repeat(60)}${"x".repeat(80)}`] },
    ];
    await giveList(page, list);
    await openGame(page);
    await historyLink(page).click();
    const panel = await panelOf(page).boundingBox();
    const frame = await page.locator(".board-frame").boundingBox();
    expect(panel && frame).toBeTruthy();
    if (panel !== null && frame !== null) {
      expect(panel.width).toBeLessThanOrEqual(frame.width + 1);
      expect(panel.height).toBeLessThanOrEqual(frame.height + 1);
    }
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });

  test("the text scrolls inside the panel when it does not fit, and the panel stays over the board", async ({
    page,
  }) => {
    await giveList(page, LONG);
    await openGame(page);
    await historyLink(page).click();
    await expect(panelOf(page).locator(".history-entry")).toHaveCount(LONG.length);
    const sizes = await textBox(page).evaluate((box) => ({
      scroll: box.scrollHeight,
      client: box.clientHeight,
    }));
    expect(sizes.scroll).toBeGreaterThan(sizes.client);
    const panel = await panelOf(page).boundingBox();
    const frame = await page.locator(".board-frame").boundingBox();
    expect(panel && frame).toBeTruthy();
    if (panel !== null && frame !== null) {
      expect(panel.height).toBeLessThanOrEqual(frame.height + 1);
      expect(panel.width).toBeLessThanOrEqual(frame.width + 1);
    }
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });

  test("the text is a Tab stop", async ({ page }) => {
    await giveList(page, LIST);
    await openGame(page);
    await historyLink(page).click();
    await expect(textBox(page)).toHaveAttribute("tabindex", "0");
    await expect(textBox(page).locator(".history-entry")).toHaveCount(LIST.length);
    await textBox(page).focus();
    await expect(textBox(page)).toBeFocused();
  });

  test("its look is the plain one of the log panel and not the arcade look", async ({ page }) => {
    await giveList(page, LIST);
    await openGame(page);
    await historyLink(page).click();
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
      return { history: read("history-panel"), log: read("log-panel") };
    });
    expect(look.history.arcade).toBe(false);
    expect(look.history.drawn).toBe(0);
    expect(look.history.animation).toBe("none");
    expect(look.history.image).toBe("none");
    expect(look.history.after).toBe(look.log.after);
    expect(look.history.background).toBe(look.log.background);
    expect(look.history.border).toBe(look.log.border);
    expect(look.history.radius).toBe(look.log.radius);
    await expect(panelOf(page).getByText("Nine one.")).toBeVisible();
  });

  test("the test-only list is not used when it is not a list the page accepts", async ({
    page,
  }) => {
    await giveList(page, [{ version: "v1", date: "2026-02-30", lines: [""] }]);
    await openGame(page);
    await historyLink(page).click();
    const entries = await shown(page);
    expect(entries[0]?.heading.startsWith(`Version ${VERSION} · `)).toBe(true);
    expect(entries.map((entry) => entry.heading)).not.toContain("Version v1 · 2026-02-30");
  });
});

// ---------------------------------------------------------------------------------------------
// 2.19 (3), (4): the opening by itself.

test.describe("the opening by itself after an upgrade (docs/SPEC.md 2.19 (3), (4))", () => {
  test("with the key at 0.0.1 the panel opens by itself with the title What's new, the newer entries and the button", async ({
    page,
  }) => {
    await giveList(page, LIST);
    await seed(page, { [SEEN_KEY]: "0.0.1" });
    const game = await openGame(page);
    await expect(panelOf(page)).toBeVisible();
    await expect(titleOf(page)).toHaveText("What's new");
    expect((await titleOf(page).textContent())?.charCodeAt(4)).toBe(0x27);
    await expect(page.getByRole("dialog", { name: "What's new" })).toBeVisible();
    expect(await headings(page)).toEqual(NEW_ONLY);
    await expect(fullButton(page)).toBeVisible();
    await expect(closeButton(page)).toBeVisible();
    await expect(game).toHaveAttribute("data-status", "ready");
  });

  test("with the built list the entry of the build's version opens, with the button", async ({
    page,
  }) => {
    await seed(page, { [SEEN_KEY]: "0.0.1" });
    await openGame(page);
    await expect(panelOf(page)).toBeVisible();
    await expect(titleOf(page)).toHaveText("What's new");
    const entries = await shown(page);
    expect(entries[0]?.heading.startsWith(`Version ${VERSION} · `)).toBe(true);
    expect(entries.every((entry) => entry.listUnderHeading && entry.items.length > 0)).toBe(true);
    await expect(fullButton(page)).toBeVisible();
  });

  test("after the page has loaded the key holds the build's version", async ({ page }) => {
    await giveList(page, LIST);
    await seed(page, { [SEEN_KEY]: "0.0.1" });
    await openGame(page);
    await expect(panelOf(page)).toBeVisible();
    expect(await seen(page)).toBe(VERSION);
  });

  test("the entries are those higher than the key's version and not higher than the build's", async ({
    page,
  }) => {
    await giveList(page, LIST);
    await seed(page, { [SEEN_KEY]: "0.0.5" });
    await openGame(page);
    expect(await headings(page)).toEqual(LIST.slice(0, 2).map(heading));
  });

  test("a prerelease key below the build's version opens, build metadata on the key counts for nothing", async ({
    page,
  }) => {
    await giveList(page, LIST);
    await seed(page, { [SEEN_KEY]: "0.0.5-rc.1+abc" });
    await openGame(page);
    expect(await headings(page)).toEqual(LIST.slice(0, 3).map(heading));
  });

  test("opens by itself at most once: a second load in the same browser opens nothing", async ({
    page,
  }) => {
    await giveList(page, LIST);
    await seed(page, { [SEEN_KEY]: "0.0.1" });
    await openGame(page);
    await expect(panelOf(page)).toBeVisible();
    await closeButton(page).click();
    const second = await page.context().newPage();
    await openGame(second);
    await expect(panelOf(second)).toBeHidden();
    expect(await seen(second)).toBe(VERSION);
  });

  test("the button Show full history changes the title to Version history, shows every entry, is gone afterwards and the focus is on Close", async ({
    page,
  }) => {
    await giveList(page, LIST);
    await seed(page, { [SEEN_KEY]: "0.0.1" });
    await openGame(page);
    await expect(closeButton(page)).toBeFocused();
    await fullButton(page).click();
    await expect(titleOf(page)).toHaveText("Version history");
    await expect(page.getByRole("dialog", { name: "Version history" })).toBeVisible();
    expect(await headings(page)).toEqual(ALL);
    await expect(fullButton(page)).toHaveCount(0);
    await expect(closeButton(page)).toBeFocused();
    await expect(panelOf(page)).toBeVisible();
  });

  test("Enter on the focused Show full history presses it", async ({ page }) => {
    await giveList(page, LIST);
    await seed(page, { [SEEN_KEY]: "0.0.1" });
    await openGame(page);
    await fullButton(page).focus();
    await page.keyboard.press("Enter");
    await expect(titleOf(page)).toHaveText("Version history");
    expect(await headings(page)).toEqual(ALL);
    await expect(fullButton(page)).toHaveCount(0);
    await expect(closeButton(page)).toBeFocused();
    await expect(panelOf(page)).toBeVisible();
  });

  test("Space on the focused Show full history presses it", async ({ page }) => {
    await giveList(page, LIST);
    await seed(page, { [SEEN_KEY]: "0.0.1" });
    const game = await openGame(page);
    await fullButton(page).focus();
    await page.keyboard.press("Space");
    await expect(titleOf(page)).toHaveText("Version history");
    expect(await headings(page)).toEqual(ALL);
    await expect(closeButton(page)).toBeFocused();
    await expect(game).toHaveAttribute("data-status", "ready");
  });

  test("a held Enter on Show full history presses it once, and Close is not pressed by its repeats", async ({
    page,
  }) => {
    await giveList(page, LIST);
    await seed(page, { [SEEN_KEY]: "0.0.1" });
    await openGame(page);
    await fullButton(page).focus();
    await page.keyboard.down("Enter");
    await page.keyboard.down("Enter");
    await page.keyboard.down("Enter");
    await expect(titleOf(page)).toHaveText("Version history");
    await expect(closeButton(page)).toBeFocused();
    await expect(panelOf(page)).toBeVisible();
    await page.keyboard.up("Enter");
    await expect(panelOf(page)).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(panelOf(page)).toBeHidden();
  });

  test("it pauses nothing, writes no log line and puts the focus on Close", async ({ page }) => {
    await giveList(page, LIST);
    await seed(page, { [SEEN_KEY]: "0.0.1" });
    const game = await openGame(page);
    await expect(panelOf(page)).toBeVisible();
    await expect(closeButton(page)).toBeFocused();
    await expect(game).toHaveAttribute("data-status", "ready");
    await closeButton(page).click();
    await expect(game).toHaveAttribute("data-status", "ready");
    const lines = await logLines(page);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^level 1 normal /);
  });

  test("the Show full history press writes no log line", async ({ page }) => {
    await giveList(page, LIST);
    await seed(page, { [SEEN_KEY]: "0.0.1" });
    await openGame(page);
    await fullButton(page).click();
    await closeButton(page).click();
    expect(await logLines(page)).toHaveLength(1);
  });

  test("Close and Escape close it by itself opened, putting the focus on the link, and the game is as it was", async ({
    page,
  }) => {
    await giveList(page, LIST);
    await seed(page, { [SEEN_KEY]: "0.0.1" });
    const game = await openGame(page);
    await closeButton(page).click();
    await expect(panelOf(page)).toBeHidden();
    await expect(historyLink(page)).toBeFocused();
    await historyLink(page).click();
    await expect(titleOf(page)).toHaveText("Version history");
    await page.keyboard.press("Escape");
    await expect(historyLink(page)).toBeFocused();
    await expect(game).toHaveAttribute("data-status", "ready");
  });

  test("Escape closes the panel that opened by itself", async ({ page }) => {
    await giveList(page, LIST);
    await seed(page, { [SEEN_KEY]: "0.0.1" });
    await openGame(page);
    await expect(panelOf(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panelOf(page)).toBeHidden();
    await expect(historyLink(page)).toBeFocused();
  });

  test("the New game button closes it and takes the focus, as it closes the other panels", async ({
    page,
  }) => {
    await giveList(page, LIST);
    await seed(page, { [SEEN_KEY]: "0.0.1" });
    const game = await openGame(page);
    await expect(panelOf(page)).toBeVisible();
    await named(page, "New game").click();
    await expect(panelOf(page)).toBeHidden();
    await expect(game).toHaveAttribute("data-status", "ready");
    await expect(named(page, "New game")).toBeFocused();
  });

  test("opened by itself the panel blocks game keys, Start and the links like any history panel", async ({
    page,
  }) => {
    await giveList(page, LIST);
    await seed(page, { [SEEN_KEY]: "0.0.1" });
    const game = await openGame(page);
    await page.keyboard.press("ArrowRight");
    await named(page, "Start").click();
    await named(page, "Log").click();
    await named(page, "Scores").click();
    await named(page, "Records").click();
    await expect(game).toHaveAttribute("data-status", "ready");
    await expect(panelOf(page)).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Event log" })).toBeHidden();
    expect((await logLinesAfterClose(page)).length).toBe(1);
  });

  test("Tab and Shift+Tab inside the panel that opened by itself: the text, Show full history and Close", async ({
    page,
  }) => {
    await giveList(page, LIST);
    await seed(page, { [SEEN_KEY]: "0.0.1" });
    await openGame(page);
    await expect(closeButton(page)).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(textBox(page)).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(fullButton(page)).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(closeButton(page)).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(fullButton(page)).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(textBox(page)).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(closeButton(page)).toBeFocused();
    await expect(panelOf(page)).toBeVisible();
  });

  test("with the focus outside that panel, Tab goes to the text and Shift+Tab to Close", async ({
    page,
  }) => {
    await giveList(page, LIST);
    await seed(page, { [SEEN_KEY]: "0.0.1" });
    await openGame(page);
    await page.locator("h1").click();
    await page.keyboard.press("Tab");
    await expect(textBox(page)).toBeFocused();
    await page.locator("h1").click();
    await page.keyboard.press("Shift+Tab");
    await expect(closeButton(page)).toBeFocused();
  });

  test("on a playtest page the same rules hold", async ({ page }) => {
    await giveList(page, LIST);
    await seed(page, { [SEEN_KEY]: "0.0.1" });
    await openGame(page, undefined, "/?slow");
    await expect(panelOf(page)).toBeVisible();
    await expect(titleOf(page)).toHaveText("What's new");
    expect(await headings(page)).toEqual(NEW_ONLY);
    expect(await seen(page)).toBe(VERSION);
  });

  test("on a playtest page with a start level the same rules hold", async ({ page }) => {
    await giveList(page, LIST);
    await seed(page, { [SEEN_KEY]: "0.0.1" });
    const game = await openGame(page, LEVEL_5_STAIRS, "/?level=5");
    await expect(panelOf(page)).toBeVisible();
    await expect(game).toHaveAttribute("data-status", "ready");
    await closeButton(page).click();
    expect(await seen(page)).toBe(VERSION);
  });
});

/** Closes the history panel with Escape and reads the log's lines (the log link needs the panels closed). */
async function logLinesAfterClose(page: Page): Promise<string[]> {
  await page.keyboard.press("Escape");
  return logLines(page);
}

// ---------------------------------------------------------------------------------------------
// 2.19 (3): what the key holds and what opens in each case.

test.describe("nothing opens by itself (docs/SPEC.md 2.19 (3))", () => {
  test("with the key missing nothing opens and the key holds the build's version", async ({
    page,
  }) => {
    await giveList(page, LIST);
    await openGame(page);
    await expect(panelOf(page)).toBeHidden();
    expect(await seen(page)).toBe(VERSION);
  });

  test("with the key equal to the build's version nothing opens and the key holds it", async ({
    page,
  }) => {
    await giveList(page, LIST);
    await seed(page, { [SEEN_KEY]: VERSION });
    await openGame(page);
    await expect(panelOf(page)).toBeHidden();
    expect(await seen(page)).toBe(VERSION);
  });

  test("with the key equal to the build's version plus build metadata nothing opens and the key holds the build's version", async ({
    page,
  }) => {
    await giveList(page, LIST);
    await seed(page, { [SEEN_KEY]: `${VERSION}+abc` });
    await openGame(page);
    await expect(panelOf(page)).toBeHidden();
    expect(await seen(page)).toBe(VERSION);
  });

  test("with the key higher than the build's version nothing opens and the key holds the build's version", async ({
    page,
  }) => {
    await giveList(page, LIST);
    await seed(page, { [SEEN_KEY]: "99.0.0" });
    await openGame(page);
    await expect(panelOf(page)).toBeHidden();
    expect(await seen(page)).toBe(VERSION);
  });

  for (const value of ["v0.0.1", " 0.0.1", "0.0.1-01", "banana", "", "0.0.1\n"]) {
    test(`with the key ${JSON.stringify(value)}, not a SemVer 2.0.0 version, nothing opens and the key holds the build's version`, async ({
      page,
    }) => {
      await giveList(page, LIST);
      await seed(page, { [SEEN_KEY]: value });
      await openGame(page);
      await expect(panelOf(page)).toBeHidden();
      expect(await seen(page)).toBe(VERSION);
    });
  }

  test("a first visit opens nothing, but the link is always there and shows every entry", async ({
    page,
  }) => {
    await giveList(page, LIST);
    await openGame(page);
    await expect(panelOf(page)).toBeHidden();
    await historyLink(page).click();
    expect(await headings(page)).toEqual(ALL);
  });
});

// ---------------------------------------------------------------------------------------------
// 2.19 (3): a failing storage.

test.describe("a store that fails (docs/SPEC.md 2.19 (3), 2.9 (4))", () => {
  test("a store that throws on reading: nothing opens, the link works and the game goes on", async ({
    page,
  }) => {
    await giveList(page, LIST);
    await page.context().addInitScript(() => {
      Storage.prototype.getItem = () => {
        throw new Error("read refused");
      };
    });
    const game = await openGame(page);
    await expect(panelOf(page)).toBeHidden();
    await historyLink(page).click();
    expect(await headings(page)).toEqual(ALL);
    await page.keyboard.press("Escape");
    await focusNothing(page);
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 1);
    await expect(game).toHaveAttribute("data-status", "running");
  });

  test("a store that throws on reading the key still has the build's version written", async ({
    page,
  }) => {
    await giveList(page, LIST);
    await page.context().addInitScript((key) => {
      const raw = Storage.prototype.getItem;
      Storage.prototype.getItem = function (name: string) {
        if (name === key) throw new Error("read refused");
        return raw.call(this, name);
      };
    }, SEEN_KEY);
    await openGame(page);
    await expect(panelOf(page)).toBeHidden();
    // Reads the property, which does not go through the refused getItem.
    expect(await page.evaluate((key) => Reflect.get(window.localStorage, key), SEEN_KEY)).toBe(
      VERSION,
    );
  });

  test("a store that cannot even be got hold of: nothing opens, the link works, the game goes on", async ({
    page,
  }) => {
    await giveList(page, LIST);
    await page.context().addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new DOMException("denied", "SecurityError");
        },
      });
    });
    const game = await openGame(page);
    await expect(panelOf(page)).toBeHidden();
    await historyLink(page).click();
    expect(await headings(page)).toEqual(ALL);
    await page.keyboard.press("Escape");
    await focusNothing(page);
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 1);
    await expect(game).toHaveAttribute("data-status", "running");
  });

  test("a store that throws on writing: the history still opens, and may open again at the next load", async ({
    page,
  }) => {
    await giveList(page, LIST);
    await seed(page, { [SEEN_KEY]: "0.0.1" });
    await page.context().addInitScript(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException("quota", "QuotaExceededError");
      };
    });
    const game = await openGame(page);
    await expect(panelOf(page)).toBeVisible();
    await expect(titleOf(page)).toHaveText("What's new");
    await expect(game).toHaveAttribute("data-status", "ready");
    expect(await seen(page)).toBe("0.0.1");
    await closeButton(page).click();
    const second = await page.context().newPage();
    await openGame(second);
    await expect(panelOf(second)).toBeVisible();
    expect(await seen(second)).toBe("0.0.1");
  });
});

// ---------------------------------------------------------------------------------------------
// 2.19 (4): opening and closing from the link, in each state.

test.describe("opening and closing from the link in each state (docs/SPEC.md 2.19 (4))", () => {
  test("ready: opening and closing change nothing and make no line", async ({ page }) => {
    await giveList(page, LIST);
    const game = await openGame(page);
    await historyLink(page).click();
    await expect(panelOf(page)).toBeVisible();
    await expect(game).toHaveAttribute("data-status", "ready");
    await closeButton(page).click();
    await expect(panelOf(page)).toBeHidden();
    await expect(game).toHaveAttribute("data-status", "ready");
    const lines = await logLines(page);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^level 1 normal /);
  });

  test("running: opening pauses the game, Close goes on, and the log says pause history and resume history", async ({
    page,
  }) => {
    await giveList(page, LIST);
    const game = await openGame(page);
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 2);
    await expect(game).toHaveAttribute("data-head", "12,10");
    await historyLink(page).click();
    await expect(game).toHaveAttribute("data-status", "paused");
    await runTicks(page, 5);
    await expect(game).toHaveAttribute("data-head", "12,10");
    await expect(game).toHaveAttribute("data-time", "250");
    await closeButton(page).click();
    await expect(game).toHaveAttribute("data-status", "running");
    await runTicks(page, 1);
    await expect(game).toHaveAttribute("data-head", "13,10");
    const lines = await logLines(page);
    const pause = lines.indexOf("pause history");
    expect(pause).toBeGreaterThan(0);
    expect(lines[pause - 1]).toBe("move right 2 head=(12,10)");
    expect(lines[pause + 1]).toBe("resume history");
  });

  test("running: Escape closes it and goes on too", async ({ page }) => {
    await giveList(page, LIST);
    const game = await openGame(page);
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 1);
    await historyLink(page).click();
    await expect(game).toHaveAttribute("data-status", "paused");
    await page.keyboard.press("Escape");
    await expect(panelOf(page)).toBeHidden();
    await expect(game).toHaveAttribute("data-status", "running");
    expect(await logLines(page)).toContain("resume history");
  });

  test("paused: opening and closing leave the game paused and make no line", async ({ page }) => {
    await giveList(page, LIST);
    const game = await openGame(page);
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 1);
    await focusNothing(page);
    await page.keyboard.press("p");
    await expect(game).toHaveAttribute("data-status", "paused");
    await historyLink(page).click();
    await expect(game).toHaveAttribute("data-status", "paused");
    await closeButton(page).click();
    await expect(game).toHaveAttribute("data-status", "paused");
    const lines = await logLines(page);
    expect(lines.some((entry) => entry.includes("history"))).toBe(false);
  });

  test("a game paused before the panel is not resumed by closing it", async ({ page }) => {
    await giveList(page, LIST);
    const game = await openGame(page);
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 1);
    await historyLink(page).click(); // pauses
    await page.keyboard.press("Escape"); // resumes
    await expect(game).toHaveAttribute("data-status", "running");
    await focusNothing(page);
    await page.keyboard.press("p");
    await expect(game).toHaveAttribute("data-status", "paused");
    await historyLink(page).click(); // already paused
    await page.keyboard.press("Escape");
    await expect(game).toHaveAttribute("data-status", "paused");
    expect((await logLines(page)).filter((entry) => entry.endsWith(" history"))).toEqual([
      "pause history",
      "resume history",
    ]);
  });

  test("over: opening and closing change nothing and the status line keeps its words", async ({
    page,
  }) => {
    await giveList(page, LIST);
    const game = await openGame(page);
    await playToWall(page);
    await expect(game).toHaveAttribute("data-status", "over");
    const words = "Game over: you hit the wall. Enter or New game to play again";
    await expect(page.locator("#status")).toHaveText(words);
    await historyLink(page).click();
    await expect(panelOf(page)).toBeVisible();
    await expect(page.locator("#status")).toHaveText(words);
    await expect(game).toHaveAttribute("data-status", "over");
    await page.keyboard.press("Escape");
    await expect(game).toHaveAttribute("data-status", "over");
    await expect(page.locator("#status")).toHaveText(words);
    const lines = await logLines(page);
    expect(lines.some((entry) => entry.includes("history"))).toBe(false);
    expect(lines.at(-1)).toMatch(/^end over wall /);
  });

  test("blown: opening and closing change nothing and make no line", async ({ page }) => {
    await giveList(page, LIST);
    const game = await openGame(page, LEVEL_5_STAIRS, "/?level=5");
    await playToBlown(page);
    await expect(game).toHaveAttribute("data-status", "blown");
    await historyLink(page).click();
    await expect(panelOf(page)).toBeVisible();
    await expect(game).toHaveAttribute("data-status", "blown");
    await closeButton(page).click();
    await expect(game).toHaveAttribute("data-status", "blown");
    const lines = await logLines(page);
    expect(lines.some((entry) => entry.includes("history"))).toBe(false);
  });

  test("no input while the panel is open writes a line: only pause history and resume history", async ({
    page,
  }) => {
    await giveList(page, LIST);
    const game = await openGame(page);
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 1);
    await historyLink(page).click();
    for (const key of ["ArrowUp", "ArrowLeft", "w", "a", "s", "d", "p", "x"]) {
      await page.keyboard.press(key);
    }
    await named(page, "Start").click();
    await named(page, "Resume").click();
    await named(page, "Log").click();
    await expect(game).toHaveAttribute("data-status", "paused");
    await page.keyboard.press("Escape");
    const lines = await logLines(page);
    // Nothing between the pause and the resume: no key, button or link line.
    const at = lines.indexOf("pause history");
    expect(at).toBeGreaterThan(0);
    expect(lines.slice(at, at + 2)).toEqual(["pause history", "resume history"]);
    expect(lines.filter((entry) => /^(key|button)/.test(entry))).toEqual([
      "key ArrowRight right used",
    ]);
  });
});

// ---------------------------------------------------------------------------------------------
// 2.19 (4): the focus.

test.describe("the focus (docs/SPEC.md 2.19 (4))", () => {
  test("goes to Close when the panel opens, and back to the Version history link when Close closes it", async ({
    page,
  }) => {
    await giveList(page, LIST);
    await openGame(page);
    await historyLink(page).click();
    await expect(closeButton(page)).toBeFocused();
    await closeButton(page).click();
    await expect(historyLink(page)).toBeFocused();
  });

  test("goes back to the link when Escape closes it, from Close and from the text", async ({
    page,
  }) => {
    await giveList(page, LIST);
    await openGame(page);
    await historyLink(page).click();
    await page.keyboard.press("Escape");
    await expect(historyLink(page)).toBeFocused();
    await historyLink(page).click();
    await textBox(page).focus();
    await page.keyboard.press("Escape");
    await expect(panelOf(page)).toBeHidden();
    await expect(historyLink(page)).toBeFocused();
  });

  test("Escape closes it from anywhere, also with the focus outside the panel", async ({
    page,
  }) => {
    await giveList(page, LIST);
    await openGame(page);
    await historyLink(page).click();
    await page.locator("h1").click();
    await page.keyboard.press("Escape");
    await expect(panelOf(page)).toBeHidden();
  });

  test("the New game button closes it, makes a new game and takes the focus", async ({ page }) => {
    await giveList(page, LIST);
    const game = await openGame(page);
    await playToWall(page);
    await expect(game).toHaveAttribute("data-status", "over");
    await historyLink(page).click();
    await named(page, "New game").click();
    await expect(panelOf(page)).toBeHidden();
    await expect(game).toHaveAttribute("data-status", "ready");
    await expect(named(page, "New game")).toBeFocused();
  });

  test("the New game button on a running game makes a new game without going on", async ({
    page,
  }) => {
    await giveList(page, LIST);
    const game = await openGame(page);
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 2);
    await historyLink(page).click();
    await expect(game).toHaveAttribute("data-status", "paused");
    await named(page, "New game").click();
    await expect(panelOf(page)).toBeHidden();
    await expect(game).toHaveAttribute("data-status", "ready");
    await expect(named(page, "New game")).toBeFocused();
    await runTicks(page, 5);
    await expect(game).toHaveAttribute("data-status", "ready");
    const lines = await logLines(page);
    expect(lines.some((entry) => entry.includes("history"))).toBe(false);
  });

  test("Tab and Shift+Tab stay inside the panel opened from the link: the text and Close", async ({
    page,
  }) => {
    await giveList(page, LIST);
    await openGame(page);
    await historyLink(page).click();
    await expect(closeButton(page)).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(textBox(page)).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(closeButton(page)).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(textBox(page)).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(closeButton(page)).toBeFocused();
    await expect(panelOf(page)).toBeVisible();
  });

  test("after Show full history the Tab order is the text and Close", async ({ page }) => {
    await giveList(page, LIST);
    await seed(page, { [SEEN_KEY]: "0.0.1" });
    await openGame(page);
    await fullButton(page).click();
    await expect(closeButton(page)).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(textBox(page)).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(closeButton(page)).toBeFocused();
  });

  test("with the focus outside the panel, Tab goes to the text and Shift+Tab to Close", async ({
    page,
  }) => {
    await giveList(page, LIST);
    await openGame(page);
    await historyLink(page).click();
    await page.locator("h1").click();
    await page.keyboard.press("Tab");
    await expect(textBox(page)).toBeFocused();
    await page.locator("h1").click();
    await page.keyboard.press("Shift+Tab");
    await expect(closeButton(page)).toBeFocused();
  });

  test("with the focus on a button outside the panel, Tab goes to the text and Shift+Tab to Close", async ({
    page,
  }) => {
    await giveList(page, LIST);
    await openGame(page);
    await historyLink(page).click();
    await named(page, "Start").focus();
    await page.keyboard.press("Tab");
    await expect(textBox(page)).toBeFocused();
    await named(page, "Start").focus();
    await page.keyboard.press("Shift+Tab");
    await expect(closeButton(page)).toBeFocused();
  });
});

// ---------------------------------------------------------------------------------------------
// 2.19 (4): what does nothing while it is open, and the interplay with the other panels.

test.describe("what does nothing while it is open (docs/SPEC.md 2.19 (4))", () => {
  test("game keys and swipes turn nothing and make no line", async ({ page }) => {
    await giveList(page, LIST);
    const game = await openGame(page);
    await historyLink(page).click();
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
    await expect(game).toHaveAttribute("data-status", "ready");
    await expect(panelOf(page)).toBeVisible();
    await page.keyboard.press("Escape");
    expect(await logLines(page)).toHaveLength(1);
  });

  test("a swipe on the board does nothing", async ({ page }) => {
    await giveList(page, LIST);
    const game = await openGame(page);
    await historyLink(page).click();
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
    await giveList(page, LIST);
    const game = await openGame(page);
    await historyLink(page).click();
    await named(page, "Start").click();
    await named(page, "Pause").click();
    await expect(game).toHaveAttribute("data-status", "ready");
    await page.keyboard.press("Escape");
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 1);
    await historyLink(page).click(); // pauses
    await expect(game).toHaveAttribute("data-status", "paused");
    await named(page, "Resume").click();
    await expect(game).toHaveAttribute("data-status", "paused");
    await expect(panelOf(page)).toBeVisible();
  });

  test("the Log, Scores and Records links do nothing", async ({ page }) => {
    await giveList(page, LIST);
    await openGame(page);
    await historyLink(page).click();
    await named(page, "Log").click();
    await named(page, "Scores").click();
    await named(page, "Records").click();
    await expect(page.getByRole("dialog", { name: "Event log" })).toBeHidden();
    await expect(page.getByRole("dialog", { name: "Top 10 scores" })).toBeHidden();
    await expect(page.getByRole("dialog", { name: "Level records" })).toBeHidden();
    await expect(panelOf(page)).toBeVisible();
  });

  test("with the log, scores or records panel open the Version history link does nothing", async ({
    page,
  }) => {
    await giveList(page, LIST);
    await openGame(page);
    for (const [link, dialog] of [
      ["Log", "Event log"],
      ["Scores", "Top 10 scores"],
      ["Records", "Level records"],
    ] as const) {
      await named(page, link).click();
      const other = page.getByRole("dialog", { name: dialog });
      await expect(other).toBeVisible();
      await historyLink(page).click();
      await expect(panelOf(page)).toBeHidden();
      await expect(other).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(other).toBeHidden();
    }
    await historyLink(page).click();
    await expect(panelOf(page)).toBeVisible();
  });

  test("with the log panel open on a running game the Version history link makes no pause line", async ({
    page,
  }) => {
    await giveList(page, LIST);
    const game = await openGame(page);
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 1);
    await named(page, "Log").click();
    await expect(game).toHaveAttribute("data-status", "paused");
    await historyLink(page).click();
    await expect(panelOf(page)).toBeHidden();
    await page.keyboard.press("Escape");
    const lines = await logLines(page);
    expect(lines.filter((entry) => entry.includes("history"))).toEqual([]);
  });

  test("the Version history link does nothing while the name entry is open", async ({ page }) => {
    await giveList(page, LIST);
    await openGame(page, SCORING_GAME);
    await playToWall(page);
    await expect(page.getByRole("dialog", { name: "Enter your name" })).toBeVisible();
    await historyLink(page).click();
    await expect(panelOf(page)).toBeHidden();
    await expect(page.getByRole("dialog", { name: "Enter your name" })).toBeVisible();
    await page.keyboard.press("Escape");
    await historyLink(page).click();
    await expect(panelOf(page)).toBeVisible();
  });

  test("Enter does not make a new game: not with the focus on nothing, not on the text", async ({
    page,
  }) => {
    await giveList(page, LIST);
    const game = await openGame(page);
    await playToWall(page);
    await expect(game).toHaveAttribute("data-status", "over");
    await historyLink(page).click();
    await focusNothing(page);
    await page.keyboard.press("Enter");
    await expect(game).toHaveAttribute("data-status", "over");
    await expect(panelOf(page)).toBeVisible();
    await textBox(page).focus();
    await page.keyboard.press("Enter");
    await expect(game).toHaveAttribute("data-status", "over");
    await expect(panelOf(page)).toBeVisible();
    await expect(textBox(page)).toBeFocused();
  });

  test("Enter on the focused New game button while it is open does nothing", async ({ page }) => {
    await giveList(page, LIST);
    const game = await openGame(page);
    await playToWall(page);
    await historyLink(page).click();
    await named(page, "New game").focus();
    await page.keyboard.press("Enter");
    await expect(game).toHaveAttribute("data-status", "over");
    await expect(panelOf(page)).toBeVisible();
  });

  test("the Slow button does nothing while it is open", async ({ page }) => {
    await giveList(page, LIST);
    const game = await openGame(page, LEVEL_5_STAIRS, "/?level=5&slow");
    await expect(game).toHaveAttribute("data-factor", "1");
    await historyLink(page).click();
    await page.getByRole("button", { name: "Slow down" }).click({ force: true });
    await expect(game).toHaveAttribute("data-factor", "1");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Slow down" }).click();
    await expect(game).toHaveAttribute("data-factor", "2");
  });
});

// ---------------------------------------------------------------------------------------------
// 2.19 (4): keys on Close and on the text.

test.describe("keys on Close and on the text (docs/SPEC.md 2.19 (4))", () => {
  test("Enter on Close presses it: the panel closes and Enter makes no new game", async ({
    page,
  }) => {
    await giveList(page, LIST);
    const game = await openGame(page);
    await playToWall(page);
    await historyLink(page).click();
    await expect(closeButton(page)).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(panelOf(page)).toBeHidden();
    await expect(game).toHaveAttribute("data-status", "over");
    await expect(historyLink(page)).toBeFocused();
  });

  test("Space on Close presses it", async ({ page }) => {
    await giveList(page, LIST);
    const game = await openGame(page);
    await playToWall(page);
    await historyLink(page).click();
    await page.keyboard.press("Space");
    await expect(panelOf(page)).toBeHidden();
    await expect(game).toHaveAttribute("data-status", "over");
  });

  test("Enter or Space on Close resumes the game its opening paused", async ({ page }) => {
    await giveList(page, LIST);
    const game = await openGame(page);
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 1);
    await historyLink(page).click();
    await expect(game).toHaveAttribute("data-status", "paused");
    await page.keyboard.press("Enter");
    await expect(game).toHaveAttribute("data-status", "running");
  });

  test("with the focus on the text the keys that scroll are left to the browser: it scrolls, the page does not stop them, nothing turns and no line is made", async ({
    page,
  }) => {
    await giveList(page, LONG);
    const game = await openGame(page);
    await historyLink(page).click();
    await textBox(page).focus();
    await watchKeys(page);
    const pageScroll = await page.evaluate(() => window.scrollY);
    expect(await scrollTop(page)).toBe(0);

    const maximum = await textBox(page).evaluate((box) => box.scrollHeight - box.clientHeight);
    expect(maximum).toBeGreaterThan(0);
    await page.keyboard.press("ArrowDown");
    expect(await settled(page)).toBeGreaterThan(0);
    await page.keyboard.press("Home");
    expect(await settled(page)).toBe(0);
    await page.keyboard.press("Space");
    expect(await settled(page)).toBeGreaterThan(0);
    await page.keyboard.press("Home");
    expect(await settled(page)).toBe(0);
    await page.keyboard.press("PageDown");
    expect(await settled(page)).toBeGreaterThan(0);
    await page.keyboard.press("End");
    expect(await settled(page)).toBeGreaterThanOrEqual(maximum - 1);
    await page.keyboard.press("PageUp");
    expect(await settled(page)).toBeLessThan(maximum - 1);
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("Home");
    expect(await settled(page)).toBe(0);

    const keys = await keysSeen(page);
    expect(keys.map(([key]) => key)).toEqual([
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
    expect(keys.filter(([, stopped]) => stopped)).toEqual([]);
    expect(await page.evaluate(() => window.scrollY)).toBe(pageScroll);
    await expect(game).toHaveAttribute("data-status", "ready");
    await expect(textBox(page)).toBeFocused();
    await page.keyboard.press("Escape");
    expect(await logLines(page)).toHaveLength(1);
  });

  test("the arrow keys with the focus on Close are stopped, so the page does not scroll", async ({
    page,
  }) => {
    await giveList(page, LIST);
    await openGame(page);
    await historyLink(page).click();
    await watchKeys(page);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowUp");
    expect(await keysSeen(page)).toEqual([
      ["ArrowDown", true],
      ["ArrowUp", true],
    ]);
  });

  test("Escape closes the panel with the focus on the text", async ({ page }) => {
    await giveList(page, LIST);
    await openGame(page);
    await historyLink(page).click();
    await textBox(page).focus();
    await page.keyboard.press("Escape");
    await expect(panelOf(page)).toBeHidden();
  });

  test("a key already down when it opens does nothing, and nor do the repeats of Enter", async ({
    page,
  }) => {
    await giveList(page, LIST);
    const game = await openGame(page);
    await playToWall(page);
    await historyLink(page).focus();
    await page.keyboard.down("Enter"); // opens it
    await expect(panelOf(page)).toBeVisible();
    await expect(closeButton(page)).toBeFocused();
    await page.keyboard.down("Enter"); // a repeat of the key that is still down
    await page.keyboard.down("Enter");
    await expect(panelOf(page)).toBeVisible();
    await page.keyboard.up("Enter");
    await expect(panelOf(page)).toBeVisible();
    await expect(game).toHaveAttribute("data-status", "over");
    await page.keyboard.press("Enter"); // a fresh press closes it
    await expect(panelOf(page)).toBeHidden();
    await expect(game).toHaveAttribute("data-status", "over");
  });

  test("the repeats of Escape do nothing when it was already down as the panel opened", async ({
    page,
  }) => {
    await giveList(page, LIST);
    await openGame(page);
    await page.keyboard.down("Escape");
    await historyLink(page).click();
    await expect(panelOf(page)).toBeVisible();
    await page.keyboard.down("Escape");
    await expect(panelOf(page)).toBeVisible();
    await page.keyboard.up("Escape");
    await page.keyboard.press("Escape");
    await expect(panelOf(page)).toBeHidden();
  });

  test("Space on the Close button held down presses it once", async ({ page }) => {
    await giveList(page, LIST);
    const game = await openGame(page);
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 1);
    await historyLink(page).click();
    await page.keyboard.down("Space");
    await page.keyboard.down("Space");
    await page.keyboard.up("Space");
    await expect(panelOf(page)).toBeHidden();
    await expect(game).toHaveAttribute("data-status", "running");
    await expect(historyLink(page)).toBeFocused();
  });
});
