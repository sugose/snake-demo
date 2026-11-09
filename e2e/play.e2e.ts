import {
  expect,
  expectGame,
  gameOf,
  openGame,
  runTicks,
  STORAGE_KEY,
  swipe,
  TICK_MS,
  test,
} from "./helpers";

// Playing the game in the browser (docs/SPEC.md 2). The clock is fake and paused (helpers.ts), so
// a tick happens only when a test runs the clock.

test.describe("ready", () => {
  test("nothing moves until a turn", async ({ page }) => {
    const game = await openGame(page);
    await runTicks(page, 8);
    await expectGame(game, "ready", "10,10");
  });

  test("Left, back into the neck, does nothing", async ({ page }) => {
    const game = await openGame(page);
    await page.keyboard.press("ArrowLeft");
    await runTicks(page, 4);
    await expectGame(game, "ready", "10,10");
  });

  test("a turn starts the game, and the head moves one cell per 125 ms", async ({ page }) => {
    const game = await openGame(page);
    await page.keyboard.press("ArrowUp");
    await expectGame(game, "running", "10,10");
    await page.clock.runFor(TICK_MS);
    await expect(game).toHaveAttribute("data-head", "10,9");
    await page.clock.runFor(TICK_MS - 1);
    await expect(game).toHaveAttribute("data-head", "10,9");
    await page.clock.runFor(1);
    await expect(game).toHaveAttribute("data-head", "10,8");
    await expect(game).toHaveAttribute("data-length", "3");
  });

  test("the Start button starts the game heading right", async ({ page }) => {
    const game = await openGame(page);
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await expectGame(game, "running", "10,10");
    await runTicks(page, 1);
    await expect(game).toHaveAttribute("data-head", "11,10");
  });

  test("W, A, S, D turn as the arrows do", async ({ page }) => {
    const game = await openGame(page);
    await page.keyboard.press("s");
    await runTicks(page, 1);
    await expectGame(game, "running", "10,11");
    await page.keyboard.press("D");
    await runTicks(page, 1);
    await expect(game).toHaveAttribute("data-head", "11,11");
  });
});

test("heading right from the start, the game is over after 10 ticks at the wall", async ({
  page,
}) => {
  const game = await openGame(page);
  await page.keyboard.press("ArrowRight");
  await runTicks(page, 9);
  await expectGame(game, "running", "19,10");
  await runTicks(page, 1);
  await expectGame(game, "over", "19,10");
  await expect(page.locator("#status")).toContainText("Game over");
  await expect(page.locator("#status")).toContainText("New game");
  // The timer has stopped: the last board stays on show.
  await runTicks(page, 8);
  await expectGame(game, "over", "19,10");
});

test.describe("pause", () => {
  test("Space pauses and resumes", async ({ page }) => {
    const game = await openGame(page);
    const pauseButton = page.locator("#pause");
    await page.keyboard.press("ArrowUp");
    await runTicks(page, 1);
    await page.keyboard.press("Space");
    await expectGame(game, "paused", "10,9");
    await expect(page.locator("#status")).toContainText("Paused");
    await expect(pauseButton).toHaveText("Resume");
    await runTicks(page, 8);
    await expect(game).toHaveAttribute("data-head", "10,9");
    await page.keyboard.press("Space");
    await expect(game).toHaveAttribute("data-status", "running");
    await expect(pauseButton).toHaveText("Pause");
    await runTicks(page, 1);
    await expect(game).toHaveAttribute("data-head", "10,8");
  });

  test("P pauses and resumes, in either case", async ({ page }) => {
    const game = await openGame(page);
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("p");
    await expect(game).toHaveAttribute("data-status", "paused");
    await page.keyboard.press("P");
    await expect(game).toHaveAttribute("data-status", "running");
  });

  test("holding Space pauses once and does not flip back and forth", async ({ page }) => {
    const game = await openGame(page);
    await page.keyboard.press("ArrowUp");
    // The second key-down without a key-up is a repeat (event.repeat is true).
    await page.keyboard.down("Space");
    await page.keyboard.down("Space");
    await page.keyboard.up("Space");
    await expect(game).toHaveAttribute("data-status", "paused");
  });

  test("the Pause button pauses, and resumes as Resume", async ({ page }) => {
    const game = await openGame(page);
    const pauseButton = page.locator("#pause");
    await page.keyboard.press("ArrowDown");
    await pauseButton.click();
    await expect(game).toHaveAttribute("data-status", "paused");
    await expect(pauseButton).toHaveText("Resume");
    await runTicks(page, 4);
    await expect(game).toHaveAttribute("data-head", "10,10");
    await pauseButton.click();
    await expect(game).toHaveAttribute("data-status", "running");
    await expect(pauseButton).toHaveText("Pause");
    await runTicks(page, 1);
    await expect(game).toHaveAttribute("data-head", "10,11");
  });

  test("Space on the focused Pause button acts once, through the button", async ({ page }) => {
    const game = await openGame(page);
    await page.keyboard.press("ArrowUp");
    await page.locator("#pause").focus();
    await page.keyboard.press("Space");
    await expect(game).toHaveAttribute("data-status", "paused");
    await page.keyboard.press("Space");
    await expect(game).toHaveAttribute("data-status", "running");
  });

  test("Pause does nothing in ready", async ({ page }) => {
    const game = await openGame(page);
    await page.keyboard.press("Space");
    await page.locator("#pause").click();
    await expect(game).toHaveAttribute("data-status", "ready");
  });

  test("a hidden page pauses a running game", async ({ page }) => {
    const game = await openGame(page);
    await page.keyboard.press("ArrowUp");
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "hidden",
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(game).toHaveAttribute("data-status", "paused");
    await runTicks(page, 4);
    await expect(game).toHaveAttribute("data-head", "10,10");
  });
});

test.describe("new game", () => {
  test("Enter resets a running game to ready with score 0", async ({ page }) => {
    const game = await openGame(page);
    await page.keyboard.press("ArrowDown");
    await runTicks(page, 3);
    await expect(game).toHaveAttribute("data-head", "10,13");
    await page.keyboard.press("Enter");
    await expectGame(game, "ready", "10,10");
    await expect(game).toHaveAttribute("data-score", "0");
    await expect(game).toHaveAttribute("data-length", "3");
    await expect(page.locator("#score")).toHaveText("0");
    await runTicks(page, 8);
    await expectGame(game, "ready", "10,10");
  });

  test("the New game button resets a lost game to ready with score 0", async ({ page }) => {
    const game = await openGame(page);
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 10);
    await expect(game).toHaveAttribute("data-status", "over");
    await page.getByRole("button", { name: "New game", exact: true }).click();
    await expectGame(game, "ready", "10,10");
    await expect(game).toHaveAttribute("data-score", "0");
    await expect(page.locator("#status")).toContainText("Start");
  });

  test("the arrows still steer after a button was clicked", async ({ page }) => {
    const game = await openGame(page);
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await page.keyboard.press("ArrowUp");
    await runTicks(page, 1);
    await expectGame(game, "running", "10,9");
  });
});

test.describe("swipes on the board", () => {
  test("a swipe up starts the game heading up", async ({ page }) => {
    const game = await openGame(page);
    await swipe(page, 0, -60);
    await expect(game).toHaveAttribute("data-status", "running");
    await runTicks(page, 1);
    await expect(game).toHaveAttribute("data-head", "10,9");
  });

  test("a swipe turns a running snake", async ({ page }) => {
    const game = await openGame(page);
    await page.keyboard.press("ArrowRight");
    await swipe(page, 5, 50);
    await runTicks(page, 1);
    await expectGame(game, "running", "10,11");
  });

  test("a swipe shorter than 30 px does nothing", async ({ page }) => {
    const game = await openGame(page);
    await swipe(page, 0, -29);
    await expect(game).toHaveAttribute("data-status", "ready");
  });

  test("a mouse drag is not a swipe", async ({ page }) => {
    const game = await openGame(page);
    await swipe(page, 0, -60, "mouse");
    await expect(game).toHaveAttribute("data-status", "ready");
  });
});

test.describe("best score", () => {
  test("a stored best score above 0 is shown and survives a reload", async ({ page }) => {
    await page.goto("/");
    await page.evaluate((key) => window.localStorage.setItem(key, "7"), STORAGE_KEY);
    await page.reload();
    const game = gameOf(page);
    await expect(game).toHaveAttribute("data-best", "7");
    await expect(page.locator("#best")).toHaveText("7");
    await page.reload();
    await expect(game).toHaveAttribute("data-best", "7");
  });

  test("a game that ends above the best score saves it as the best", async ({ page }) => {
    // This random number puts the first food right in front of the head, at (11,10) (index 208 of
    // 397 free cells), and the next one behind the snake, at (7,10) (index 207 of 396), so heading
    // right eats once and then hits the wall.
    const game = await openGame(page, 208.5 / 397);
    await page.keyboard.press("ArrowRight");
    await runTicks(page, 1);
    await expect(game).toHaveAttribute("data-score", "1");
    await expect(page.locator("#score")).toHaveText("1");
    await expect(game).toHaveAttribute("data-best", "0");
    await runTicks(page, 9);
    await expect(game).toHaveAttribute("data-status", "over");
    await expect(game).toHaveAttribute("data-best", "1");
    await expect(page.locator("#best")).toHaveText("1");
    expect(await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY)).toBe("1");
    await page.reload();
    await expect(game).toHaveAttribute("data-best", "1");
  });

  test("a game that ends at or below the best score leaves it", async ({ page }) => {
    await page.addInitScript((key) => {
      if (window.localStorage.getItem(key) === null) window.localStorage.setItem(key, "5");
    }, STORAGE_KEY);
    const game = await openGame(page);
    await expect(game).toHaveAttribute("data-best", "5");
    await page.keyboard.press("ArrowUp");
    await runTicks(page, 11);
    await expect(game).toHaveAttribute("data-status", "over");
    await expect(game).toHaveAttribute("data-best", "5");
    expect(await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY)).toBe("5");
  });
});
