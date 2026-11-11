import { createHash } from "node:crypto";
import type { Page } from "@playwright/test";
import { CHECKSUM_LINE, expect, expectGame, openGame, runTicks, test } from "./helpers";

// The checksum line of the event log (docs/SPEC.md 2.13 (7)): the last line of the panel's text and
// of what Copy copies, the SHA-256 of the text above it.

/** SHA-256 of `text` as UTF-8, by Node, in lowercase hexadecimal: the expected digits. */
const digest = (text: string): string => createHash("sha256").update(text, "utf8").digest("hex");

const link = (page: Page) => page.getByRole("button", { name: "Log", exact: true });
const panelText = async (page: Page): Promise<string> =>
  (await page.locator("#log-text").textContent()) ?? "";

/** Checks the panel's text: ends with the checksum line of the text above it, and has only that one. */
function expectChecksummed(shown: string): string[] {
  // CR LF is read as LF, as the command does.
  const text = shown.replace(/\r\n/g, "\n");
  expect(text.endsWith("\n")).toBe(true);
  const lines = text.slice(0, -1).split("\n");
  const last = lines.at(-1) ?? "";
  expect(last).toMatch(CHECKSUM_LINE);
  const above = lines.slice(0, -1).map((line) => `${line}\n`);
  expect(last).toBe(`sha256 ${digest(above.join(""))}`);
  // Exactly one line starts with `sha256 `, and it is the last one.
  expect(lines.filter((line) => line.startsWith("sha256 "))).toEqual([last]);
  return above.map((line) => line.slice(0, -1));
}

test("the panel ends with the checksum line of the log above it, and again after more play", async ({
  page,
}) => {
  const game = await openGame(page);
  await page.keyboard.press("ArrowRight");
  await runTicks(page, 2);
  await expectGame(game, "running", "12,10");

  await link(page).click();
  await expect(page.locator("#log-panel")).toBeVisible();
  const first = await panelText(page);
  const firstAbove = expectChecksummed(first);
  expect(firstAbove.at(-1)).toMatch(/^\[t=\d+ #2\] pause log$/);

  await page.keyboard.press("Escape");
  await expectGame(game, "running", "12,10");
  await runTicks(page, 3);
  await page.keyboard.press("ArrowDown");
  await runTicks(page, 2);

  await link(page).click();
  await expect(page.locator("#log-panel")).toBeVisible();
  const second = await panelText(page);
  const secondAbove = expectChecksummed(second);
  // The second opening holds the first one's lines and more, and not the first one's checksum line:
  // the log kept in memory has none (expectChecksummed found exactly one).
  expect(secondAbove.slice(0, firstAbove.length)).toEqual(firstAbove);
  expect(secondAbove.length).toBeGreaterThan(firstAbove.length);
  expect(secondAbove.join("\n")).not.toContain("sha256");
  expect(second.split("\n").at(-2)).not.toBe(first.split("\n").at(-2));
});

test("the checksum line has no stamp, and no line of the log has the word sha256", async ({
  page,
}) => {
  const game = await openGame(page);
  await page.keyboard.press("ArrowRight");
  await runTicks(page, 10);
  await expectGame(game, "over", "19,10");
  await link(page).click();
  const above = expectChecksummed(await panelText(page));
  expect(above.every((line, i) => i === 0 || /^\[t=\d+ #\d+\] /.test(line))).toBe(true);
  expect(above.some((line) => line.includes("sha256"))).toBe(false);
});

test("Copy puts the same text on the clipboard, the checksum line included", async ({
  context,
  page,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const game = await openGame(page);
  await page.keyboard.press("ArrowRight");
  await runTicks(page, 2);
  await expectGame(game, "running", "12,10");

  for (const more of [0, 3]) {
    if (more > 0) {
      await page.keyboard.press("Escape");
      await runTicks(page, more);
    }
    await link(page).click();
    const shown = await panelText(page);
    await page.getByRole("button", { name: "Copy", exact: true }).click();
    await expect(page.getByRole("button", { name: "✓ Copied!", exact: true })).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toBe(shown);
    expectChecksummed(copied);
  }
});

test("a new game's log has its own checksum line, and the old one is gone", async ({ page }) => {
  const game = await openGame(page);
  await page.keyboard.press("ArrowRight");
  await runTicks(page, 10);
  await expectGame(game, "over", "19,10");
  await link(page).click();
  const old = await panelText(page);
  expectChecksummed(old);
  await page.keyboard.press("Enter");
  await expect(game).toHaveAttribute("data-status", "ready");
  await link(page).click();
  const fresh = await panelText(page);
  const above = expectChecksummed(fresh);
  expect(above).toHaveLength(3);
  expect(fresh).not.toBe(old);
});
