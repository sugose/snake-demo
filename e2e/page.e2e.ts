import { expect, gameOf, openGame, test } from "./helpers";

// Every test runs at phone (375 px) and desktop (1280 px) width, in light and dark mode
// (playwright.config.ts). Every test also fails on a console error (helpers.ts).

test("loads clean, as one self-contained file, with no sideways scrolling", async ({
  page,
  baseURL,
  colorScheme,
}) => {
  const requested: string[] = [];
  page.on("request", (request) => requested.push(request.url()));

  await page.goto("/");
  await expect(gameOf(page)).toHaveAttribute("data-status", "ready");

  const sidewaysOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(sidewaysOverflow, "page scrolls sideways").toBeLessThanOrEqual(0);

  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const [red = 0] = background.match(/\d+/g)?.map(Number) ?? [];
  expect(red > 128, `body background ${background} in ${colorScheme} mode`).toBe(
    colorScheme === "light",
  );

  expect(requested, "page loaded more than its own document").toEqual([`${baseURL}/`]);
});

test("shows the board, the level, the score, the best score, the status and the three buttons", async ({
  page,
}) => {
  const game = await openGame(page);
  await expect(page.locator("#board")).toBeVisible();
  await expect(page.locator(".scores")).toContainText("Level 1");
  await expect(page.locator("#level")).toHaveText("1");
  await expect(game).toHaveAttribute("data-level", "1");
  await expect(page.locator("#score")).toHaveText("0");
  await expect(page.locator("#best")).toHaveText("0");
  await expect(game).toHaveAttribute("data-score", "0");
  await expect(game).toHaveAttribute("data-best", "0");
  await expect(game).toHaveAttribute("data-head", "10,10");
  await expect(game).toHaveAttribute("data-length", "3");
  await expect(page.locator("#status")).toContainText("Level 1");
  await expect(page.locator("#status")).toContainText("Start");
  for (const name of ["Start", "Pause", "New game"]) {
    await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  }
});

test("sizes the board to the screen: inside 375 px, at most 480 px, square", async ({ page }) => {
  await openGame(page);
  const viewportWidth = page.viewportSize()?.width ?? 0;
  const size = await page.locator("#board").evaluate((canvas) => {
    const rect = canvas.getBoundingClientRect();
    return { left: rect.left, right: rect.right, width: rect.width, height: rect.height };
  });
  expect(size.width).toBe(size.height);
  expect(size.width).toBeLessThanOrEqual(480);
  expect(size.left).toBeGreaterThanOrEqual(0);
  expect(size.right).toBeLessThanOrEqual(viewportWidth);
  // The board takes most of a phone's width, and the full 480 px on a desktop.
  expect(size.width).toBeGreaterThanOrEqual(Math.min(480, viewportWidth) - 40);
});

test.describe("on a high-density screen", () => {
  test.use({ deviceScaleFactor: 2 });

  test("draws the board with one canvas pixel per device pixel and whole pixels per cell", async ({
    page,
  }) => {
    await openGame(page);
    const canvas = await page.locator("#board").evaluate((element) => {
      const board = element as HTMLCanvasElement;
      return {
        width: board.width,
        height: board.height,
        cssWidth: board.getBoundingClientRect().width,
        ratio: window.devicePixelRatio,
      };
    });
    expect(canvas.ratio).toBe(2);
    expect(canvas.width).toBe(canvas.cssWidth * 2);
    expect(canvas.height).toBe(canvas.width);
    expect(canvas.width % 20, "whole device pixels per cell").toBe(0);
  });
});

test("the board takes no touch scrolling or zooming", async ({ page }) => {
  await openGame(page);
  const touchAction = await page
    .locator("#board")
    .evaluate((board) => getComputedStyle(board).touchAction);
  expect(touchAction).toBe("none");
});

test("the arrow keys and Space do not scroll the page", async ({ page }) => {
  await openGame(page);
  const width = page.viewportSize()?.width ?? 0;
  await page.setViewportSize({ width, height: 300 });
  const scrollable = await page.evaluate(
    () => document.documentElement.scrollHeight > window.innerHeight,
  );
  expect(scrollable, "the page is taller than the window, so it could scroll").toBe(true);

  await page.evaluate(() => {
    window.addEventListener("scroll", () => {
      document.body.dataset.scrolled = "yes";
    });
  });
  for (const key of ["ArrowDown", "Space", "ArrowRight", "Space", "ArrowDown", "ArrowUp"]) {
    await page.keyboard.press(key);
  }
  // Keyboard scrolling is animated; give an unwanted scroll time to show (real time, not the
  // page's fake clock).
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  expect(await page.evaluate(() => document.body.dataset.scrolled ?? "no")).toBe("no");

  // A key the game does not use still scrolls, so the check above can fail.
  await page.keyboard.press("PageDown");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
});
