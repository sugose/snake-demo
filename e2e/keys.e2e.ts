import type { Locator, Page } from "@playwright/test";
import {
  answer,
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

// A key pressed on a focused button (docs/SPEC.md 2.6, 2.5, 2.13 (4) and (6), 2.14 (5), PBI-2.24).
// Enter or Space on a focused button does that button's job and is not the New game or Pause
// command; with the focus on no button they are the commands. The clock is fake and paused
// (helpers.ts); unless a test says otherwise the snake starts at (10,10) heading right and the
// game is lost, with a score of 0, on the 10th tick.

const KEYS = ["Enter", "Space"] as const;
type Key = (typeof KEYS)[number];

/** `KeyboardEvent` fields of the keys, for the events a test makes itself. */
const EVENT_OF: Readonly<Record<Key, { key: string; code: string }>> = {
  Enter: { key: "Enter", code: "Enter" },
  Space: { key: " ", code: "Space" },
};

const logLink = (page: Page): Locator => page.getByRole("button", { name: "Log", exact: true });
const scoresLink = (page: Page): Locator =>
  page.getByRole("button", { name: "Scores", exact: true });
const logPanel = (page: Page): Locator => page.locator("#log-panel");
const scoresPanel = (page: Page): Locator => page.locator("#scores-panel");

/**
 * The input lines of the game's log (a key, a button or a swipe), without their stamps. It opens
 * the panel with the mouse and closes it with Escape, so call it only with no panel open, and last.
 */
async function inputLines(page: Page): Promise<string[]> {
  await logLink(page).click();
  const text = (await page.locator("#log-text").textContent()) ?? "";
  await page.keyboard.press("Escape");
  return splitPanel(text)
    .lines.map((line) => line.replace(/^\[t=\d+ #\d+\] /, ""))
    .filter((line) => /^(key|button|swipe) /.test(line));
}

const onNothing = (page: Page): Promise<boolean> =>
  page.evaluate(() => document.activeElement === document.body);

interface Probe {
  __copied: string[];
}

/** Replaces `navigator.clipboard` in the page with one that keeps what is copied. */
async function stubClipboard(page: Page): Promise<void> {
  await page.evaluate(() => {
    const probe = window as unknown as Probe;
    probe.__copied = [];
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: (text: string): Promise<void> => {
          probe.__copied.push(text);
          return Promise.resolve();
        },
      },
    });
  });
}
const copied = (page: Page): Promise<string[]> =>
  page.evaluate(() => (window as unknown as Probe).__copied);

/** A game running to the right, two ticks in: the head is on (12,10). */
async function runningGame(page: Page): Promise<Locator> {
  const game = await openGame(page);
  await page.keyboard.press("ArrowRight");
  await runTicks(page, 2);
  await expectGame(game, "running", "12,10");
  return game;
}

// The buttons of the game, in each state they make a different line for (docs/SPEC.md 2.6, 2.13 (4)).

for (const key of KEYS) {
  test(`${key} on the focused Start starts the game, and is ignored in running, paused and over`, async ({
    page,
  }) => {
    const game = await openGame(page);
    await page.locator("#start").focus();
    await page.keyboard.press(key);
    await expectGame(game, "running", "10,10");
    await runTicks(page, 1);
    await expectGame(game, "running", "11,10");
    // Running: not a pause (Space) and not a new game (Enter).
    await page.keyboard.press(key);
    await expectGame(game, "running", "11,10");
    // Paused (by P, which does not press the button): not a resume, not a new game.
    await page.keyboard.press("p");
    await expectGame(game, "paused", "11,10");
    await page.keyboard.press(key);
    await expectGame(game, "paused", "11,10");
    await page.keyboard.press("p");
    await runTicks(page, 8);
    await expectGame(game, "running", "19,10");
    await runTicks(page, 1);
    await expectGame(game, "over", "19,10");
    await page.keyboard.press(key);
    await expectGame(game, "over", "19,10");
    expect(await inputLines(page)).toEqual([
      "button Start used",
      "button Start ignored state",
      "key p pause used",
      "button Start ignored state",
      "key p pause used",
      "button Start ignored state",
    ]);
  });

  test(`${key} on the focused Pause pauses and resumes (Resume), and is ignored in ready and over`, async ({
    page,
  }) => {
    const game = await openGame(page);
    const pause = page.locator("#pause");
    await pause.focus();
    await page.keyboard.press(key);
    await expect(game).toHaveAttribute("data-status", "ready");
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 1);
    await expectGame(game, "running", "11,10");
    await page.keyboard.press(key);
    await expectGame(game, "paused", "11,10");
    await expect(pause).toHaveText("Resume");
    await runTicks(page, 4);
    await expectGame(game, "paused", "11,10");
    await page.keyboard.press(key);
    await expectGame(game, "running", "11,10");
    await expect(pause).toHaveText("Pause");
    await runTicks(page, 9);
    await expectGame(game, "over", "19,10");
    await page.keyboard.press(key);
    await expectGame(game, "over", "19,10");
    expect(await inputLines(page)).toEqual([
      "button Pause ignored state",
      "key ArrowRight right used",
      "button Pause used",
      "button Resume used",
      "button Pause ignored state",
    ]);
  });

  test(`${key} on the focused New game makes a new game, from running and from over, and is not a pause`, async ({
    page,
  }) => {
    const game = await runningGame(page);
    await page.locator("#new-game").focus();
    await page.keyboard.press(key);
    await expectGame(game, "ready", "10,10");
    await expect(game).toHaveAttribute("data-score", "0");
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 10);
    await expectGame(game, "over", "19,10");
    await page.keyboard.press(key);
    await expectGame(game, "ready", "10,10");
    await runTicks(page, 5);
    await expectGame(game, "ready", "10,10");
    // The new game's log starts with the button's line, and no key line.
    expect(await inputLines(page)).toEqual(["button New game used"]);
  });

  test(`${key} on the focused Log link opens the panel with the focus on Close; a running game is paused by the opening`, async ({
    page,
  }) => {
    const game = await runningGame(page);
    await logLink(page).focus();
    await page.keyboard.press(key);
    await expect(logPanel(page)).toBeVisible();
    await expect(page.locator("#log-close")).toBeFocused();
    await expectGame(game, "paused", "12,10");
    const lines = splitPanel((await page.locator("#log-text").textContent()) ?? "").lines;
    expect(lines.at(-1)).toMatch(/^\[t=\d+ #2\] pause log$/);
    expect(lines.filter((line) => /\] key (Enter|Space) /.test(line))).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(logLink(page)).toBeFocused();
    await expectGame(game, "running", "12,10");
  });

  test(`${key} on the focused Log link opens the panel in ready and makes no line`, async ({
    page,
  }) => {
    const game = await openGame(page);
    await logLink(page).focus();
    await page.keyboard.press(key);
    await expect(logPanel(page)).toBeVisible();
    await expect(game).toHaveAttribute("data-status", "ready");
    const lines = splitPanel((await page.locator("#log-text").textContent()) ?? "").lines;
    expect(lines).toHaveLength(2);
  });

  test(`${key} on the focused Scores link opens the table with the focus on Close; a running game is paused`, async ({
    page,
  }) => {
    const game = await runningGame(page);
    await scoresLink(page).focus();
    await page.keyboard.press(key);
    await expect(scoresPanel(page)).toBeVisible();
    await expect(page.locator("#scores-close")).toBeFocused();
    await expectGame(game, "paused", "12,10");
    await expect(logPanel(page)).toBeHidden();
  });

  test(`${key} on the focused Copy copies the panel's text; the panel stays open and no new game is made`, async ({
    page,
  }) => {
    const game = await runningGame(page);
    await stubClipboard(page);
    await logLink(page).click();
    const shown = (await page.locator("#log-text").textContent()) ?? "";
    await page.locator("#log-copy").focus();
    await page.keyboard.press(key);
    await expect(page.locator("#log-copy")).toHaveText("✓ Copied!");
    expect(await copied(page)).toEqual([shown]);
    await expect(logPanel(page)).toBeVisible();
    await expectGame(game, "paused", "12,10");
    await page.keyboard.press("Escape");
    await expectGame(game, "running", "12,10");
    expect(await inputLines(page)).toEqual(["key ArrowRight right used"]);
  });

  test(`${key} on the focused Close of the log panel closes it, without a new game, and the game goes on`, async ({
    page,
  }) => {
    const game = await runningGame(page);
    await logLink(page).click();
    await expect(page.locator("#log-close")).toBeFocused();
    await page.keyboard.press(key);
    await expect(logPanel(page)).toBeHidden();
    await expect(logLink(page)).toBeFocused();
    await expectGame(game, "running", "12,10");
    await runTicks(page, 1);
    await expectGame(game, "running", "13,10");
    expect(await inputLines(page)).toEqual(["key ArrowRight right used"]);
  });

  test(`${key} on the focused Close of the log panel in an ended game closes it and leaves the game as it was`, async ({
    page,
  }) => {
    const game = await openGame(page);
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 10);
    await expectGame(game, "over", "19,10");
    await logLink(page).click();
    await page.keyboard.press(key);
    await expect(logPanel(page)).toBeHidden();
    await expectGame(game, "over", "19,10");
  });

  test(`${key} on the focused Close of the scores panel closes it, without a new game, and the focus goes to New game`, async ({
    page,
  }) => {
    const game = await runningGame(page);
    await scoresLink(page).click();
    await expectGame(game, "paused", "12,10");
    await expect(page.locator("#scores-close")).toBeFocused();
    await page.keyboard.press(key);
    await expect(scoresPanel(page)).toBeHidden();
    await expect(page.locator("#new-game")).toBeFocused();
    await expectGame(game, "running", "12,10");
  });
}

// The focus on no button: the page itself or the board (docs/SPEC.md 2.5, 2.6).

for (const where of ["the page", "the board"] as const) {
  test(`Space and Enter with the focus on ${where} are the Pause and New game commands`, async ({
    page,
  }) => {
    const game = await runningGame(page);
    if (where === "the board") {
      await page.locator("#pause").focus();
      await page.locator("#board").click();
    }
    expect(await onNothing(page)).toBe(true);
    await page.keyboard.press("Space");
    await expectGame(game, "paused", "12,10");
    await page.keyboard.press("Space");
    await expectGame(game, "running", "12,10");
    expect(await inputLines(page)).toEqual([
      "key ArrowRight right used",
      "key Space pause used",
      "key Space pause used",
    ]);
    // The panel's Escape put the focus on the Log link: back to no button.
    await focusNothing(page);
    await page.keyboard.press("Enter");
    await expectGame(game, "ready", "10,10");
    expect(await inputLines(page)).toEqual(["key Enter new used"]);
  });
}

test("a held Space or Enter with the focus on no button acts once and writes the repeat lines", async ({
  page,
}) => {
  const game = await openGame(page);
  await page.keyboard.press("ArrowUp");
  await page.keyboard.down("Space");
  await page.keyboard.down("Space");
  await page.keyboard.up("Space");
  await expect(game).toHaveAttribute("data-status", "paused");
  expect(await inputLines(page)).toEqual([
    "key ArrowUp up used",
    "key Space pause used",
    "key Space pause ignored repeat",
  ]);
  await focusNothing(page);
  await page.keyboard.down("Enter");
  await page.keyboard.down("Enter");
  await page.keyboard.up("Enter");
  await expect(game).toHaveAttribute("data-status", "ready");
  expect(await inputLines(page)).toEqual(["key Enter new used", "key Enter new ignored repeat"]);
});

// A held key on a button, and a key already down as the focus arrives (docs/SPEC.md 2.6).

for (const key of KEYS) {
  test(`${key} held on the focused Pause presses it once: its repeats press nothing and make no line`, async ({
    page,
  }) => {
    const game = await openGame(page);
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 1);
    await page.locator("#pause").focus();
    // A press for every key-down would pause, resume, pause and resume: running.
    for (let i = 0; i < 4; i++) await page.keyboard.down(key);
    await page.keyboard.up(key);
    await expectGame(game, "paused", "11,10");
    expect(await inputLines(page)).toEqual(["key ArrowRight right used", "button Pause used"]);
  });

  test(`${key} held down as the Log link opens the panel does not press Close until it is released and pressed again`, async ({
    page,
  }) => {
    await openGame(page);
    await logLink(page).focus();
    await page.keyboard.down(key);
    await expect(logPanel(page)).toBeVisible();
    await expect(page.locator("#log-close")).toBeFocused();
    // A repeat of the key.
    await page.keyboard.down(key);
    await expect(logPanel(page)).toBeVisible();
    // A key-down that is not marked as a repeat, while the key is still down.
    await page.evaluate((init) => {
      document.activeElement?.dispatchEvent(
        new KeyboardEvent("keydown", { ...init, bubbles: true, cancelable: true }),
      );
    }, EVENT_OF[key]);
    await expect(logPanel(page)).toBeVisible();
    await page.keyboard.up(key);
    await expect(logPanel(page)).toBeVisible();
    await page.keyboard.press(key);
    await expect(logPanel(page)).toBeHidden();
    await expect(logLink(page)).toBeFocused();
    expect(await inputLines(page)).toEqual([]);
  });

  test(`${key} held down as Close closes the panel does not press the Log link again`, async ({
    page,
  }) => {
    await openGame(page);
    await logLink(page).click();
    await page.keyboard.down(key);
    await expect(logPanel(page)).toBeHidden();
    await expect(logLink(page)).toBeFocused();
    await page.keyboard.down(key);
    await page.keyboard.down(key);
    await expect(logPanel(page)).toBeHidden();
    await page.keyboard.up(key);
    await expect(logPanel(page)).toBeHidden();
    await page.keyboard.press(key);
    await expect(logPanel(page)).toBeVisible();
  });
}

// Ctrl, Meta and Alt: the keys do nothing, on a button too. Shift does not matter (docs/SPEC.md 2.6).

for (const modifier of ["Control", "Meta", "Alt"] as const) {
  for (const key of KEYS) {
    test(`${modifier}+${key} on a focused button does nothing`, async ({ page }) => {
      const game = await openGame(page);
      await page.keyboard.press("ArrowRight");
      await runTicks(page, 1);
      for (const id of ["#pause", "#new-game", "#start", "#log-link", "#scores-link"]) {
        await page.locator(id).focus();
        await page.keyboard.press(`${modifier}+${key}`);
        await expectGame(game, "running", "11,10");
        await expect(logPanel(page)).toBeHidden();
        await expect(scoresPanel(page)).toBeHidden();
      }
      expect(await inputLines(page)).toEqual(["key ArrowRight right used"]);
    });
  }

  test(`${modifier}+Enter on the focused Copy and Close of the log panel does nothing`, async ({
    page,
  }) => {
    await openGame(page);
    await stubClipboard(page);
    await logLink(page).click();
    await page.locator("#log-copy").focus();
    await page.keyboard.press(`${modifier}+Enter`);
    await page.keyboard.press(`${modifier}+Space`);
    expect(await copied(page)).toEqual([]);
    await page.locator("#log-close").focus();
    await page.keyboard.press(`${modifier}+Enter`);
    await page.keyboard.press(`${modifier}+Space`);
    await expect(logPanel(page)).toBeVisible();
  });
}

test("Shift+Enter and Shift+Space press a focused button", async ({ page }) => {
  const game = await runningGame(page);
  await page.locator("#pause").focus();
  await page.keyboard.press("Shift+Space");
  await expectGame(game, "paused", "12,10");
  await page.locator("#new-game").focus();
  await page.keyboard.press("Shift+Enter");
  await expectGame(game, "ready", "10,10");
});

// Every other key acts on the game as before, with any focus, and does not press the button.

test("P and the arrow keys act on the game with a button focused and do not press it", async ({
  page,
}) => {
  const game = await openGame(page);
  await page.locator("#start").focus();
  await page.keyboard.press("ArrowUp");
  await expect(game).toHaveAttribute("data-status", "running");
  await logLink(page).focus();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("p");
  await expect(game).toHaveAttribute("data-status", "paused");
  await expect(logPanel(page)).toBeHidden();
  await page.locator("#pause").focus();
  await page.keyboard.press("P");
  await expect(game).toHaveAttribute("data-status", "running");
  await scoresLink(page).focus();
  await page.keyboard.press("w");
  await expect(scoresPanel(page)).toBeHidden();
  expect(await inputLines(page)).toEqual([
    "key ArrowUp up used",
    "key ArrowLeft left used",
    "key p pause used",
    "key P pause used",
    "key w up used",
  ]);
});

// The log panel's focus (docs/SPEC.md 2.13 (6), 2.5).

for (const how of ["Escape", "Close"] as const) {
  test(`the focus goes to Close when the log panel opens, and back to the Log link when ${how} closes it`, async ({
    page,
  }) => {
    await openGame(page);
    await logLink(page).click();
    await expect(page.locator("#log-close")).toBeFocused();
    if (how === "Escape") await page.keyboard.press("Escape");
    else await page.locator("#log-close").click();
    await expect(logPanel(page)).toBeHidden();
    await expect(logLink(page)).toBeFocused();
  });
}

test("the New game button closes the log panel and the scores panel, and the focus goes to it", async ({
  page,
}) => {
  const game = await runningGame(page);
  await logLink(page).click();
  // A click event that does not move the focus, as a button pressed in a browser that does not
  // focus buttons on a click.
  await page.locator("#new-game").dispatchEvent("click");
  await expect(logPanel(page)).toBeHidden();
  await expectGame(game, "ready", "10,10");
  await expect(page.locator("#new-game")).toBeFocused();

  await scoresLink(page).click();
  await expect(scoresPanel(page)).toBeVisible();
  await page.locator("#log-link").focus();
  await page.locator("#new-game").dispatchEvent("click");
  await expect(scoresPanel(page)).toBeHidden();
  await expect(page.locator("#new-game")).toBeFocused();
});

test("Enter with the focus on no button closes the log panel, makes a new game and puts the focus on New game", async ({
  page,
}) => {
  const game = await runningGame(page);
  await logLink(page).click();
  await focusNothing(page);
  await page.keyboard.press("Enter");
  await expect(logPanel(page)).toBeHidden();
  await expectGame(game, "ready", "10,10");
  await expect(page.locator("#new-game")).toBeFocused();
  expect(await inputLines(page)).toEqual(["key Enter new used"]);
});

test("with the log panel open, a button outside it counts as no button", async ({ page }) => {
  const game = await runningGame(page);
  await logLink(page).click();
  // Space is the Pause command, which does nothing with the panel open, and does not press the
  // New game button that has the focus.
  await page.locator("#new-game").focus();
  await page.keyboard.press("Space");
  await expect(logPanel(page)).toBeVisible();
  await expectGame(game, "paused", "12,10");
  await page.locator("#pause").focus();
  await page.keyboard.press("Space");
  await expect(logPanel(page)).toBeVisible();
  await expectGame(game, "paused", "12,10");
  // Enter is the New game command, also with the Log link focused.
  await logLink(page).focus();
  await page.keyboard.press("Enter");
  await expect(logPanel(page)).toBeHidden();
  await expectGame(game, "ready", "10,10");
  expect(await inputLines(page)).toEqual(["key Enter new used"]);
});

test("Space with the focus on no button does nothing while the log panel is open", async ({
  page,
}) => {
  const game = await runningGame(page);
  await logLink(page).click();
  await focusNothing(page);
  await page.keyboard.press("Space");
  await expect(logPanel(page)).toBeVisible();
  await expectGame(game, "paused", "12,10");
});

// Tab inside the log panel (docs/SPEC.md 2.13 (6)).

const focusedId = (page: Page): Promise<string> =>
  page.evaluate(() => document.activeElement?.id ?? "");

test("Tab and Shift+Tab move between Copy and Close and stay inside the panel; the log text is not a Tab stop", async ({
  page,
}) => {
  await runningGame(page);
  await logLink(page).click();
  await expect(page.locator("#log-close")).toBeFocused();
  const forward: string[] = [];
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Tab");
    forward.push(await focusedId(page));
  }
  expect(forward).toEqual([
    "log-copy",
    "log-close",
    "log-copy",
    "log-close",
    "log-copy",
    "log-close",
  ]);
  const backward: string[] = [];
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press("Shift+Tab");
    backward.push(await focusedId(page));
  }
  expect(backward).toEqual(["log-copy", "log-close", "log-copy", "log-close"]);
});

test("with the focus outside the log panel, Tab goes to Copy and Shift+Tab to Close", async ({
  page,
}) => {
  await runningGame(page);
  await logLink(page).click();
  for (const outside of ["#new-game", "#start", "#scores-link", "#log-link"]) {
    await page.locator(outside).focus();
    await page.keyboard.press("Tab");
    expect(await focusedId(page)).toBe("log-copy");
    await page.locator(outside).focus();
    await page.keyboard.press("Shift+Tab");
    expect(await focusedId(page)).toBe("log-close");
  }
  await focusNothing(page);
  await page.keyboard.press("Tab");
  expect(await focusedId(page)).toBe("log-copy");
  await focusNothing(page);
  await page.keyboard.press("Shift+Tab");
  expect(await focusedId(page)).toBe("log-close");
});

test("Tab with Ctrl, Alt or Meta in the log panel is left to the browser", async ({ page }) => {
  await openGame(page);
  await logLink(page).click();
  await page.locator("#log-copy").focus();
  // The page does not take the focus for these: a browser shortcut such as Ctrl+Tab is not a move.
  const prevented = await page.evaluate(() => {
    const results: boolean[] = [];
    for (const init of [{ ctrlKey: true }, { altKey: true }, { metaKey: true }]) {
      const event = new KeyboardEvent("keydown", {
        key: "Tab",
        code: "Tab",
        bubbles: true,
        cancelable: true,
        ...init,
      });
      document.activeElement?.dispatchEvent(event);
      results.push(event.defaultPrevented);
    }
    return results;
  });
  expect(prevented).toEqual([false, false, false]);
  await expect(page.locator("#log-copy")).toBeFocused();
});

// Ctrl, Meta and Alt with Enter or Space do nothing on the buttons of the name entry and on the
// Close of the scores panel either (docs/SPEC.md 2.6, 2.15 (4), (5)): the browser's own click on a
// focused button, which Chromium fires on the key-up of Space, is stopped there too.

/** The answers of a game that eats one dot and then hits the wall: its score of 2 opens the name entry. */
const scoringGame = (): number[] => [
  answer(startIndex("10,10", "right"), STARTS),
  answer(freeIndex("12,10", ["10,10"]), 399),
  answer(0, 397),
];

const entryButtons = {
  OK: "#entry-ok",
  Skip: "#entry-skip",
  Up: '[aria-label="Letter 1 up"]',
  Down: '[aria-label="Letter 1 down"]',
} as const;

for (const modifier of ["Control", "Meta", "Alt"] as const) {
  for (const key of KEYS) {
    for (const [name, selector] of Object.entries(entryButtons)) {
      test(`${modifier}+${key} on the focused ${name} of the name entry does nothing`, async ({
        page,
      }) => {
        const game = await openGame(page, scoringGame());
        await page.keyboard.press("ArrowRight");
        await runTicks(page, 10);
        await expect(game).toHaveAttribute("data-status", "over");
        const entry = page.getByRole("dialog", { name: "Enter your name" });
        await expect(entry).toBeVisible();
        await page.locator(selector).focus();
        await page.keyboard.press(`${modifier}+${key}`);
        // Nothing was confirmed, skipped or changed.
        await expect(entry).toBeVisible();
        await expect(page.getByRole("dialog", { name: "Top 10 scores" })).toBeHidden();
        await expect(page.getByRole("button", { name: "Letter 1, A", exact: true })).toBeVisible();
        await expect(page.locator("#status")).toContainText("Enter your name");
        expect(await page.evaluate(() => localStorage.getItem("snake-demo.scores"))).toBeNull();
        // And the press itself still works, so the test does not pass because the button is dead.
        await page.keyboard.press(name === "Skip" ? key : "Escape");
        await expect(entry).toBeHidden();
      });
    }

    test(`${modifier}+${key} on the focused Close of the scores panel does nothing`, async ({
      page,
    }) => {
      const game = await runningGame(page);
      await scoresLink(page).click();
      await expect(page.locator("#scores-close")).toBeFocused();
      await page.keyboard.press(`${modifier}+${key}`);
      await expect(scoresPanel(page)).toBeVisible();
      await expectGame(game, "paused", "12,10");
      await page.keyboard.press("Escape");
      await expect(scoresPanel(page)).toBeHidden();
      await expectGame(game, "running", "12,10");
    });
  }
}
