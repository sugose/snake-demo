import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Locator, Page } from "@playwright/test";
import { expect, expectGame, openGame, runTicks, splitPanel, test } from "./helpers";

// The version line in the browser (docs/SPEC.md 2.17, and 2.13 (3) for the log's first line).

/** The `version` of package.json, read here from the file, not from the page. */
const VERSION = (
  JSON.parse(readFileSync(resolve(__dirname, "../package.json"), "utf8")) as {
    version: string;
  }
).version;

const versionLine = (page: Page): Locator => page.locator("#version");

/** The text of the line: `v`, the version, ` · ` (U+00B7) and 7 lowercase hexadecimal digits or `dev`. */
const TEXT = new RegExp(`^v${VERSION.replace(/[.+-]/g, "\\$&")} \\u00b7 ([0-9a-f]{7}|dev)$`);

/** The log's first line, from the panel; opens it and closes it again. */
async function firstLogLine(page: Page): Promise<string> {
  await page.getByRole("button", { name: "Log", exact: true }).click();
  const text = (await page.locator("#log-text").textContent()) ?? "";
  await page.keyboard.press("Escape");
  return splitPanel(text).lines[0] ?? "";
}

/** A CSS colour as [r, g, b], from `rgb(...)`, `rgba(...)` or `color(srgb ...)` as the browser gives it. */
function parseColour(css: string): [number, number, number] {
  const numbers = css.match(/[\d.]+/g)?.map(Number) ?? [];
  if (numbers.length < 3) throw new Error(`not a colour: ${css}`);
  const scale = css.startsWith("color(") ? 255 : 1;
  return [numbers[0] ?? 0, numbers[1] ?? 0, numbers[2] ?? 0].map((value) => value * scale) as [
    number,
    number,
    number,
  ];
}

/** The WCAG 2 contrast ratio of two colours. */
function contrast(a: string, b: string): number {
  const luminance = (css: string): number => {
    const [r, g, bl] = parseColour(css).map((channel) => {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

test("the line is `v`, the version of package.json, ` · ` and the build, under the board and below the controls", async ({
  page,
}) => {
  await openGame(page);
  const line = versionLine(page);
  await expect(line).toBeVisible();
  await expect(line).toHaveText(TEXT);
  expect(await line.textContent()).toMatch(TEXT);

  const board = await page.locator("#board").boundingBox();
  const controls = await page.locator(".controls").boundingBox();
  const box = await line.boundingBox();
  if (board === null || controls === null || box === null) throw new Error("not visible");
  expect(box.y, "under the board").toBeGreaterThanOrEqual(board.y + board.height);
  expect(box.y, "below the controls").toBeGreaterThanOrEqual(controls.y + controls.height);

  // The last thing in the page's column.
  expect(await page.locator("#game").evaluate((game) => game.lastElementChild?.id)).toBe("version");
});

test("the log's first line names the version of package.json and the same build as the line", async ({
  page,
}) => {
  await openGame(page);
  const text = (await versionLine(page).textContent()) ?? "";
  const match = TEXT.exec(text);
  expect(match, `the line's text: ${text}`).not.toBeNull();
  const build = match?.[1] ?? "";
  expect(await firstLogLine(page)).toMatch(
    new RegExp(`^snake-demo version=${VERSION.replace(/[.+-]/g, "\\$&")} build=${build} size=20 `),
  );
});

test("on a playtest page the line is shown and the first line, with the same build, ends with the options", async ({
  page,
}) => {
  await openGame(page, undefined, "/?level=5&slow");
  const text = (await versionLine(page).textContent()) ?? "";
  const match = TEXT.exec(text);
  expect(match, `the line's text: ${text}`).not.toBeNull();
  const build = match?.[1] ?? "";
  const first = await firstLogLine(page);
  expect(first.startsWith(`snake-demo version=${VERSION} build=${build} size=20 `)).toBe(true);
  expect(first.endsWith(" playtest start-level=5 slow")).toBe(true);
});

test("the line is not reached by Tab or Shift+Tab", async ({ page }) => {
  await openGame(page);
  const reached = async (): Promise<boolean> =>
    page.evaluate(() => {
      const line = document.getElementById("version");
      const active = document.activeElement;
      return line !== null && active !== null && (active === line || line.contains(active));
    });
  for (let press = 0; press < 12; press++) {
    await page.keyboard.press("Tab");
    expect(await reached(), `after Tab ${press + 1}`).toBe(false);
  }
  for (let press = 0; press < 12; press++) {
    await page.keyboard.press("Shift+Tab");
    expect(await reached(), `after Shift+Tab ${press + 1}`).toBe(false);
  }
  const line = versionLine(page);
  expect(await line.getAttribute("tabindex")).toBeNull();
  expect(await line.evaluate((element) => element.tagName)).not.toMatch(/^(BUTTON|A|INPUT)$/);
  expect(await line.getAttribute("role")).toBeNull();
});

test("a click on the line makes no log line and changes nothing in the game", async ({ page }) => {
  const game = await openGame(page);
  const before = await game.evaluate((element) => ({ ...element.dataset }));
  const logBefore = await firstLogLine(page);
  await versionLine(page).click();
  await versionLine(page).dblclick();
  await expectGame(game, "ready", before.head ?? "");
  expect(await game.evaluate((element) => ({ ...element.dataset }))).toEqual(before);

  // The log has its first line and the level line, and nothing else.
  await page.getByRole("button", { name: "Log", exact: true }).click();
  const lines = splitPanel((await page.locator("#log-text").textContent()) ?? "").lines;
  await page.keyboard.press("Escape");
  expect(lines[0]).toBe(logBefore);
  expect(lines).toHaveLength(2);
  expect(lines[1]).toMatch(/^\[t=0 #0\] level 1 /);

  // On a running game too, a click changes nothing: no pause, no turn.
  await page.keyboard.press("ArrowRight");
  await runTicks(page, 2);
  await expect(game).toHaveAttribute("data-status", "running");
  const running = await game.evaluate((element) => ({ ...element.dataset }));
  await versionLine(page).click();
  expect(await game.evaluate((element) => ({ ...element.dataset }))).toEqual(running);
  await expect(game).toHaveAttribute("data-status", "running");
});

test("the line is in the muted colour, 4.5:1 or more against the background", async ({ page }) => {
  await openGame(page);
  const { line, muted, background } = await page.evaluate(() => {
    const element = document.getElementById("version") as HTMLElement;
    // `--muted` in the same form as the line's computed colour: a probe that uses it as its colour.
    const probe = document.createElement("span");
    probe.style.color = "var(--muted)";
    document.body.append(probe);
    const result = {
      line: getComputedStyle(element).color,
      muted: getComputedStyle(probe).color,
      background: getComputedStyle(document.body).backgroundColor,
    };
    probe.remove();
    return result;
  });
  expect(line).toBe(muted);
  expect(contrast(line, background)).toBeGreaterThanOrEqual(4.5);
});

test("the line's font size is 0.75 of the status line's, and it is centred under the board", async ({
  page,
}) => {
  await openGame(page);
  const sizes = await page.evaluate(() => ({
    line: Number.parseFloat(
      getComputedStyle(document.getElementById("version") as HTMLElement).fontSize,
    ),
    status: Number.parseFloat(
      getComputedStyle(document.getElementById("status") as HTMLElement).fontSize,
    ),
  }));
  expect(sizes.line / sizes.status).toBeCloseTo(0.75, 3);

  // The centre of the text itself, not of the element's box.
  const textCentre = await page.evaluate(() => {
    const range = document.createRange();
    range.selectNodeContents(document.getElementById("version") as HTMLElement);
    const box = range.getBoundingClientRect();
    return box.x + box.width / 2;
  });
  const board = await page.locator("#board").boundingBox();
  if (board === null) throw new Error("the board is not visible");
  expect(Math.abs(textCentre - (board.x + board.width / 2))).toBeLessThanOrEqual(1);
});

test("the line's text is in the accessibility tree", async ({ page }) => {
  await openGame(page);
  const line = versionLine(page);
  expect(await line.getAttribute("aria-hidden")).toBeNull();
  const tree = await page.locator("#game").ariaSnapshot();
  const text = (await line.textContent()) ?? "";
  expect(tree).toContain(text);
  await expect(page.getByText(text, { exact: true })).toBeVisible();
});
