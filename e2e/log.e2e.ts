import type { Page } from "@playwright/test";
import { expect, expectGame, openGame, runTicks, splitPanel, swipe, test } from "./helpers";

// The event log in the browser (docs/SPEC.md 2.13).

/** The log's lines without their stamps, and the tick count of each. */
async function logLines(page: Page): Promise<{ first: string; events: string[]; ticks: number[] }> {
  const text = (await page.locator("#log-text").textContent()) ?? "";
  const [first = "", ...rest] = splitPanel(text).lines;
  const events: string[] = [];
  const ticks: number[] = [];
  for (const line of rest) {
    const match = /^\[t=\d+ #(\d+)\] (.*)$/.exec(line);
    if (match === null) throw new Error(`a line without a stamp: ${line}`);
    ticks.push(Number(match[1]));
    events.push(match[2] ?? "");
  }
  return { first, events, ticks };
}

test("the Log link is usable in every state; the panel shows the whole game", async ({ page }) => {
  const game = await openGame(page);
  const link = page.getByRole("button", { name: "Log", exact: true });
  const panel = page.locator("#log-panel");
  await expect(link).toBeVisible();
  await expect(link).toBeEnabled();
  await expect(panel).toBeHidden();

  // ready: opens, and opening and closing change nothing.
  await link.click();
  await expect(panel).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(game).toHaveAttribute("data-status", "ready");

  await page.keyboard.press("ArrowRight");
  await runTicks(page, 3);
  await expect(game).toHaveAttribute("data-status", "running");
  await expect(link).toBeEnabled();
  await page.keyboard.press("Space");
  await expect(game).toHaveAttribute("data-status", "paused");
  await expect(link).toBeEnabled();

  // paused: opens, and opening and closing change nothing.
  await link.click();
  await expect(panel).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(game).toHaveAttribute("data-status", "paused");

  await page.keyboard.press("Space");
  await runTicks(page, 7);
  await expectGame(game, "over", "19,10");

  await expect(link).toBeEnabled();
  await link.click();
  await expect(panel).toBeVisible();
  const { first, events, ticks } = await logLines(page);
  expect(first).toMatch(
    /^snake-demo build=\S+ size=20 start-length=3 clear-ahead=8 dots=5 delays=125\/5\/50 special-every=5 shield=3 turns=20 seconds=30 jump=3 clear-head=2$/,
  );
  expect(events).toEqual([
    "level 1 normal delay=125 start=(10,10) right obstacles=- dot=(0,0)",
    "key ArrowRight right used",
    "turn right start",
    "key Space pause used",
    "move right 3 head=(13,10)",
    "pause",
    "key Space pause used",
    "resume",
    "move right 6 head=(19,10)",
    "end over wall score=0 best=no",
  ]);
  expect(ticks.at(-1)).toBe(10);
});

test("Copy puts the log on the clipboard; Escape and Close close the panel", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const game = await openGame(page);
  await page.keyboard.press("ArrowRight");
  await runTicks(page, 10);
  await expectGame(game, "over", "19,10");
  const link = page.getByRole("button", { name: "Log", exact: true });
  const panel = page.locator("#log-panel");

  await link.click();
  await page.getByRole("button", { name: "Copy", exact: true }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe(await page.locator("#log-text").textContent());
  expect(splitPanel(copied).lines.at(-1)).toMatch(/end over wall score=0 best=no$/);

  // Game keys and buttons do nothing while it is open, and make no line.
  const text = await page.locator("#log-text").textContent();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("p");
  await page.locator("#start").click({ force: true });
  await page.locator("#pause").click({ force: true });
  await expect(panel).toBeVisible();
  await expect(game).toHaveAttribute("data-status", "over");
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await link.click();
  await expect(page.locator("#log-text")).toHaveText(text ?? "");
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();

  await link.click();
  await expect(panel).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(panel).toBeHidden();
});

test("a new game while the panel is open closes it and starts a new log", async ({ page }) => {
  const game = await openGame(page);
  await page.keyboard.press("ArrowRight");
  await runTicks(page, 10);
  await expectGame(game, "over", "19,10");
  const link = page.getByRole("button", { name: "Log", exact: true });
  await link.click();
  await page.keyboard.press("Enter");
  await expect(page.locator("#log-panel")).toBeHidden();
  await expect(game).toHaveAttribute("data-status", "ready");
  await expect(link).toBeEnabled();

  // The new game's log starts afresh, with its own time and tick count.
  await page.clock.runFor(500);
  await page.keyboard.press("ArrowRight");
  await runTicks(page, 10);
  await expectGame(game, "over", "19,10");
  await link.click();
  const { events, ticks } = await logLines(page);
  const stamps = splitPanel((await page.locator("#log-text").textContent()) ?? "").lines.slice(1);
  expect(events).toEqual([
    "key Enter new used",
    "level 1 normal delay=125 start=(10,10) right obstacles=- dot=(0,0)",
    "key ArrowRight right used",
    "turn right start",
    "move right 9 head=(19,10)",
    "end over wall score=0 best=no",
  ]);
  expect(stamps[0]).toMatch(/^\[t=0 #0\] /);
  expect(stamps[2]).toMatch(/^\[t=500 #0\] /);
  expect(ticks.at(-1)).toBe(10);
});

// The panel and the game (docs/SPEC.md 2.13 (6)).

const linkOf = (page: Page) => page.getByRole("button", { name: "Log", exact: true });
const panelText = async (page: Page): Promise<string> =>
  (await page.locator("#log-text").textContent()) ?? "";

/** A game running to the right, two ticks in: the head is on (12,10). */
async function runningGame(page: Page) {
  const game = await openGame(page);
  await page.keyboard.press("ArrowRight");
  await runTicks(page, 2);
  await expectGame(game, "running", "12,10");
  return game;
}

for (const how of ["Escape", "Close"] as const) {
  test(`opening the panel on a running game pauses it, and ${how} goes on`, async ({ page }) => {
    const game = await runningGame(page);
    await linkOf(page).click();
    await expect(page.locator("#log-panel")).toBeVisible();
    await expectGame(game, "paused", "12,10");
    await expect(page.locator("#pause")).toHaveText("Resume");
    // The text of the panel is the log after the pause of its opening.
    const lines = splitPanel(await panelText(page)).lines;
    expect(lines.at(-2)).toMatch(/^\[t=\d+ #2\] move right 2 head=\(12,10\)$/);
    expect(lines.at(-1)).toMatch(/^\[t=\d+ #2\] pause log$/);

    await runTicks(page, 5);
    await expectGame(game, "paused", "12,10");

    if (how === "Escape") await page.keyboard.press("Escape");
    else await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect(page.locator("#log-panel")).toBeHidden();
    await expectGame(game, "running", "12,10");
    await runTicks(page, 1);
    await expectGame(game, "running", "13,10");

    await linkOf(page).click();
    const { events } = await logLines(page);
    expect(events).toEqual([
      "level 1 normal delay=125 start=(10,10) right obstacles=- dot=(0,0)",
      "key ArrowRight right used",
      "turn right start",
      "move right 2 head=(12,10)",
      "pause log",
      "resume log",
      "move right 1 head=(13,10)",
      "pause log",
    ]);
  });
}

test("the panel changes nothing, opening or closing, in ready, paused and ended states", async ({
  page,
}) => {
  const game = await openGame(page);
  const panel = page.locator("#log-panel");
  const link = linkOf(page);

  await link.click();
  const readyText = await panelText(page);
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(panel).toBeHidden();
  await expect(game).toHaveAttribute("data-status", "ready");
  await runTicks(page, 5);
  await expectGame(game, "ready", "10,10");
  await link.click();
  expect(await panelText(page)).toBe(readyText);
  await page.keyboard.press("Escape");

  await page.keyboard.press("ArrowRight");
  await runTicks(page, 2);
  await page.keyboard.press("Space");
  await expectGame(game, "paused", "12,10");
  await link.click();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expectGame(game, "paused", "12,10");
  await runTicks(page, 5);
  await expectGame(game, "paused", "12,10");
  await link.click();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expectGame(game, "paused", "12,10");
  await link.click();
  const { events } = await logLines(page);
  expect(events).toEqual([
    "level 1 normal delay=125 start=(10,10) right obstacles=- dot=(0,0)",
    "key ArrowRight right used",
    "turn right start",
    "key Space pause used",
    "move right 2 head=(12,10)",
    "pause",
  ]);
  await page.keyboard.press("Escape");

  await page.keyboard.press("Space");
  await runTicks(page, 8);
  await expectGame(game, "over", "19,10");
  const endedText = await (async () => {
    await link.click();
    return panelText(page);
  })();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expectGame(game, "over", "19,10");
  await link.click();
  expect(await panelText(page)).toBe(endedText);
});

test("while the panel is open, keys, swipes, Start, Pause, Resume and the Log link do nothing", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const game = await runningGame(page);
  const panel = page.locator("#log-panel");
  await linkOf(page).click();
  await expectGame(game, "paused", "12,10");
  const text = await panelText(page);

  for (const key of ["ArrowUp", "ArrowLeft", "w", "p", "P"]) await page.keyboard.press(key);
  await swipe(page, 0, -80);
  await page.locator("#start").click({ force: true });
  await page.locator("#pause").click({ force: true }); // reads "Resume"

  // A line made since the opening (the page hidden and shown), and "✓ Copied!" showing: a click
  // on the Log link leaves both the panel's text and the button as they were.
  await page.evaluate(() => {
    for (const state of ["hidden", "visible"]) {
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
      document.dispatchEvent(new Event("visibilitychange"));
    }
  });
  await page.getByRole("button", { name: "Copy", exact: true }).click();
  await expect(page.locator("#log-copy")).toHaveText("✓ Copied!");
  await linkOf(page).click({ force: true });
  await expect(page.locator("#log-copy")).toHaveText("✓ Copied!");
  expect(await panelText(page)).toBe(text);
  await runTicks(page, 5);
  await expect(panel).toBeVisible();
  await expectGame(game, "paused", "12,10");
  await expect(page.locator("#pause")).toHaveText("Resume");
  expect(await panelText(page)).toBe(text);

  // Nothing steered the snake: it goes on to the right, and the log has no line for any of it.
  await page.keyboard.press("Escape");
  await runTicks(page, 1);
  await expectGame(game, "running", "13,10");
  await linkOf(page).click();
  const { events } = await logLines(page);
  expect(events.slice(3)).toEqual([
    "move right 2 head=(12,10)",
    "pause log",
    "hidden",
    "shown",
    "resume log",
    "move right 1 head=(13,10)",
    "pause log",
  ]);
});

test("a game the player paused stays paused while the panel is open and after it closes", async ({
  page,
}) => {
  const game = await runningGame(page);
  await page.keyboard.press("Space");
  await expectGame(game, "paused", "12,10");
  await linkOf(page).click();
  await page.keyboard.press("p");
  await page.locator("#pause").click({ force: true }); // reads "Resume"
  await expectGame(game, "paused", "12,10");
  await page.keyboard.press("Escape");
  await runTicks(page, 5);
  await expectGame(game, "paused", "12,10");
});

for (const how of ["Escape", "Close"] as const) {
  test(`a game the player paused after a panel that paused it stays paused when the panel closes with ${how}`, async ({
    page,
  }) => {
    const game = await runningGame(page);
    const close = async () => {
      if (how === "Escape") await page.keyboard.press("Escape");
      else await page.getByRole("button", { name: "Close", exact: true }).click();
    };
    await linkOf(page).click();
    await close();
    await expectGame(game, "running", "12,10");
    await page.keyboard.press("Space");
    await expectGame(game, "paused", "12,10");

    await linkOf(page).click();
    await close();
    await expect(page.locator("#log-panel")).toBeHidden();
    await runTicks(page, 5);
    await expectGame(game, "paused", "12,10");
  });
}

for (const newGame of ["Enter", "the New game button"] as const) {
  test(`a game the player paused after ${newGame} closed a panel that paused it stays paused when the panel closes`, async ({
    page,
  }) => {
    const game = await runningGame(page);
    await linkOf(page).click();
    if (newGame === "Enter") await page.keyboard.press("Enter");
    else await page.locator("#new-game").click();
    await expectGame(game, "ready", "10,10");

    await page.keyboard.press("ArrowRight");
    await runTicks(page, 2);
    await expectGame(game, "running", "12,10");
    await page.keyboard.press("Space");
    await expectGame(game, "paused", "12,10");

    await linkOf(page).click();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect(page.locator("#log-panel")).toBeHidden();
    await runTicks(page, 5);
    await expectGame(game, "paused", "12,10");
  });
}

test("in ready, keys, a swipe and Start do nothing while the panel is open", async ({ page }) => {
  const game = await openGame(page);
  await linkOf(page).click();
  await page.keyboard.press("ArrowRight");
  await swipe(page, 80, 0);
  await page.locator("#start").click({ force: true });
  await runTicks(page, 3);
  await expectGame(game, "ready", "10,10");
  await page.keyboard.press("Escape");
  await expectGame(game, "ready", "10,10");
  await page.locator("#start").click();
  await expect(game).toHaveAttribute("data-status", "running");
});

test("lines made while the panel is open are in the log, not in the open panel; a shown page does not go on", async ({
  page,
}) => {
  const game = await runningGame(page);
  await linkOf(page).click();
  const text = await panelText(page);
  await page.evaluate(() => {
    for (const state of ["hidden", "visible"]) {
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
      document.dispatchEvent(new Event("visibilitychange"));
    }
  });
  await expectGame(game, "paused", "12,10");
  expect(await panelText(page)).toBe(text);
  await page.keyboard.press("Escape");
  await expectGame(game, "running", "12,10");
  await linkOf(page).click();
  const { events } = await logLines(page);
  expect(events.slice(3)).toEqual([
    "move right 2 head=(12,10)",
    "pause log",
    "hidden",
    "shown",
    "resume log",
    "pause log",
  ]);
});

for (const how of ["Enter", "the New game button"] as const) {
  test(`${how} with the panel open on a running game closes it and makes a new game without going on`, async ({
    page,
  }) => {
    const game = await runningGame(page);
    await linkOf(page).click();
    await expectGame(game, "paused", "12,10");
    if (how === "Enter") await page.keyboard.press("Enter");
    else await page.locator("#new-game").click();
    await expect(page.locator("#log-panel")).toBeHidden();
    await expectGame(game, "ready", "10,10");
    await runTicks(page, 5);
    await expectGame(game, "ready", "10,10");
    await linkOf(page).click();
    const { events } = await logLines(page);
    expect(events).toEqual([
      how === "Enter" ? "key Enter new used" : "button New game used",
      "level 1 normal delay=125 start=(10,10) right obstacles=- dot=(0,0)",
    ]);
  });
}

// The New game command's line with the log panel open (docs/SPEC.md 2.13 (4), 2.5).

for (const how of ["Enter", "the New game button"] as const) {
  test(`${how} with the panel open: its line is the first stamped line of the new log, at [t=0 #0], before the level's line`, async ({
    page,
  }) => {
    const game = await runningGame(page);
    // Time has passed in the old game, so a stamp of 0 shows that the new log starts afresh.
    await linkOf(page).click();
    await expectGame(game, "paused", "12,10");
    if (how === "Enter") await page.keyboard.press("Enter");
    else await page.locator("#new-game").click();
    await expect(page.locator("#log-panel")).toBeHidden();
    await expectGame(game, "ready", "10,10");
    await linkOf(page).click();
    const lines = (await panelText(page)).split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe(
      `[t=0 #0] ${how === "Enter" ? "key Enter new used" : "button New game used"}`,
    );
    expect(lines[2]).toBe(
      "[t=0 #0] level 1 normal delay=125 start=(10,10) right obstacles=- dot=(0,0)",
    );
  });
}
