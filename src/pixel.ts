/**
 * The pixel font and the drawing of a text into pixels (docs/SPEC.md 2.16 (1), 3), as pure
 * functions.
 *
 * The letters of the high score list's panels are drawn from a bitmap font of 5 x 7 pixels for A to Z,
 * 0 to 9, the hyphen and the space, with four shapes (an arrow up, an arrow down, a triangle that
 * marks a row and a block that is the cursor of the selected slot). The patterns below are written
 * for this project; no font, image or other third-party material is used.
 *
 * A text is drawn as markup: a square for each lit pixel, in an SVG that is hidden from screen
 * readers, next to a visually hidden element that holds the same text in plain capital letters, so
 * that the page's real table and buttons keep their texts and names. The module writes no named
 * value of `config.ts`: the scales come in as parameters, and the sizes below are those of the font
 * and of the layout it draws, which the CSS uses through custom properties that `main.ts` sets.
 */

/** Columns and rows of a glyph, in pixels (docs/SPEC.md 2.16 (1)). */
export const GLYPH_COLUMNS = 5;
export const GLYPH_ROWS = 7;

/** The columns from the start of one glyph to the start of the next: the glyph and one empty column. */
const PITCH = GLYPH_COLUMNS + 1;

/**
 * The gap between two columns of a table, in pixels at scale 1: two glyph pitches. The style sheet
 * takes it from the custom property `--arcade-gap`, which `main.ts` sets from this value.
 */
export const COLUMN_GAP = 2 * PITCH;

/**
 * The room before the rank for the triangle that marks a row, in pixels at scale 1: a glyph and its
 * empty column. The style sheet takes it from `--arcade-lead`.
 */
export const MARKER_LEAD = PITCH;

/** A glyph or a shape: 7 rows of 5 cells, each lit (`#`) or not (`.`). */
export type Pattern = readonly string[];

/** The font: A to Z, 0 to 9, the hyphen and the space. */
export const FONT: Readonly<Record<string, Pattern>> = Object.freeze({
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".###.", "#...#", "#....", "#.###", "#...#", "#...#", ".###."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: [".###.", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
  J: ["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "##..#", "#.#.#", "#..##", "#..##", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": ["#####", "...#.", "..#..", "...#.", "....#", "#...#", ".###."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": ["..##.", ".#...", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "...#.", ".##.."],
  "-": [".....", ".....", ".....", ".###.", ".....", ".....", "....."],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
});

/** The four shapes of the panels (docs/SPEC.md 2.16 (1)). */
export type ShapeName = "arrowUp" | "arrowDown" | "marker" | "cursor";

const ARROW_UP: Pattern = ["..#..", ".###.", "#####", "..#..", "..#..", "..#..", "..#.."];

export const SHAPES: Readonly<Record<ShapeName, Pattern>> = Object.freeze({
  arrowUp: ARROW_UP,
  arrowDown: [...ARROW_UP].reverse(),
  /** A triangle that points right, at the rank of the row it marks. */
  marker: ["#....", "##...", "###..", "####.", "###..", "##...", "#...."],
  /** The block that is the cursor of the selected slot. */
  cursor: ["#####", "#####", "#####", "#####", "#####", "#####", "#####"],
});

/** What is drawn: its size in pixels and the lit pixels as [column, row], row by row. */
export interface Bitmap {
  readonly columns: number;
  readonly rows: number;
  readonly lit: ReadonlyArray<readonly [number, number]>;
}

/** When and how the picture slips sideways within a cycle (docs/SPEC.md 2.16 (4)). */
export interface Shift {
  readonly cycleMs: number;
  /** When each shift starts, in milliseconds from the start of the cycle, in order. */
  readonly atMs: readonly number[];
  /** How long each shift lasts, in milliseconds. */
  readonly lengthMs: number;
}

/** The lit pixels of `pattern`, as [column, row] with `offset` columns added to the column. */
function litPixels(pattern: Pattern, offset: number): Array<readonly [number, number]> {
  const lit: Array<readonly [number, number]> = [];
  pattern.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === "#") lit.push([x + offset, y]);
    }
  });
  return lit;
}

/** The columns a text of `characters` characters is wide: 6 for each, less the empty column after the last. */
export function textColumns(characters: number): number {
  return characters === 0 ? 0 : characters * PITCH - 1;
}

/** Draws `text` into pixels. Refuses a character the font does not have. */
export function textBitmap(text: string): Bitmap {
  const characters = [...text];
  const lit: Array<readonly [number, number]> = [];
  characters.forEach((character, index) => {
    const glyph = FONT[character];
    if (glyph === undefined) {
      throw new RangeError(`the pixel font has no ${JSON.stringify(character)}`);
    }
    lit.push(...litPixels(glyph, index * PITCH));
  });
  return { columns: textColumns(characters.length), rows: GLYPH_ROWS, lit };
}

/** Draws a shape into pixels. */
export function shapeBitmap(shape: ShapeName): Bitmap {
  return { columns: GLYPH_COLUMNS, rows: GLYPH_ROWS, lit: litPixels(SHAPES[shape], 0) };
}

/**
 * The columns a layout is wide, in pixels at scale 1: the widest text of each column of `rows`, the
 * `gap` between neighbouring columns and, before the first column, `lead` (for the triangle that marks
 * a row). A row with fewer cells than the others leaves the rest of its columns empty.
 */
export function layoutColumns(rows: readonly (readonly string[])[], gap: number, lead = 0): number {
  const count = Math.max(0, ...rows.map((row) => row.length));
  if (count === 0) return 0;
  let width = lead + gap * (count - 1);
  for (let column = 0; column < count; column++) {
    width += Math.max(...rows.map((row) => textColumns([...(row[column] ?? "")].length)));
  }
  return width;
}

/**
 * The largest of `scales` at which a drawing of `columns` pixels is no wider than `limit` CSS
 * pixels (docs/SPEC.md 2.16 (1)); the smallest if none is.
 */
export function chooseScale(columns: number, limit: number, scales: readonly number[]): number {
  const sorted = [...scales].sort((a, b) => a - b);
  const smallest = sorted[0];
  if (smallest === undefined) throw new RangeError("there is no scale to choose from");
  return sorted.reduce((best, scale) => (columns * scale <= limit ? scale : best), smallest);
}

/** The squares of `bitmap` and the size of the picture, as an SVG whose class is `className`. */
function svgOf(bitmap: Bitmap, className: string): string {
  const squares = bitmap.lit
    .map(([x, y]) => `<rect x="${x}" y="${y}" width="1" height="1"/>`)
    .join("");
  return (
    `<svg class="${className}" aria-hidden="true" focusable="false" ` +
    `viewBox="0 0 ${bitmap.columns} ${bitmap.rows}" shape-rendering="crispEdges" ` +
    `style="--cols:${bitmap.columns};--rows:${bitmap.rows}">${squares}</svg>`
  );
}

/**
 * Markup for `text` drawn as squares, one per lit pixel (docs/SPEC.md 2.16 (1)): the pixels hidden
 * from screen readers, and the same text in plain capital letters in a visually hidden element, so
 * that the text does not show twice and screen readers and tests find it. Refuses a character the
 * font does not have, so that nothing but the font's characters can reach the markup.
 */
export function drawText(text: string): string {
  const bitmap = textBitmap(text);
  const hidden = `<span class="visually-hidden">${text}</span>`;
  const picture = bitmap.columns === 0 ? "" : svgOf(bitmap, "px");
  return `<span class="px-text">${hidden}${picture}</span>`;
}

/** Markup for a shape: squares hidden from screen readers, with no text. */
export function drawShape(shape: ShapeName): string {
  return svgOf(shapeBitmap(shape), `px px-shape px-${shape}`);
}

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_-]*$/;
const PERCENT_DECIMALS = 4;

/**
 * The CSS rule `@keyframes name` of the sideways slips of the whole picture (docs/SPEC.md 2.16 (4)):
 * still at the start of the cycle, `var(--arcade-shift)` to the right at each time in `atMs` for
 * `lengthMs`, still again after it. The keyframes hold each value until the next one (the animation
 * is given a stepping timing function), so a slip is a jump. A keyframe's place in the cycle is a
 * percentage, which a custom property cannot give; this is why the rule is written from the named
 * values. Refuses times that are not in order, overlap or run past the cycle.
 */
export function shiftKeyframes(name: string, shift: Shift): string {
  const { cycleMs, atMs, lengthMs } = shift;
  if (!IDENTIFIER.test(name)) throw new RangeError(`${JSON.stringify(name)} is not a name`);
  if (!(cycleMs > 0) || !Number.isFinite(cycleMs))
    throw new RangeError("the cycle is not a length");
  if (!(lengthMs > 0) || !Number.isFinite(lengthMs)) throw new RangeError("a shift has no length");
  atMs.forEach((at, index) => {
    const next = atMs[index + 1];
    if (!Number.isFinite(at) || at < 0 || at + lengthMs > cycleMs) {
      throw new RangeError(`a shift at ${at} ms does not fit in the cycle`);
    }
    if (next !== undefined && at + lengthMs > next) {
      throw new RangeError(`the shifts at ${at} ms and ${next} ms are out of order or overlap`);
    }
  });
  const percent = (ms: number): number => Number(((ms / cycleMs) * 100).toFixed(PERCENT_DECIMALS));
  const stops: Array<readonly [number, boolean]> = [];
  if (atMs[0] !== 0) stops.push([0, false]);
  for (const at of atMs) stops.push([percent(at), true], [percent(at + lengthMs), false]);
  if (stops[stops.length - 1]?.[0] !== 100) stops.push([100, false]);
  const rules = stops
    .map(
      ([at, shifted]) => `${at}%{transform:translateX(${shifted ? "var(--arcade-shift)" : "0"})}`,
    )
    .join("");
  return `@keyframes ${name}{${rules}}`;
}
