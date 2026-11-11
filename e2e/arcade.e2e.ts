import type { Locator, Page } from "@playwright/test";
import { answer, expect, freeIndex, openGame, runTicks, STARTS, startIndex, test } from "./helpers";

// The arcade look of the high score list (docs/SPEC.md 2.16): the pixel letters, the colours, the
// scanlines and the glow, the motion and its reduced-motion form, and that nothing outside the two
// panels has the look. What the look looks like is the product owner's to judge; these tests check
// what can be measured, in the styles the browser computes (2.16 (6)).

const SCORES_KEY = "snake-demo.scores";

/** The colours of 2.16 (2). */
const BACKGROUND = "#0a0a18";
const TITLE = "#5fe3ff";
const HEADING = "#ffb000";
const ROW = "#f2f2f2";
const MARKED = "#ff85dc";
/** The band at its lightest: the background mixed with 6 % white (2.16 (2), (4)). */
const BAND_LIGHTEST = "#191926";
/** The contrast ratios 2.16 (2) gives for the four text colours, against the background and against the band. */
const AGAINST_BACKGROUND = [13.0, 10.7, 17.5, 9.0];
const AGAINST_BAND = [11.5, 9.5, 15.5, 8.0];

/** The animations of the look, by the names the style sheet gives them. */
const ROLL = "arcade-roll";
const SHIFT = "arcade-shift";
const BLINK = "arcade-cursor";
const BLINK_LETTER = "arcade-cursor-letter";

/** `#rrggbb` as "rgb(r, g, b)", the form the browser computes. */
function rgb(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
}

/** The numbers of "rgb(r, g, b)", or of "color(srgb r g b)" (what the browser computes for a mixed colour), 0 to 255. */
function channels(colour: string): number[] {
  const found = /^rgba?\((\d+), (\d+), (\d+)/.exec(colour);
  if (found !== null) return [Number(found[1]), Number(found[2]), Number(found[3])];
  const mixed = /^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)\)$/.exec(colour);
  if (mixed === null) throw new Error(`not an rgb colour: ${colour}`);
  return [1, 2, 3].map((at) => Math.round(Number(mixed[at]) * 255));
}

/** The relative luminance of WCAG 2.x. */
function luminance(colour: string): number {
  const [r = 0, g = 0, b = 0] = channels(colour).map((value) => {
    const unit = value / 255;
    return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The contrast ratio of two "rgb(r, g, b)" colours. */
function contrast(one: string, other: string): number {
  const [high = 0, low = 0] = [luminance(one), luminance(other)].sort((a, b) => b - a);
  return (high + 0.05) / (low + 0.05);
}

/** The answers of a game that eats one dot and then hits the wall (as e2e/scores.e2e.ts has it). */
function scoringGame(): number[] {
  return [
    answer(startIndex("10,10", "right"), STARTS),
    answer(freeIndex("12,10", ["10,10"]), 399),
    answer(0, 397),
  ];
}

async function playToEnd(page: Page): Promise<void> {
  await page.keyboard.press("ArrowRight");
  await runTicks(page, 10);
}

async function seed(page: Page, values: Record<string, string>): Promise<void> {
  await page.addInitScript((entries) => {
    for (const [key, value] of Object.entries(entries)) {
      if (window.localStorage.getItem(key) === null) window.localStorage.setItem(key, value);
    }
  }, values);
}

const entryPanel = (page: Page): Locator => page.getByRole("dialog", { name: "Enter your name" });
const tablePanel = (page: Page): Locator => page.getByRole("dialog", { name: "Top 10 scores" });
const named = (page: Page, name: string): Locator =>
  page.getByRole("button", { name, exact: true });

/** Ten entries with the highest score and level a list can hold: the widest the table gets. */
const FULL_LIST = Array.from({ length: 10 }, () => "4000:81:MMM").join(",");
/** Nine such entries: a game that scores 1 still makes the list, as the 10th (RANK 10TH). */
const NINE_LIST = Array.from({ length: 9 }, () => "4000:81:MMM").join(",");

/** Plays a game that scores 1 and leaves the name entry open. */
async function openEntry(page: Page, stored?: string): Promise<Locator> {
  if (stored !== undefined) await seed(page, { [SCORES_KEY]: stored });
  await openGame(page, scoringGame());
  await playToEnd(page);
  const panel = entryPanel(page);
  await expect(panel).toBeVisible();
  return panel;
}

/** Opens the table from the Scores link, on a page that has not played. */
async function openTable(page: Page, stored?: string): Promise<Locator> {
  if (stored !== undefined) await seed(page, { [SCORES_KEY]: stored });
  await openGame(page);
  await named(page, "Scores").click();
  const panel = tablePanel(page);
  await expect(panel).toBeVisible();
  return panel;
}

/** The two panels, each opened on a page of its own, with something to show. */
const PANELS: Record<string, (page: Page) => Promise<Locator>> = {
  entry: (page) => openEntry(page),
  table: (page) => openTable(page, "70:8:ZZZ,50:6:AAA"),
};

/** A computed style property of the element `selector` (or of its pseudo-element). */
function style(
  page: Page,
  selector: string,
  property: string,
  pseudo: string | null = null,
): Promise<string> {
  return page.evaluate(
    ({ selector, property, pseudo }) => {
      const found = document.querySelector(selector);
      if (found === null) throw new Error(`nothing matches ${selector}`);
      return getComputedStyle(found, pseudo).getPropertyValue(property);
    },
    { selector, property, pseudo },
  );
}

/** The names of the animations that run in the page now. */
function runningAnimations(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    document.getAnimations().map((animation) => (animation as CSSAnimation).animationName),
  );
}

/**
 * The computed `property` of `selector` with the animation `animation` (on that element or below it)
 * held at `time` ms: the animation is paused and set to the time.
 */
function valueAt(
  page: Page,
  selector: string,
  animation: string,
  time: number,
  property: string,
): Promise<string> {
  return page.evaluate(
    ({ selector, animation, time, property }) => {
      const found = document.querySelector(selector);
      if (found === null) throw new Error(`nothing matches ${selector}`);
      const wanted = found
        .getAnimations({ subtree: true })
        .find((candidate) => (candidate as CSSAnimation).animationName === animation);
      if (wanted === undefined) throw new Error(`${selector} has no animation ${animation}`);
      wanted.pause();
      wanted.currentTime = time;
      return getComputedStyle(found).getPropertyValue(property);
    },
    { selector, animation, time, property },
  );
}

/** The sideways shift of the matrix `transform` computed, in pixels (0 for `none`). */
function shiftOf(transform: string): number {
  if (transform === "none") return 0;
  const found = /^matrix\(1, 0, 0, 1, (-?[\d.]+), 0\)$/.exec(transform);
  if (found === null) throw new Error(`not a sideways shift: ${transform}`);
  return Number(found[1]);
}

/** The width in CSS pixels of the first element `selector` matches. */
async function widthOf(page: Page, selector: string): Promise<number> {
  const box = await page.locator(selector).first().boundingBox();
  if (box === null) throw new Error(`${selector} is not shown`);
  return box.width;
}

/** The scale the drawn pixels have: the height of the first drawn letters, over the 7 rows. */
async function scaleOf(panel: Locator): Promise<number> {
  const box = await panel.locator("svg.px").first().boundingBox();
  if (box === null) throw new Error("no drawn pixels are shown");
  return box.height / 7;
}

// ---------------------------------------------------------------------------------------------
// 2.16 (1): the letters are pixels.

test.describe("the pixel letters (docs/SPEC.md 2.16 (1))", () => {
  test("the entry's texts are found by plain text, and its buttons by their accessible names", async ({
    page,
  }) => {
    const panel = await openEntry(page);
    await expect(
      panel.getByRole("heading", { name: "ENTER YOUR NAME", exact: true }),
    ).toBeVisible();
    for (const text of ["SCORE", "LVL", "RANK"]) {
      await expect(panel.getByText(text, { exact: true })).toHaveCount(1);
    }
    await expect(panel.locator("#entry-score")).toHaveText("1");
    await expect(panel.locator("#entry-level")).toHaveText("1");
    await expect(panel.locator("#entry-rank")).toHaveText("1ST");
    for (const name of ["OK", "Skip"]) await expect(named(page, name)).toBeVisible();
    for (const number of [1, 2, 3]) {
      await expect(named(page, `Letter ${number}, A`)).toBeVisible();
      await expect(named(page, `Letter ${number} up`)).toBeVisible();
      await expect(named(page, `Letter ${number} down`)).toBeVisible();
    }
    expect(await panel.getByRole("button").count()).toBe(11);
  });

  test("a drawn label is the same word in capitals, visually hidden, in a button named as 2.15 says", async ({
    page,
  }) => {
    await openEntry(page);
    await expect(named(page, "OK").locator(".visually-hidden")).toHaveText("OK");
    await expect(named(page, "Skip").locator(".visually-hidden")).toHaveText("SKIP");
    await expect(named(page, "Letter 2, A").locator(".visually-hidden")).toHaveText("A");
    await page.keyboard.press("Enter");
    await expect(named(page, "Close").locator(".visually-hidden")).toHaveText("CLOSE");
  });

  test("the table is a real table whose cells hold the texts of 2.15 (5)", async ({ page }) => {
    const panel = await openTable(page, "70:8:ZZZ,50:6:AAA");
    await expect(panel.getByRole("heading", { name: "TOP 10 SCORES", exact: true })).toBeVisible();
    await expect(panel.getByRole("table")).toBeVisible();
    await expect(panel.getByRole("columnheader")).toHaveText(["RANK", "SCORE", "LVL", "NAME"]);
    const rows = panel.locator("tbody tr");
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0).locator("td")).toHaveText(["1ST", "70", "8", "ZZZ"]);
    await expect(rows.nth(1).locator("td")).toHaveText(["2ND", "50", "6", "AAA"]);
    await expect(panel.getByRole("cell", { name: "1ST", exact: true })).toBeVisible();
    await expect(panel.getByRole("cell", { name: "ZZZ", exact: true })).toBeVisible();
    await expect(named(page, "Close")).toBeVisible();
  });

  test("an empty table says NO SCORES YET, drawn, and has no rows", async ({ page }) => {
    const empty = await openTable(page);
    await expect(empty.getByText("NO SCORES YET", { exact: true })).toBeVisible();
    await expect(empty.locator("tbody tr")).toHaveCount(0);
    await expect(empty.locator("#scores-empty svg.px")).toHaveCount(1);
    expect(await style(page, "#scores-empty", "color")).toBe(rgb(ROW));
  });

  test("the best score's row reads -- and ---, drawn with hyphens", async ({ page }) => {
    await seed(page, { "snake-demo.best": "50" });
    const panel = await openTable(page);
    const row = panel.locator("tbody tr").first();
    await expect(row.locator("td")).toHaveText(["1ST", "50", "--", "---"]);
    await expect(row.locator("td").nth(2).locator("svg rect")).toHaveCount(6);
    await expect(row.locator("td").nth(3).locator("svg rect")).toHaveCount(9);
  });

  for (const [which, open] of Object.entries(PANELS)) {
    test(`every drawn text of the ${which} sits in an element that holds the same text in plain capitals, visually hidden`, async ({
      page,
    }) => {
      const panel = await open(page);
      const found = await panel.evaluate((element) =>
        [...element.querySelectorAll(".px-text")]
          .filter((drawn) => drawn.closest("[hidden]") === null)
          .map((drawn) => {
            const hidden = drawn.querySelector(":scope > .visually-hidden");
            const box = hidden?.getBoundingClientRect();
            return {
              text: hidden?.textContent ?? null,
              hiddenSize: box === undefined ? null : [box.width, box.height],
              drawnPixels: drawn.querySelectorAll(":scope > svg").length,
            };
          }),
      );
      expect(found.length).toBeGreaterThan(5);
      for (const text of found) {
        expect(text.text).toMatch(/^[A-Z0-9 -]+$/);
        expect(text.hiddenSize).toEqual([1, 1]);
        expect(text.drawnPixels).toBe(1);
      }
    });

    test(`no plain text shows in the ${which}: every text in it is inside a visually hidden element`, async ({
      page,
    }) => {
      const panel = await open(page);
      const shown = await panel.evaluate((element) => {
        const found: string[] = [];
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
          const text = node.textContent?.trim() ?? "";
          if (text !== "" && node.parentElement?.closest(".visually-hidden") === null) {
            found.push(text);
          }
        }
        return found;
      });
      expect(shown).toEqual([]);
    });

    test(`the pixels of the ${which} are squares of one scale, hidden from screen readers, with no blurred edge`, async ({
      page,
    }) => {
      const panel = await open(page);
      const drawn = await panel.evaluate((element) =>
        [...element.querySelectorAll("svg")]
          .filter((svg) => svg.closest("[hidden]") === null)
          .map((svg) => {
            const box = svg.getBoundingClientRect();
            const view = svg.viewBox.baseVal;
            return {
              hidden: svg.getAttribute("aria-hidden"),
              focusable: svg.getAttribute("focusable"),
              rendering: getComputedStyle(svg).shapeRendering,
              squares: [...svg.querySelectorAll("rect")].every(
                (rect) => rect.width.baseVal.value === 1 && rect.height.baseVal.value === 1,
              ),
              xScale: box.width / view.width,
              yScale: box.height / view.height,
            };
          }),
      );
      expect(drawn.length).toBeGreaterThan(5);
      const scale = await scaleOf(panel);
      expect([1, 2, 3]).toContain(scale);
      for (const svg of drawn) {
        expect(svg).toEqual({
          hidden: "true",
          focusable: "false",
          rendering: "crispedges",
          squares: true,
          xScale: scale,
          yScale: scale,
        });
      }
    });
  }

  test("the scale is the largest at which the widest of the entry and the table is no wider than the board", async ({
    page,
  }, testInfo) => {
    await openEntry(page, NINE_LIST);
    await expect(page.locator("#entry-rank")).toHaveText("10TH");
    const board = await widthOf(page, "#board");
    const scale = await scaleOf(entryPanel(page));
    const entry = [
      await widthOf(page, "#entry-title .px-text"),
      await widthOf(page, ".entry-facts"),
    ];
    await named(page, "Skip").click();
    await named(page, "Scores").click();
    await expect(tablePanel(page)).toBeVisible();
    expect(await scaleOf(tablePanel(page))).toBe(scale);
    const table = [
      await widthOf(page, "#scores-title .px-text"),
      await widthOf(page, ".scores-table"),
    ];
    const widest = Math.max(...entry, ...table);
    expect(widest).toBeLessThanOrEqual(board);
    expect([1, 2, 3]).toContain(scale);
    if (scale < 3) expect((widest / scale) * (scale + 1)).toBeGreaterThan(board);
    // The phone is 375 CSS pixels wide, the desktop 1280.
    expect(scale).toBe(testInfo.project.name.startsWith("phone") ? 2 : 3);
    expect(Number(await style(page, "#game", "--arcade-scale"))).toBe(scale);
  });

  test("the table of ten of the widest rows fits its panel, with no clipping and no sideways scroll", async ({
    page,
  }) => {
    const panel = await openTable(page, FULL_LIST);
    await expect(panel.locator("tbody tr")).toHaveCount(10);
    const fits = await panel.evaluate((element) => ({
      clipped: element.scrollHeight > element.clientHeight + 1,
      wide: element.scrollWidth > element.clientWidth + 1,
      page: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }));
    expect(fits).toEqual({ clipped: false, wide: false, page: false });
    const board = await widthOf(page, "#board");
    expect(await widthOf(page, ".scores-table")).toBeLessThanOrEqual(board);
  });

  test("a letter that changes is drawn again: the pixels of B are not those of A", async ({
    page,
  }) => {
    await openEntry(page);
    const letter = named(page, "Letter 1, A").locator(".px-text svg");
    const a = await letter.evaluate((svg) => svg.innerHTML);
    await page.keyboard.press("ArrowUp");
    const b = await named(page, "Letter 1, B")
      .locator(".px-text svg")
      .evaluate((svg) => svg.innerHTML);
    expect(b).not.toBe(a);
    await expect(named(page, "Letter 1, B").locator(".visually-hidden")).toHaveText("B");
    await page.keyboard.press("ArrowDown");
    const again = await named(page, "Letter 1, A")
      .locator(".px-text svg")
      .evaluate((svg) => svg.innerHTML);
    expect(again).toBe(a);
  });

  test("the arrows, the triangle that marks a row and the cursor block are drawn shapes", async ({
    page,
  }) => {
    await openEntry(page);
    for (const number of [1, 2, 3]) {
      await expect(named(page, `Letter ${number} up`).locator("svg.px-arrowUp")).toHaveCount(1);
      await expect(named(page, `Letter ${number} down`).locator("svg.px-arrowDown")).toHaveCount(1);
    }
    await expect(entryPanel(page).locator("svg.px-cursor")).toHaveCount(1);
    await expect(named(page, "Letter 1, A").locator("svg.px-cursor")).toHaveCount(1);
    await page.keyboard.press("Enter");
    const marked = tablePanel(page).locator('tr[aria-current="true"]');
    await expect(marked).toHaveCount(1);
    await expect(marked.locator("td").first().locator("svg.px-marker")).toHaveCount(1);
    await expect(tablePanel(page).locator("svg.px-marker")).toHaveCount(1);
  });

  test("the triangle comes before the rank in the marked row, and the rank keeps its text", async ({
    page,
  }) => {
    await openEntry(page, "50:6:AAA");
    await page.keyboard.press("Enter");
    const first = tablePanel(page).locator('tr[aria-current="true"] td').first();
    await expect(first).toHaveText("2ND");
    const order = await first.evaluate((cell) => {
      const marker = cell.querySelector(".px-marker");
      const rank = cell.querySelector(".px-text");
      return marker !== null && rank !== null
        ? marker.compareDocumentPosition(rank) === Node.DOCUMENT_POSITION_FOLLOWING
        : null;
    });
    expect(order).toBe(true);
    const boxes = await first.evaluate((cell) => {
      const marker = cell.querySelector(".px-marker")?.getBoundingClientRect();
      const rank = cell.querySelector(".px-text")?.getBoundingClientRect();
      return marker === undefined || rank === undefined
        ? null
        : { markerRight: marker.right, rankLeft: rank.left };
    });
    expect(boxes).not.toBeNull();
    expect(boxes?.markerRight).toBeLessThanOrEqual(boxes?.rankLeft ?? 0);
  });

  test("the cursor is in the selected slot only, and follows the selection", async ({ page }) => {
    const panel = await openEntry(page);
    await expect(panel.locator(".slot-cursor")).toHaveCount(1);
    await expect(named(page, "Letter 1, A").locator(".slot-cursor")).toHaveCount(1);
    await page.keyboard.press("ArrowRight");
    await expect(named(page, "Letter 2, A")).toHaveAttribute("aria-current", "true");
    await expect(panel.locator(".slot-cursor")).toHaveCount(1);
    await expect(named(page, "Letter 2, A").locator(".slot-cursor")).toHaveCount(1);
    await page.keyboard.press("ArrowUp");
    await expect(named(page, "Letter 2, B").locator(".slot-cursor")).toHaveCount(1);
    await expect(named(page, "Letter 2, B").locator(".visually-hidden").last()).toHaveText("B");
  });
});

// ---------------------------------------------------------------------------------------------
// 2.16 (2): the colours.

test.describe("the colours (docs/SPEC.md 2.16 (2))", () => {
  test("the panels are dark in light mode and in dark mode alike", async ({ page }) => {
    await openEntry(page);
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      expect(await style(page, "#entry-panel", "background-color")).toBe(rgb(BACKGROUND));
    }
    await page.keyboard.press("Escape");
    await named(page, "Scores").click();
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      expect(await style(page, "#scores-panel", "background-color")).toBe(rgb(BACKGROUND));
    }
  });

  test("the title, the headings, the rows and the marked row have their colours, in the letters and in the pixels", async ({
    page,
  }) => {
    await openEntry(page, "50:6:AAA");
    const expected: Array<[string, string]> = [
      ["#entry-title", TITLE],
      [".entry-facts .fact-label", HEADING],
      ["#entry-score", ROW],
      ["#entry-rank", ROW],
      ["#entry-ok", ROW],
      ["#entry-slots .slot-column:nth-child(2) .slot", ROW],
    ];
    for (const [selector, hex] of expected) {
      expect(await style(page, selector, "color"), selector).toBe(rgb(hex));
      expect(await style(page, `${selector} svg.px`, "fill"), `${selector} pixels`).toBe(rgb(hex));
    }
    await page.keyboard.press("Enter");
    const table: Array<[string, string]> = [
      ["#scores-title", TITLE],
      [".scores-table th", HEADING],
      ['.scores-table tbody tr:not([aria-current="true"]) td', ROW],
      ['.scores-table tr[aria-current="true"] td', MARKED],
    ];
    for (const [selector, hex] of table) {
      expect(await style(page, selector, "color"), selector).toBe(rgb(hex));
      expect(await style(page, `${selector} svg.px`, "fill"), `${selector} pixels`).toBe(rgb(hex));
    }
    expect(await style(page, '.scores-table tr[aria-current="true"] .px-marker', "fill")).toBe(
      rgb(MARKED),
    );
  });

  test("every other text of the table is in the row colour or the heading colour, none in another", async ({
    page,
  }) => {
    await openTable(page, "70:8:ZZZ,50:6:AAA");
    const colours = await page.evaluate(() =>
      [...document.querySelectorAll("#scores-panel .px-text")].map((text) => ({
        text: text.querySelector(".visually-hidden")?.textContent,
        colour: getComputedStyle(text).color,
      })),
    );
    expect(colours.length).toBeGreaterThan(10);
    const allowed = [TITLE, HEADING, ROW, MARKED].map(rgb);
    expect(colours.filter((entry) => !allowed.includes(entry.colour))).toEqual([]);
  });

  test("the selected slot and the focused button have a frame of the title colour", async ({
    page,
  }) => {
    await openEntry(page);
    const slot = "#entry-slots .slot[aria-current='true']";
    for (const side of ["top", "right", "bottom", "left"]) {
      expect(await style(page, slot, `border-${side}-color`)).toBe(rgb(TITLE));
      expect(await style(page, slot, `border-${side}-style`)).toBe("solid");
    }
    expect(
      await style(page, "#entry-slots .slot:not([aria-current])", "border-top-color"),
    ).not.toBe(rgb(TITLE));
    await named(page, "Skip").focus();
    expect(await style(page, "#entry-skip", "outline-color")).toBe(rgb(TITLE));
    expect(await style(page, "#entry-skip", "outline-style")).toBe("solid");
    expect(parseFloat(await style(page, "#entry-skip", "outline-width"))).toBeGreaterThanOrEqual(2);
    await named(page, "Letter 1 up").focus();
    expect(await style(page, "#entry-slots .slot-step", "outline-color")).toBe(rgb(TITLE));
    await named(page, "OK").focus();
    expect(await style(page, "#entry-ok", "outline-color")).toBe(rgb(TITLE));
  });

  test("the band at its lightest is the background mixed with 6 % white", async ({ page }) => {
    await openEntry(page);
    const lightest = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.style.backgroundColor = "var(--arcade-band)";
      document.querySelector("#entry-panel")?.append(probe);
      const colour = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return colour;
    });
    expect(channels(lightest)).toEqual(channels(rgb(BAND_LIGHTEST)));
    expect(await style(page, "#entry-panel", "background-image")).toContain(lightest);
  });

  test("each of the four text colours has a contrast of at least 7:1 with the background and with the band, as the spec gives", async ({
    page,
  }) => {
    await openEntry(page, "50:6:AAA");
    await page.keyboard.press("Enter");
    const computed = [
      await style(page, "#scores-title", "color"),
      await style(page, ".scores-table th", "color"),
      await style(page, '.scores-table tbody tr:not([aria-current="true"]) td', "color"),
      await style(page, '.scores-table tr[aria-current="true"] td', "color"),
    ];
    const background = await style(page, "#scores-panel", "background-color");
    const band = rgb(BAND_LIGHTEST);
    computed.forEach((colour, index) => {
      const withBackground = contrast(colour, background);
      const withBand = contrast(colour, band);
      expect(withBackground, `${colour} on the background`).toBeGreaterThanOrEqual(7);
      expect(withBand, `${colour} on the band`).toBeGreaterThanOrEqual(7);
      expect(Number(withBackground.toFixed(1))).toBe(AGAINST_BACKGROUND[index]);
      expect(Number(withBand.toFixed(1))).toBe(AGAINST_BAND[index]);
    });
  });
});

// ---------------------------------------------------------------------------------------------
// 2.16 (3): scanlines and glow.

test.describe("scanlines and glow (docs/SPEC.md 2.16 (3))", () => {
  test("a layer over the panel that takes no input draws a dark line of 1 pixel every 3 pixels at 25 % opacity", async ({
    page,
  }) => {
    await openEntry(page);
    for (const selector of ["#entry-panel"]) {
      expect(await style(page, selector, "content", "::after")).not.toBe("none");
      expect(await style(page, selector, "position", "::after")).toBe("absolute");
      expect(await style(page, selector, "pointer-events", "::after")).toBe("none");
      expect(await style(page, selector, "opacity", "::after")).toBe("0.25");
      for (const edge of ["top", "right", "bottom", "left"]) {
        expect(await style(page, selector, edge, "::after")).toBe("0px");
      }
      expect(await style(page, selector, "background-size", "::after")).toBe("100% 3px");
      expect(await style(page, selector, "background-image", "::after")).toBe(
        "linear-gradient(rgb(0, 0, 0) 1px, rgba(0, 0, 0, 0) 1px)",
      );
    }
    // The layer takes no input: a button under it is pressed by a click on its middle.
    await named(page, "Skip").click();
    await expect(entryPanel(page)).toBeHidden();
  });

  test("the table has the same layer", async ({ page }) => {
    await openTable(page, "70:8:ZZZ");
    expect(await style(page, "#scores-panel", "opacity", "::after")).toBe("0.25");
    expect(await style(page, "#scores-panel", "background-size", "::after")).toBe("100% 3px");
    expect(await style(page, "#scores-panel", "pointer-events", "::after")).toBe("none");
  });

  test("each drawn text has a glow of its own colour with a blur of 4 pixels", async ({ page }) => {
    await openEntry(page, "50:6:AAA");
    await page.keyboard.press("Enter");
    const drawn = await page.evaluate(() =>
      [...document.querySelectorAll("#scores-panel svg.px")].map((svg) => ({
        fill: getComputedStyle(svg).fill,
        filter: getComputedStyle(svg).filter,
      })),
    );
    expect(drawn.length).toBeGreaterThan(12);
    for (const one of drawn) expect(one.filter).toBe(`drop-shadow(${one.fill} 0px 0px 4px)`);
    expect(new Set(drawn.map((one) => one.fill))).toEqual(
      new Set([TITLE, HEADING, ROW, MARKED].map(rgb)),
    );
  });
});

// ---------------------------------------------------------------------------------------------
// 2.16 (4), (5): the motion, and none under prefers-reduced-motion.

test.describe("the motion (docs/SPEC.md 2.16 (4))", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
  });

  test("the panel rolls a band once in 8000 ms and shifts sideways in a cycle of 7000 ms, both for ever", async ({
    page,
  }) => {
    await openEntry(page);
    expect(await style(page, "#entry-panel", "animation-name")).toBe(`${ROLL}, ${SHIFT}`);
    expect(await style(page, "#entry-panel", "animation-duration")).toBe("8s, 7s");
    expect(await style(page, "#entry-panel", "animation-iteration-count")).toBe(
      "infinite, infinite",
    );
    expect(await style(page, "#entry-panel", "animation-timing-function")).toBe("linear, steps(1)");
  });

  test("the cursor of the selected slot blinks with a period of 500 ms, for ever", async ({
    page,
  }) => {
    await openEntry(page);
    expect(await style(page, ".slot-cursor", "animation-name")).toBe(BLINK);
    expect(await style(page, ".slot-cursor", "animation-duration")).toBe("0.5s");
    expect(await style(page, ".slot-cursor", "animation-iteration-count")).toBe("infinite");
    expect(await style(page, "#entry-slots .slot[aria-current] .px-text", "animation-name")).toBe(
      BLINK_LETTER,
    );
    expect(
      await style(page, "#entry-slots .slot[aria-current] .px-text", "animation-duration"),
    ).toBe("0.5s");
  });

  test("the cursor is shown for 250 ms and hidden for 250 ms of each period, so twice a second", async ({
    page,
  }) => {
    await openEntry(page);
    const opacities: Record<number, string> = {};
    for (const time of [1, 249, 251, 499, 501, 749, 751, 999]) {
      opacities[time] = await valueAt(page, ".slot-cursor", BLINK, time, "opacity");
    }
    expect(opacities).toEqual({
      1: "1",
      249: "1",
      251: "0",
      499: "0",
      501: "1",
      749: "1",
      751: "0",
      999: "0",
    });
    // The letter on the block is in the background colour while the block shows, in the row colour while it is hidden.
    const letter = "#entry-slots .slot[aria-current] .px-text";
    expect(await valueAt(page, letter, BLINK_LETTER, 100, "color")).toBe(rgb(BACKGROUND));
    expect(await valueAt(page, letter, BLINK_LETTER, 300, "color")).toBe(rgb(ROW));
  });

  test("the band is 40 pixels high, mixed with 6 % white, and rolls from above the panel to below it", async ({
    page,
  }) => {
    await openEntry(page);
    const geometry = await page.evaluate(() => {
      const panel = document.querySelector("#entry-panel");
      if (panel === null) throw new Error("no panel");
      const style = getComputedStyle(panel);
      return {
        height: panel.clientHeight,
        size: style.backgroundSize,
        repeat: style.backgroundRepeat,
      };
    });
    expect(geometry.size).toBe("100% 40px");
    expect(geometry.repeat).toBe("no-repeat");
    /** The band's top edge in the padding box, in pixels, from the computed background position. */
    const top = async (time: number): Promise<number> => {
      const value = await valueAt(page, "#entry-panel", ROLL, time, "background-position-y");
      const percent = /(-?[\d.]+)%/.exec(value);
      const pixels = /([+-]?)\s*([\d.]+)px/.exec(value);
      // A percentage places the band's own height inside the panel's: p * (panel - band).
      const share = percent === null ? 0 : Number(percent[1]) / 100;
      return (
        share * (geometry.height - 40) + (pixels === null ? 0 : Number(`${pixels[1]}${pixels[2]}`))
      );
    };
    expect(await top(0)).toBeCloseTo(-40, 0);
    expect(await top(4000)).toBeCloseTo(geometry.height / 2 - 20, 0);
    expect(await top(7999)).toBeGreaterThan(geometry.height - 1);
    // It starts again at the top: the second period begins where the first did.
    expect(await top(8000)).toBeCloseTo(-40, 0);
  });

  test("the picture shifts sideways by 2 pixels for 120 ms at 900, 3300 and 5600 ms of a cycle of 7000 ms", async ({
    page,
  }) => {
    await openEntry(page);
    const samples: Array<[number, number]> = [
      [0, 0],
      [899, 0],
      [901, 2],
      [1019, 2],
      [1021, 0],
      [3299, 0],
      [3301, 2],
      [3419, 2],
      [3421, 0],
      [5599, 0],
      [5601, 2],
      [5719, 2],
      [5721, 0],
      [6999, 0],
      [7901, 2],
    ];
    for (const [time, shift] of samples) {
      const transform = await valueAt(page, "#entry-panel", SHIFT, time, "transform");
      expect(shiftOf(transform), `at ${time} ms`).toBe(shift);
    }
  });

  test("the one thing that blinks is the cursor: the band and the shift move only the background position and the transform", async ({
    page,
  }) => {
    await openEntry(page);
    const animations = await page.evaluate(() =>
      document.getAnimations().map((animation) => {
        const css = animation as CSSAnimation;
        const keyframes = (css.effect as KeyframeEffect).getKeyframes();
        const properties = new Set(
          keyframes.flatMap((frame) =>
            Object.keys(frame).filter(
              (key) => !["offset", "computedOffset", "easing", "composite"].includes(key),
            ),
          ),
        );
        return { name: css.animationName, properties: [...properties].sort() };
      }),
    );
    const byName = Object.fromEntries(animations.map((one) => [one.name, one.properties]));
    expect(Object.keys(byName).sort()).toEqual([BLINK, BLINK_LETTER, ROLL, SHIFT].sort());
    expect(byName[ROLL]).toEqual(["backgroundPositionX", "backgroundPositionY"]);
    expect(byName[SHIFT]).toEqual(["transform"]);
    expect(byName[BLINK]).toEqual(["opacity"]);
    expect(byName[BLINK_LETTER]).toEqual(["color"]);
  });

  test("runs by the style sheet alone: the animations move while the page's timers are stopped", async ({
    page,
  }) => {
    // openGame stops the page's clock, so a script timer would not fire.
    await openEntry(page);
    const before = await page.evaluate(() => document.getAnimations()[0]?.currentTime);
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => document.getAnimations()[0]?.currentTime);
    expect(Number(after)).toBeGreaterThan(Number(before) + 100);
  });

  test("runs only while a panel is shown: nothing before, nothing after", async ({ page }) => {
    await openGame(page, scoringGame());
    expect(await runningAnimations(page)).toEqual([]);
    await playToEnd(page);
    await expect(entryPanel(page)).toBeVisible();
    expect((await runningAnimations(page)).sort()).toEqual(
      [BLINK, BLINK_LETTER, ROLL, SHIFT].sort(),
    );
    await page.keyboard.press("Enter");
    await expect(tablePanel(page)).toBeVisible();
    expect((await runningAnimations(page)).sort()).toEqual([ROLL, SHIFT].sort());
    await named(page, "Close").click();
    await expect(tablePanel(page)).toBeHidden();
    expect(await runningAnimations(page)).toEqual([]);
  });

  test("Skip, Escape and Close stop all of it", async ({ page }) => {
    await openEntry(page);
    expect((await runningAnimations(page)).length).toBe(4);
    await named(page, "Skip").click();
    expect(await runningAnimations(page)).toEqual([]);

    await named(page, "New game").click();
    await playToEnd(page);
    await expect(entryPanel(page)).toBeVisible();
    expect((await runningAnimations(page)).length).toBe(4);
    await page.keyboard.press("Escape");
    expect(await runningAnimations(page)).toEqual([]);

    await named(page, "Scores").click();
    await expect(tablePanel(page)).toBeVisible();
    expect((await runningAnimations(page)).length).toBe(2);
    await named(page, "Close").click();
    expect(await runningAnimations(page)).toEqual([]);

    await named(page, "Scores").click();
    expect((await runningAnimations(page)).length).toBe(2);
    await page.keyboard.press("Escape");
    expect(await runningAnimations(page)).toEqual([]);
  });

  test("the table has the band and the shift and no cursor", async ({ page }) => {
    await openTable(page, "70:8:ZZZ");
    expect(await style(page, "#scores-panel", "animation-name")).toBe(`${ROLL}, ${SHIFT}`);
    expect(await style(page, "#scores-panel", "animation-duration")).toBe("8s, 7s");
    expect(await page.locator("#scores-panel .slot-cursor").count()).toBe(0);
  });
});

test.describe("prefers-reduced-motion: reduce (docs/SPEC.md 2.16 (5))", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("nothing moves in the entry: no band, no shift, no blink", async ({ page }) => {
    await openEntry(page);
    expect(await runningAnimations(page)).toEqual([]);
    expect(await style(page, "#entry-panel", "animation-name")).toBe("none");
    expect(await style(page, ".slot-cursor", "animation-name")).toBe("none");
    expect(await style(page, "#entry-slots .slot[aria-current] .px-text", "animation-name")).toBe(
      "none",
    );
    expect(await style(page, "#entry-panel", "transform")).toBe("none");
  });

  test("the cursor stays on, with its letter in the background colour on it", async ({ page }) => {
    await openEntry(page);
    expect(await style(page, ".slot-cursor", "opacity")).toBe("1");
    expect(await style(page, ".slot-cursor", "visibility")).toBe("visible");
    expect(await style(page, "#entry-slots .slot[aria-current] .px-text", "color")).toBe(
      rgb(BACKGROUND),
    );
    expect(await style(page, ".slot-cursor svg", "fill")).toBe(rgb(TITLE));
    await page.waitForTimeout(600);
    expect(await style(page, ".slot-cursor", "opacity")).toBe("1");
    await page.keyboard.press("ArrowRight");
    await expect(named(page, "Letter 2, A").locator(".slot-cursor")).toHaveCount(1);
    expect(await style(page, ".slot-cursor", "opacity")).toBe("1");
  });

  test("nothing moves in the table either", async ({ page }) => {
    await openTable(page, "70:8:ZZZ");
    expect(await runningAnimations(page)).toEqual([]);
    expect(await style(page, "#scores-panel", "animation-name")).toBe("none");
  });

  test("the colours, the scanlines and the glow remain", async ({ page }) => {
    await openEntry(page);
    expect(await style(page, "#entry-panel", "background-color")).toBe(rgb(BACKGROUND));
    expect(await style(page, "#entry-title", "color")).toBe(rgb(TITLE));
    expect(await style(page, "#entry-panel", "opacity", "::after")).toBe("0.25");
    expect(await style(page, "#entry-panel", "background-size", "::after")).toBe("100% 3px");
    expect(await style(page, "#entry-title svg.px", "filter")).toBe(
      `drop-shadow(${rgb(TITLE)} 0px 0px 4px)`,
    );
  });
});

// ---------------------------------------------------------------------------------------------
// 2.16 (6): the values are named values handed to the CSS.

test.describe("the named values (docs/SPEC.md 2.16 (6), 3)", () => {
  test("main.ts hands the look's values to the CSS as custom properties", async ({ page }) => {
    await openGame(page);
    const values: Record<string, string> = {};
    for (const name of [
      "--arcade-band-height",
      "--arcade-roll",
      "--arcade-shift",
      "--arcade-shift-cycle",
      "--arcade-cursor",
      "--arcade-scan-height",
      "--arcade-scan-pitch",
      "--arcade-scan-opacity",
      "--arcade-glow",
      "--arcade-band-white",
    ]) {
      values[name] = (await style(page, "#game", name)).trim();
    }
    expect(values).toEqual({
      "--arcade-band-height": "40px",
      "--arcade-roll": "8000ms",
      "--arcade-shift": "2px",
      "--arcade-shift-cycle": "7000ms",
      "--arcade-cursor": "500ms",
      "--arcade-scan-height": "1px",
      "--arcade-scan-pitch": "3px",
      "--arcade-scan-opacity": "25%",
      "--arcade-glow": "4px",
      "--arcade-band-white": "6%",
    });
    expect([1, 2, 3]).toContain(Number(await style(page, "#game", "--arcade-scale")));
  });

  test("the scale follows the width of the board when the window changes", async ({ page }) => {
    await openEntry(page, NINE_LIST);
    const before = await scaleOf(entryPanel(page));
    await page.setViewportSize({ width: before === 3 ? 375 : 1280, height: 800 });
    await expect.poll(() => scaleOf(entryPanel(page))).toBe(before === 3 ? 2 : 3);
  });
});

// ---------------------------------------------------------------------------------------------
// The look is for the two panels and nothing else.

test.describe("the rest of the page keeps the plain look (docs/SPEC.md 2.16, 3)", () => {
  test("nothing outside the two panels has an animation, a filter, a transform or a layer of its own", async ({
    page,
  }) => {
    await openEntry(page);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const outside = await page.evaluate(() => {
      const found: string[] = [];
      for (const element of document.body.querySelectorAll("*")) {
        if (element.closest("#entry-panel, #scores-panel") !== null) continue;
        const own = getComputedStyle(element);
        const where = `${element.tagName.toLowerCase()}${element.id === "" ? "" : `#${element.id}`}`;
        if (own.animationName !== "none") found.push(`${where} animates`);
        if (own.filter !== "none") found.push(`${where} has a filter`);
        if (own.transform !== "none") found.push(`${where} is transformed`);
        for (const pseudo of ["::before", "::after"]) {
          if (getComputedStyle(element, pseudo).content !== "none") found.push(`${where}${pseudo}`);
        }
      }
      return found;
    });
    expect(outside).toEqual([]);
  });

  test("the page's colours are the plain ones in light and in dark mode", async ({ page }) => {
    await openGame(page);
    const plain = {
      light: {
        body: ["rgb(255, 255, 255)", "rgb(17, 17, 17)"],
        board: "rgb(238, 241, 236)",
        button: ["rgb(228, 231, 226)", "rgb(17, 17, 17)"],
      },
      dark: {
        body: ["rgb(17, 17, 17)", "rgb(242, 242, 242)"],
        board: "rgb(29, 34, 31)",
        button: ["rgb(38, 43, 40)", "rgb(242, 242, 242)"],
      },
    };
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      const expected = plain[scheme];
      expect([
        await style(page, "body", "background-color"),
        await style(page, "body", "color"),
      ]).toEqual(expected.body);
      expect(await style(page, "#board", "background-color")).toBe(expected.board);
      expect([
        await style(page, "#start", "background-color"),
        await style(page, "#start", "color"),
      ]).toEqual(expected.button);
      expect(await style(page, "body", "font-family")).toContain("system-ui");
      expect(await style(page, "#status", "font-family")).toContain("system-ui");
    }
  });

  test("the log panel and the links keep the plain look while the scores panels have theirs", async ({
    page,
  }) => {
    await openGame(page);
    await named(page, "Log").click();
    await expect(page.locator("#log-panel")).toBeVisible();
    expect(await style(page, "#log-panel", "background-color")).not.toBe(rgb(BACKGROUND));
    expect(await style(page, "#log-panel", "animation-name")).toBe("none");
    expect(await style(page, "#log-panel", "content", "::after")).toBe("none");
    expect(await style(page, "#log-panel", "transform")).toBe("none");
    expect(await style(page, "#log-copy", "background-color")).not.toBe("rgba(0, 0, 0, 0)");
    expect(await runningAnimations(page)).toEqual([]);
    expect(await style(page, "#log-text", "font-family")).not.toContain("pixel");
    await page.keyboard.press("Escape");
    expect(await style(page, "#scores-link", "text-decoration-line")).toBe("underline");
    expect(await style(page, "#scores-link", "background-color")).toBe("rgba(0, 0, 0, 0)");
    expect(await style(page, "#scores-link", "filter")).toBe("none");
  });
});
