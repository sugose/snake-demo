import {
  COLUMN_GAP,
  chooseScale,
  drawShape,
  drawText,
  FONT,
  GLYPH_COLUMNS,
  GLYPH_ROWS,
  layoutColumns,
  MARKER_LEAD,
  type Pattern,
  SHAPES,
  type ShapeName,
  shapeBitmap,
  shiftKeyframes,
  textBitmap,
  textColumns,
} from "./pixel";
import { rankText } from "./scores";

// The 5 x 7 bitmap font, the four shapes and the drawing of a text into pixels (docs/SPEC.md 2.16 (1), 3).

const SHAPE_NAMES: readonly ShapeName[] = ["arrowUp", "arrowDown", "marker", "cursor"];
const CHARACTERS = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- "];

/** Every text of the two panels (docs/SPEC.md 2.15 (4), (5), 2.16 (1)), the ranks as the page writes them. */
const PANEL_TEXTS = [
  "ENTER YOUR NAME",
  "TOP 10 SCORES",
  "SCORE",
  "LVL",
  "RANK",
  "NAME",
  "OK",
  "SKIP",
  "CLOSE",
  "NO SCORES YET",
  "--",
  "---",
  "0123456789",
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  ...Array.from({ length: 10 }, (_, index) => rankText(index + 1)),
];

const lit = (pattern: Pattern): number => pattern.join("").split("#").length - 1;
const cells = (markup: string): string[] =>
  [...markup.matchAll(/<rect x="(\d+)" y="(\d+)" width="1" height="1"\/>/g)].map(
    (found) => `${found[1]},${found[2]}`,
  );

describe("the font (docs/SPEC.md 2.16 (1))", () => {
  it("has A to Z, 0 to 9, the hyphen and the space, and nothing else", () => {
    expect(Object.keys(FONT).sort()).toEqual([...CHARACTERS].sort());
  });

  it("is 5 x 7: every glyph has 7 rows of 5 cells, each lit (#) or not (.)", () => {
    expect([GLYPH_COLUMNS, GLYPH_ROWS]).toEqual([5, 7]);
    const wrong = CHARACTERS.filter((character) => {
      const glyph = FONT[character];
      return (
        glyph === undefined || glyph.length !== 7 || !glyph.every((row) => /^[#.]{5}$/.test(row))
      );
    });
    expect(wrong).toEqual([]);
  });

  it("draws every glyph except the space with some lit pixels, and the space with none", () => {
    const blank = CHARACTERS.filter((character) => lit(FONT[character] ?? []) === 0);
    expect(blank).toEqual([" "]);
  });

  it("gives every character a pattern different from every other's", () => {
    const seen = new Map<string, string[]>();
    for (const character of CHARACTERS) {
      const key = (FONT[character] ?? []).join("/");
      seen.set(key, [...(seen.get(key) ?? []), character]);
    }
    const alike = [...seen.values()].filter((group) => group.length > 1);
    expect(alike).toEqual([]);
    expect(seen.size).toBe(CHARACTERS.length);
  });

  it("has every character of every text of the panels", () => {
    const missing = PANEL_TEXTS.flatMap((text) =>
      [...text]
        .filter((character) => FONT[character] === undefined)
        .map((c) => `${c} of "${text}"`),
    );
    expect(missing).toEqual([]);
  });

  it("is drawn by us: the patterns are written in the code and are not read from anywhere", () => {
    // The first and the last lines of the A and the Z are a spot check of the written patterns.
    expect(FONT.A).toEqual([".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"]);
    expect(FONT.Z).toEqual(["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"]);
  });
});

describe("the four shapes (docs/SPEC.md 2.16 (1))", () => {
  it("are an arrow up, an arrow down, a triangle that marks a row and a block, no others", () => {
    expect(Object.keys(SHAPES).sort()).toEqual([...SHAPE_NAMES].sort());
  });

  it("are 5 x 7 like the glyphs", () => {
    const wrong = SHAPE_NAMES.filter((name) => {
      const shape = SHAPES[name];
      return shape.length !== 7 || !shape.every((row) => /^[#.]{5}$/.test(row));
    });
    expect(wrong).toEqual([]);
  });

  it("differ from each other and from every glyph", () => {
    const keys = new Set<string>();
    for (const character of CHARACTERS) keys.add((FONT[character] ?? []).join("/"));
    const alike: ShapeName[] = [];
    for (const name of SHAPE_NAMES) {
      const key = SHAPES[name].join("/");
      if (keys.has(key)) alike.push(name);
      keys.add(key);
    }
    expect(alike).toEqual([]);
  });

  it("the arrow down is the arrow up upside down, and the arrows point along the middle column", () => {
    expect([...SHAPES.arrowDown]).toEqual([...SHAPES.arrowUp].reverse());
    expect(SHAPES.arrowUp[0]).toBe("..#..");
    expect(SHAPES.arrowUp[6]).toBe("..#..");
  });

  it("the marker is a triangle pointing right: its rows widen to the middle row and narrow again", () => {
    const widths = SHAPES.marker.map((row) => row.split("#").length - 1);
    expect(widths).toEqual([1, 2, 3, 4, 3, 2, 1]);
    for (const row of SHAPES.marker) expect(row.startsWith("#") || !row.includes("#")).toBe(true);
  });

  it("the cursor is a solid block: every cell is lit", () => {
    expect(lit(SHAPES.cursor)).toBe(35);
  });
});

describe("textBitmap", () => {
  it("is 7 rows high and 6 columns per character less the gap after the last", () => {
    expect(textBitmap("A")).toMatchObject({ columns: 5, rows: 7 });
    expect(textBitmap("AB")).toMatchObject({ columns: 11, rows: 7 });
    expect(textBitmap("TOP 10 SCORES")).toMatchObject({ columns: 13 * 6 - 1, rows: 7 });
  });

  it("puts a lit pixel where the glyph has one, each character 6 columns after the one before", () => {
    const hyphens = textBitmap("--");
    expect(hyphens.lit).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
      [7, 3],
      [8, 3],
      [9, 3],
    ]);
    const i = textBitmap("I");
    expect(i.lit).toHaveLength(lit(FONT.I ?? []));
  });

  it("draws a space as 5 empty columns", () => {
    const text = textBitmap("I I");
    expect(text.columns).toBe(17);
    expect(text.lit.some(([x]) => x >= 6 && x < 12)).toBe(false);
    expect(text.lit.some(([x]) => x >= 12)).toBe(true);
  });

  it("draws an empty text as nothing at all", () => {
    expect(textBitmap("")).toEqual({ columns: 0, rows: 7, lit: [] });
  });

  it("keeps every lit pixel inside the bitmap", () => {
    for (const text of PANEL_TEXTS) {
      const bitmap = textBitmap(text);
      for (const [x, y] of bitmap.lit) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThan(bitmap.columns);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThan(7);
      }
    }
  });

  it.each(["a", "é", "!", "A\nB", "<", "_", "/"])(
    "refuses %j, which the font does not have",
    (text) => {
      expect(() => textBitmap(text)).toThrow(RangeError);
    },
  );
});

describe("shapeBitmap", () => {
  it.each(SHAPE_NAMES)(
    "is the %s as 5 columns by 7 rows with the pixels of its pattern",
    (name) => {
      const bitmap = shapeBitmap(name);
      expect([bitmap.columns, bitmap.rows]).toEqual([5, 7]);
      expect(bitmap.lit).toHaveLength(lit(SHAPES[name]));
    },
  );

  it("puts the marker's tip on the middle row", () => {
    expect(shapeBitmap("marker").lit).toContainEqual([3, 3]);
    expect(shapeBitmap("marker").lit).not.toContainEqual([4, 3]);
  });
});

describe("drawText (docs/SPEC.md 2.16 (1))", () => {
  it("holds the text in plain capital letters, visually hidden, and the pixels hidden from screen readers", () => {
    const markup = drawText("SKIP");
    expect(markup).toContain('<span class="visually-hidden">SKIP</span>');
    expect(markup).toContain('<svg class="px" aria-hidden="true" focusable="false"');
    expect(markup.startsWith('<span class="px-text">')).toBe(true);
    expect(markup.endsWith("</svg></span>")).toBe(true);
  });

  it("draws one square per lit pixel, of 1 by 1 pixels, with no blurred edge", () => {
    const markup = drawText("OK");
    expect(cells(markup)).toHaveLength(lit(FONT.O ?? []) + lit(FONT.K ?? []));
    expect(markup).toContain('shape-rendering="crispEdges"');
    expect(markup).toContain('viewBox="0 0 11 7"');
    expect(markup).toContain("--cols:11;--rows:7");
  });

  it("puts the squares where the bitmap has its pixels", () => {
    expect(cells(drawText("--"))).toEqual(["1,3", "2,3", "3,3", "7,3", "8,3", "9,3"]);
  });

  it("draws a space as a gap and a text of only spaces as no squares", () => {
    expect(cells(drawText("I I")).every((cell) => Number(cell.split(",")[0]) !== 8)).toBe(true);
    expect(cells(drawText("  "))).toEqual([]);
  });

  it("draws an empty text as the hidden text alone, with no picture", () => {
    expect(drawText("")).toBe('<span class="px-text"><span class="visually-hidden"></span></span>');
  });

  it("refuses a text with a character the font does not have, so no markup can be injected", () => {
    expect(() => drawText("<b>")).toThrow(RangeError);
    expect(() => drawText("ok")).toThrow(RangeError);
  });
});

describe("drawShape", () => {
  it.each(SHAPE_NAMES)(
    "draws the %s as squares, hidden from screen readers, with no text",
    (name) => {
      const markup = drawShape(name);
      expect(markup).toContain('aria-hidden="true"');
      expect(markup).toContain(`class="px px-shape px-${name}"`);
      expect(markup).not.toContain("visually-hidden");
      expect(cells(markup)).toHaveLength(lit(SHAPES[name]));
      expect(markup).toContain('viewBox="0 0 5 7"');
    },
  );
});

describe("the widths of a layout, in pixels at scale 1", () => {
  it("a text of n characters is 6n - 1 columns wide, and an empty one 0", () => {
    expect([0, 1, 2, 15].map(textColumns)).toEqual([0, 5, 11, 89]);
  });

  it("a layout is as wide as the widest text of each column, and the gaps between the columns", () => {
    const rows = [
      ["RANK", "SCORE", "LVL", "NAME"],
      ["10TH", "4000", "81", "AAA"],
    ];
    expect(layoutColumns(rows, 12)).toBe(23 + 29 + 17 + 23 + 3 * 12);
    expect(layoutColumns(rows, 0)).toBe(23 + 29 + 17 + 23);
  });

  it("adds the lead to the first column, and counts a short row's missing cells as empty", () => {
    expect(layoutColumns([["AB", "C"], ["A"]], 4, 6)).toBe(6 + 11 + 4 + 5);
    expect(layoutColumns([["AB"]], 4)).toBe(11);
  });

  it("is 0 for no rows", () => {
    expect(layoutColumns([], 12)).toBe(0);
  });

  it("names the gap between columns and the lead of the marker, which the CSS uses too", () => {
    expect(COLUMN_GAP).toBe(12);
    expect(MARKER_LEAD).toBe(6);
  });
});

describe("chooseScale (docs/SPEC.md 2.16 (1))", () => {
  const SCALES = [1, 2, 3];

  it("takes the largest scale at which the width is no wider than the limit", () => {
    expect(chooseScale(128, 340, SCALES)).toBe(2);
    expect(chooseScale(128, 480, SCALES)).toBe(3);
    expect(chooseScale(128, 200, SCALES)).toBe(1);
  });

  it("allows a width equal to the limit and refuses one pixel more", () => {
    expect(chooseScale(100, 300, SCALES)).toBe(3);
    expect(chooseScale(100, 299, SCALES)).toBe(2);
    expect(chooseScale(100, 200, SCALES)).toBe(2);
    expect(chooseScale(100, 199, SCALES)).toBe(1);
  });

  it("takes the smallest scale when none fits, and never a larger one than the scales give", () => {
    expect(chooseScale(128, 100, SCALES)).toBe(1);
    expect(chooseScale(1, 10_000, SCALES)).toBe(3);
  });

  it("does not depend on the order of the scales", () => {
    expect(chooseScale(128, 340, [3, 1, 2])).toBe(2);
    expect(chooseScale(128, 100, [3, 2, 1])).toBe(1);
  });

  it("works with the scales it is given, not with a fixed list", () => {
    expect(chooseScale(10, 45, [2, 4, 8])).toBe(4);
  });

  it("refuses an empty list of scales", () => {
    expect(() => chooseScale(128, 340, [])).toThrow(RangeError);
  });
});

describe("shiftKeyframes (docs/SPEC.md 2.16 (4))", () => {
  /** The keyframes of the rule as [percent, shifted] pairs. */
  function steps(css: string): Array<[number, boolean]> {
    return [
      ...css.matchAll(/([\d.]+)%\{transform:translateX\(([^)]*(?:\([^)]*\))?[^)]*)\)\}/g),
    ].map((found) => [Number(found[1]), found[2] !== "0"]);
  }

  it("holds the picture still, shifts it at each time for the length, and ends the cycle still", () => {
    const css = shiftKeyframes("slip", { cycleMs: 1000, atMs: [100, 500], lengthMs: 50 });
    expect(css.startsWith("@keyframes slip{")).toBe(true);
    expect(steps(css)).toEqual([
      [0, false],
      [10, true],
      [15, false],
      [50, true],
      [55, false],
      [100, false],
    ]);
  });

  it("shifts by the custom property, so the distance is the named value", () => {
    expect(shiftKeyframes("slip", { cycleMs: 1000, atMs: [100], lengthMs: 50 })).toContain(
      "translateX(var(--arcade-shift))",
    );
  });

  it("jumps from one keyframe to the next: the rule gives no tween, the animation's timing does", () => {
    expect(shiftKeyframes("slip", { cycleMs: 1000, atMs: [100], lengthMs: 50 })).not.toContain(
      "animation-timing-function",
    );
  });

  it("gives the spec's times of 900, 3300 and 5600 ms of 7000 ms for 120 ms as rounded percentages", () => {
    const css = shiftKeyframes("slip", { cycleMs: 7000, atMs: [900, 3300, 5600], lengthMs: 120 });
    expect(steps(css).map(([percent]) => percent)).toEqual([
      0, 12.8571, 14.5714, 47.1429, 48.8571, 80, 81.7143, 100,
    ]);
  });

  it("allows a shift that ends exactly at the end of the cycle", () => {
    const css = shiftKeyframes("slip", { cycleMs: 1000, atMs: [950], lengthMs: 50 });
    expect(steps(css).map(([percent]) => percent)).toEqual([0, 95, 100]);
  });

  it.each([
    ["no cycle", { cycleMs: 0, atMs: [0], lengthMs: 10 }],
    ["a negative time", { cycleMs: 1000, atMs: [-1], lengthMs: 10 }],
    ["a shift past the end of the cycle", { cycleMs: 1000, atMs: [995], lengthMs: 10 }],
    ["a zero length", { cycleMs: 1000, atMs: [100], lengthMs: 0 }],
    ["times out of order", { cycleMs: 1000, atMs: [500, 100], lengthMs: 10 }],
    ["shifts that overlap", { cycleMs: 1000, atMs: [100, 105], lengthMs: 10 }],
    ["a time that is not a number", { cycleMs: 1000, atMs: [Number.NaN], lengthMs: 10 }],
  ])("refuses %s", (_name, shift) => {
    expect(() => shiftKeyframes("slip", shift)).toThrow(RangeError);
  });

  it("refuses a name that is not a plain identifier", () => {
    expect(() => shiftKeyframes("a b{", { cycleMs: 1000, atMs: [100], lengthMs: 10 })).toThrow(
      RangeError,
    );
  });
});
