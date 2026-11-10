import type { Page } from "@playwright/test";
import { expect, expectGame, openGame, runTicks, test } from "./helpers";

// The event log in the browser (docs/SPEC.md 2.13).

/** The log's lines without their stamps, and the tick count of each. */
async function logLines(page: Page): Promise<{ first: string; events: string[]; ticks: number[] }> {
  const text = (await page.locator("#log-text").textContent()) ?? "";
  const [first = "", ...rest] = text.split("\n");
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

test("the Log link is not usable until the game ends; then the panel shows the whole game", async ({
  page,
}) => {
  const game = await openGame(page);
  const link = page.getByRole("button", { name: "Log", exact: true });
  const panel = page.locator("#log-panel");
  await expect(link).toBeVisible();
  await expect(link).toBeDisabled();
  await expect(panel).toBeHidden();

  await page.keyboard.press("ArrowRight");
  await runTicks(page, 3);
  await page.keyboard.press("Space");
  await expect(link).toBeDisabled();
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
  expect(copied.split("\n").at(-1)).toMatch(/end over wall score=0 best=no$/);

  // Game keys do nothing while it is open.
  await page.keyboard.press("ArrowUp");
  await expect(panel).toBeVisible();
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
  await expect(link).toBeDisabled();

  // The new game's log starts afresh.
  await page.keyboard.press("ArrowRight");
  await runTicks(page, 10);
  await expectGame(game, "over", "19,10");
  await link.click();
  const { events } = await logLines(page);
  expect(events[0]).toBe("level 1 normal delay=125 start=(10,10) right obstacles=- dot=(0,0)");
  expect(events).toHaveLength(5);
});
