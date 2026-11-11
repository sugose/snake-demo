import type { Page } from "@playwright/test";
import { expect, expectGame, openGame, runTicks, test } from "./helpers";

// The Copy button's feedback (docs/SPEC.md 2.13 (6)). The clipboard is stubbed, so the tests do not
// depend on the browser's permissions, and the 2000 ms run on the page's fake clock.

const COPIED_MS = 2000;

type Clipboard = "ok" | "throws" | "rejects" | "absent" | "held";

interface Probe {
  __copied: string[];
  __settle: Array<(ok: boolean) => void>;
}

/** Replaces `navigator.clipboard` in the page. `held` copies stay pending until `settle`. */
async function stubClipboard(page: Page, kind: Clipboard): Promise<void> {
  await page.evaluate((how) => {
    const probe = window as unknown as Probe;
    probe.__copied = [];
    probe.__settle = [];
    const clipboard =
      how === "absent"
        ? undefined
        : {
            writeText: (text: string): Promise<void> => {
              if (how === "throws") throw new Error("denied");
              if (how === "rejects") return Promise.reject(new Error("denied"));
              if (how === "held") {
                return new Promise<void>((resolve, reject) => {
                  probe.__settle.push((ok) => {
                    if (ok) {
                      probe.__copied.push(text);
                      resolve();
                    } else reject(new Error("denied"));
                  });
                });
              }
              probe.__copied.push(text);
              return Promise.resolve();
            },
          };
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: clipboard });
  }, kind);
}

/** Finishes the oldest held copy, and lets the page's handlers for it run. */
async function settle(page: Page, ok: boolean): Promise<void> {
  await page.evaluate(async (result) => {
    (window as unknown as Probe).__settle.shift()?.(result);
    for (let i = 0; i < 10; i++) await Promise.resolve();
  }, ok);
}

const copied = (page: Page): Promise<string[]> =>
  page.evaluate(() => (window as unknown as Probe).__copied);
const copyButton = (page: Page) => page.locator("#log-copy");
const live = (page: Page) => page.locator("#log-live");
const backgroundOf = (page: Page): Promise<string> =>
  copyButton(page).evaluate((button) => getComputedStyle(button).backgroundColor);
const selected = (page: Page): Promise<string> =>
  page.evaluate(() => window.getSelection()?.toString() ?? "");
const clearSelection = (page: Page): Promise<void> =>
  page.evaluate(() => window.getSelection()?.removeAllRanges());

/** True when an "rgb(r, g, b)" colour is a clear green: its green part leads the others by 30. */
function isGreen(colour: string): boolean {
  const [r = 0, g = 0, b = 0] = (colour.match(/\d+/g) ?? []).map(Number);
  return g - Math.max(r, b) >= 30;
}

async function openPanel(page: Page, kind: Clipboard = "ok") {
  const game = await openGame(page);
  await stubClipboard(page, kind);
  await page.getByRole("button", { name: "Log", exact: true }).click();
  await expect(page.locator("#log-panel")).toBeVisible();
  return game;
}

const reopen = async (page: Page): Promise<void> => {
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Log", exact: true }).click();
};

test("Copy puts the panel's text on the clipboard, turns green with ✓ Copied! and goes back after 2000 ms", async ({
  page,
}) => {
  await openPanel(page);
  const plain = await backgroundOf(page);
  expect(isGreen(plain)).toBe(false);
  await expect(copyButton(page)).toHaveText("Copy");
  await expect(live(page)).toHaveText("");

  await copyButton(page).click();
  await expect(copyButton(page)).toHaveText("✓ Copied!");
  expect(isGreen(await backgroundOf(page))).toBe(true);
  await expect(live(page)).toHaveText("Copied");
  expect(await copied(page)).toEqual([(await page.locator("#log-text").textContent()) ?? ""]);

  await page.clock.runFor(COPIED_MS - 1);
  await expect(copyButton(page)).toHaveText("✓ Copied!");
  expect(isGreen(await backgroundOf(page))).toBe(true);
  await expect(live(page)).toHaveText("Copied");
  await page.clock.runFor(1);
  await expect(copyButton(page)).toHaveText("Copy");
  expect(await backgroundOf(page)).toBe(plain);
  await expect(live(page)).toHaveText("");
});

/** The relative luminance of an "rgb(r, g, b)" colour (WCAG 2, 1.4.3). */
function luminance(colour: string): number {
  const [r = 0, g = 0, b = 0] = (colour.match(/\d+(?:\.\d+)?/g) ?? []).map(Number).map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The WCAG contrast ratio of two "rgb(r, g, b)" colours. */
function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

test("the Copied! green is the specified pair for the colour mode and has a contrast of at least 4.5:1 (docs/SPEC.md 2.13 (6))", async ({
  page,
}) => {
  await openPanel(page);
  await copyButton(page).click();
  await expect(copyButton(page)).toHaveText("✓ Copied!");
  const dark = await page.evaluate(() => matchMedia("(prefers-color-scheme: dark)").matches);
  const { background, text } = await copyButton(page).evaluate((button) => {
    const style = getComputedStyle(button);
    return { background: style.backgroundColor, text: style.color };
  });
  // Light: fill #15803d with text #ffffff (5.0:1). Dark: fill #4ade80 with text #052e16 (8.6:1).
  expect({ background, text }).toEqual(
    dark
      ? { background: "rgb(74, 222, 128)", text: "rgb(5, 46, 22)" }
      : { background: "rgb(21, 128, 61)", text: "rgb(255, 255, 255)" },
  );
  const ratio = contrast(background, text);
  expect(ratio).toBeGreaterThanOrEqual(4.5);
  expect(ratio).toBeCloseTo(dark ? 8.6 : 5.0, 1);
});

test("the live region is polite", async ({ page }) => {
  await openPanel(page);
  await expect(live(page)).toHaveAttribute("aria-live", "polite");
});

for (const how of ["Escape", "Close"] as const) {
  test(`the button is plain at once when the panel is closed with ${how} and again when it opens`, async ({
    page,
  }) => {
    await openPanel(page);
    const plain = await backgroundOf(page);
    await copyButton(page).click();
    await expect(copyButton(page)).toHaveText("✓ Copied!");

    if (how === "Close") await page.getByRole("button", { name: "Close", exact: true }).click();
    else await page.keyboard.press("Escape");
    await expect(page.locator("#log-panel")).toBeHidden();
    await expect(copyButton(page)).toHaveText("Copy");
    await expect(live(page)).toHaveText("");

    await page.getByRole("button", { name: "Log", exact: true }).click();
    await expect(copyButton(page)).toHaveText("Copy");
    expect(await backgroundOf(page)).toBe(plain);
    await expect(live(page)).toHaveText("");
    // The old 2000 ms ending does nothing to a later copy.
    await page.clock.runFor(1000);
    await copyButton(page).click();
    await expect(copyButton(page)).toHaveText("✓ Copied!");
    await page.clock.runFor(1500);
    await expect(copyButton(page)).toHaveText("✓ Copied!");
    await page.clock.runFor(500);
    await expect(copyButton(page)).toHaveText("Copy");
  });
}

test("a second Copy while it shows copies again and starts the 2000 ms over", async ({ page }) => {
  await openPanel(page);
  await copyButton(page).click();
  await expect(copyButton(page)).toHaveText("✓ Copied!");
  await page.clock.runFor(1500);
  await copyButton(page).click();
  await expect.poll(() => copied(page).then((all) => all.length)).toBe(2);
  await expect(live(page)).toHaveText("Copied");
  await page.clock.runFor(1999);
  await expect(copyButton(page)).toHaveText("✓ Copied!");
  await page.clock.runFor(1);
  await expect(copyButton(page)).toHaveText("Copy");
});

test("the live region is emptied when a copy starts, so a repeated copy is announced again", async ({
  page,
}) => {
  await openPanel(page, "held");
  await copyButton(page).click();
  await expect(live(page)).toHaveText("");
  await settle(page, true);
  await expect(live(page)).toHaveText("Copied");
  await copyButton(page).click();
  await expect(live(page)).toHaveText("");
  await expect(copyButton(page)).toHaveText("✓ Copied!");
  await settle(page, true);
  await expect(live(page)).toHaveText("Copied");
  await page.clock.runFor(COPIED_MS - 1);
  await expect(copyButton(page)).toHaveText("✓ Copied!");
  await page.clock.runFor(1);
  await expect(live(page)).toHaveText("");
});

for (const kind of ["absent", "throws", "rejects"] as const) {
  test(`a refused copy (${kind}) leaves the button plain and selects the text`, async ({
    page,
  }) => {
    await openPanel(page, kind);
    const plain = await backgroundOf(page);
    const text = (await page.locator("#log-text").textContent()) ?? "";
    await copyButton(page).click();
    await expect.poll(() => selected(page)).toBe(text);
    await expect(copyButton(page)).toHaveText("Copy");
    expect(await backgroundOf(page)).toBe(plain);
    await expect(live(page)).toHaveText("");
    await page.clock.runFor(COPIED_MS);
    await expect(copyButton(page)).toHaveText("Copy");
  });

  test(`a refused copy (${kind}) clears a showing ✓ Copied! at once`, async ({ page }) => {
    await openPanel(page);
    const plain = await backgroundOf(page);
    const text = (await page.locator("#log-text").textContent()) ?? "";
    await copyButton(page).click();
    await expect(copyButton(page)).toHaveText("✓ Copied!");
    await clearSelection(page);

    await stubClipboard(page, kind);
    await copyButton(page).click();
    await expect(copyButton(page)).toHaveText("Copy");
    expect(await backgroundOf(page)).toBe(plain);
    await expect(live(page)).toHaveText("");
    await expect.poll(() => selected(page)).toBe(text);
  });
}

test("a copy that finishes after the panel closed has no effect", async ({ page }) => {
  await openPanel(page, "held");
  const plain = await backgroundOf(page);
  await copyButton(page).click();
  await page.keyboard.press("Escape");
  await settle(page, true);
  await expect(copyButton(page)).toHaveText("Copy");
  await expect(live(page)).toHaveText("");
  await page.getByRole("button", { name: "Log", exact: true }).click();
  await expect(copyButton(page)).toHaveText("Copy");
  expect(await backgroundOf(page)).toBe(plain);
  await expect(live(page)).toHaveText("");
  await page.clock.runFor(COPIED_MS);
  await expect(copyButton(page)).toHaveText("Copy");
});

test("a copy that finishes after the panel opened again has no effect", async ({ page }) => {
  await openPanel(page, "held");
  const plain = await backgroundOf(page);
  await copyButton(page).click();
  await reopen(page);
  await settle(page, true);
  await expect(copyButton(page)).toHaveText("Copy");
  expect(await backgroundOf(page)).toBe(plain);
  await expect(live(page)).toHaveText("");
  await page.clock.runFor(COPIED_MS);
  await expect(copyButton(page)).toHaveText("Copy");
});

test("a refused copy that finishes after the panel opened again selects nothing", async ({
  page,
}) => {
  await openPanel(page, "held");
  await copyButton(page).click();
  await reopen(page);
  await settle(page, false);
  await expect(copyButton(page)).toHaveText("Copy");
  expect(await selected(page)).toBe("");
});

test("Copy puts the text the panel showed when it opened, not lines made since", async ({
  page,
}) => {
  const game = await openGame(page);
  await page.keyboard.press("ArrowRight");
  await runTicks(page, 2);
  await expectGame(game, "running", "12,10");
  await stubClipboard(page, "ok");
  await page.getByRole("button", { name: "Log", exact: true }).click();
  const shown = (await page.locator("#log-text").textContent()) ?? "";
  await page.evaluate(() => {
    for (const state of ["hidden", "visible"]) {
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
      document.dispatchEvent(new Event("visibilitychange"));
    }
  });
  await copyButton(page).click();
  await expect(copyButton(page)).toHaveText("✓ Copied!");
  expect(await copied(page)).toEqual([shown]);
  expect(shown.split("\n").at(-1)).toMatch(/pause log$/);
});
