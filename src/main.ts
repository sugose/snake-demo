/**
 * The page (docs/SPEC.md 2, 3): wires the game rules, the input mapping and the best score to the
 * canvas, the tick timer, the keys, swipes and buttons, and the page's visibility. No game logic
 * lives here; it is covered by the browser tests in `e2e/`.
 */
import "./style.css";
import { config } from "./config";
import {
  type Cell,
  type Chooser,
  type Direction,
  type GameState,
  ignoredBecause,
  levelDelay,
  newGame,
  pauseIfRunning,
  type SpecialRules,
  type Status,
  specialInfo,
  start,
  tick,
  togglePause,
  turn,
} from "./game";
import { keyToCommand, type Point, swipeToDirection } from "./input";
import {
  firstLine,
  type Input,
  type Log,
  logEnd,
  logInput,
  logPage,
  logPanelPause,
  logPanelResume,
  logScores,
  logSlow,
  logTick,
  type Stamp,
  startLog,
} from "./log";
import { panelText } from "./logsum";
import {
  COLUMN_GAP,
  chooseScale,
  drawShape,
  drawText,
  layoutColumns,
  MARKER_LEAD,
  shiftKeyframes,
  textColumns,
} from "./pixel";
import { firstSlowFactor, readQuery, stepSlowFactor } from "./query";
import {
  confirmEntry,
  createScoreBook,
  listAsShown,
  qualifyingRank,
  rankText,
  type ScoreRules,
  startName,
  stepLetter,
} from "./scores";
import { sha256 } from "./sha256";
import { endText, waitingText } from "./status";
import { readBest, writeBest } from "./storage";

const {
  gridSize,
  startLength,
  minSwipe,
  storageKey,
  dotsPerLevel,
  firstDelay,
  delayStep,
  shortestDelay,
  clearAhead,
  specialEvery,
  shieldLayers,
  maxTurns,
  specialSeconds,
  jumpSeconds,
  clearAheadOfHead,
  bannerBlinkMs,
  bannerMs,
  copiedMs,
  maxStartLevel,
  slowFactors,
  slowButtonSize,
  scoreEntries,
  nameLetters,
  scoresStorageKey,
  pixelScales,
  bandHeight,
  rollMs,
  shiftPixels,
  shiftMs,
  shiftCycleMs,
  shiftAtMs,
  cursorMs,
  scanlineHeight,
  scanlinePitch,
  scanlineOpacityPercent,
  glowBlur,
  bandWhitePercent,
} = config;
/**
 * The best score's bound (docs/SPEC.md 2.9 (3)): at most one level per 5 cells of the board can be
 * cleared, and no level gives more than the dots of a normal level or the turns and seconds of a
 * special one.
 */
const maxScore =
  ((gridSize * gridSize) / dotsPerLevel) * Math.max(dotsPerLevel, maxTurns + specialSeconds);
/** The high score list's bounds (docs/SPEC.md 2.15 (1)): the best score's bound, and a level per 5 cells plus 1. */
const scoreRules: ScoreRules = {
  entries: scoreEntries,
  nameLetters,
  maxScore,
  maxLevel: (gridSize * gridSize) / dotsPerLevel + 1,
};
const SCORES_TITLE = `TOP ${scoreEntries} SCORES`;
const delays = { first: firstDelay, step: delayStep, shortest: shortestDelay };
const special: SpecialRules = {
  every: specialEvery,
  shieldLayers,
  maxTurns,
  seconds: specialSeconds,
  jumpSeconds,
  clearAheadOfHead,
  delays,
};
const delayOfLevel = (level: number): number =>
  levelDelay(level, { ...delays, every: specialEvery });

/**
 * The playtest options, read once when the page loads (docs/SPEC.md 2.14): a later change of the
 * address does nothing.
 */
const options = readQuery(window.location.search, maxStartLevel);

const PLAY = "Arrow keys, W A S D, a swipe or Start to play";

/** The one-line status for each state (docs/SPEC.md 2.5, 2.8, 2.10 (3), 2.12 (10)). */
const STATUS_TEXT: Readonly<Record<Status, (state: GameState) => string>> = {
  ready: ({ level, run }) =>
    run === null
      ? `Level ${level}. ${PLAY}`
      : `Level ${level}, special: ${maxTurns} turns, ${specialSeconds} seconds, shield of ${shieldLayers}. ${PLAY}`,
  running: (state) => (state.run?.waiting ? waitingText(state) : "Space or P to pause"),
  paused: () => "Paused. Space, P or Resume to go on",
  over: (state) => endText(state, entering !== null),
  blown: (state) => endText(state, entering !== null),
  won: (state) => endText(state, entering !== null),
};

/** The gap around a snake or obstacle cell, as a share of the cell, so the cells read as separate. */
const CELL_GAP = 0.08;

/** The heading mark on the head (docs/SPEC.md 2.11 (3)): a triangle pointing the way it will go. */
const MARK_LENGTH = 0.4;
const MARK_HALF_WIDTH = 0.3;
const MARK_AXIS: Readonly<Record<Direction, Point>> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

function element<T extends HTMLElement>(id: string, type: { new (): T; name: string }): T {
  const found = document.getElementById(id);
  if (!(found instanceof type)) throw new Error(`index.html has no ${type.name} with id "${id}"`);
  return found;
}

const root = element("game", HTMLElement);
const canvas = element("board", HTMLCanvasElement);
const levelText = element("level", HTMLElement);
const scoreText = element("score", HTMLElement);
const bestText = element("best", HTMLElement);
const specialRow = element("special", HTMLElement);
const turnsText = element("turns-left", HTMLElement);
const secondsText = element("seconds-left", HTMLElement);
const shieldText = element("shield-left", HTMLElement);
const statusText = element("status", HTMLElement);
const banner = element("banner", HTMLElement);
const startButton = element("start", HTMLButtonElement);
const pauseButton = element("pause", HTMLButtonElement);
const newGameButton = element("new-game", HTMLButtonElement);
const logLink = element("log-link", HTMLButtonElement);
const scoresLink = element("scores-link", HTMLButtonElement);
const slowRow = element("slow-row", HTMLElement);
const slowButton = element("slow", HTMLButtonElement);
const logPanel = element("log-panel", HTMLElement);
const logTextBox = element("log-text", HTMLElement);
const logCopy = element("log-copy", HTMLButtonElement);
const logLive = element("log-live", HTMLElement);
const logClose = element("log-close", HTMLButtonElement);
const entryPanel = element("entry-panel", HTMLElement);
const entryTitle = element("entry-title", HTMLElement);
const entryScore = element("entry-score", HTMLElement);
const entryLevel = element("entry-level", HTMLElement);
const entryRank = element("entry-rank", HTMLElement);
const entrySlots = element("entry-slots", HTMLElement);
const entryOk = element("entry-ok", HTMLButtonElement);
const entrySkip = element("entry-skip", HTMLButtonElement);
const scoresPanel = element("scores-panel", HTMLElement);
const scoresRows = element("scores-rows", HTMLElement);
const scoresEmpty = element("scores-empty", HTMLElement);
const scoresClose = element("scores-close", HTMLButtonElement);
const frame = canvas.parentElement;
if (frame === null) throw new Error("the board has no frame");
const drawing = canvas.getContext("2d");
if (drawing === null) throw new Error("the browser gives no 2D canvas");
const context: CanvasRenderingContext2D = drawing;

// The arcade look of the two score panels (docs/SPEC.md 2.16): every text of the page's markup that
// carries `data-px` is drawn as pixels, and the look's named values go to the CSS as custom properties.

/** Replaces the content of `target` with `text` drawn as pixels, the text kept in a visually hidden element. */
function drawInto(target: HTMLElement, text: string): void {
  target.innerHTML = drawText(text);
}

for (const target of document.querySelectorAll<HTMLElement>("[data-px]")) {
  drawInto(target, target.dataset.px ?? "");
}
drawInto(element("scores-title", HTMLElement), SCORES_TITLE);

const LOOK: Readonly<Record<string, string>> = {
  "--arcade-band-height": `${bandHeight}px`,
  "--arcade-roll": `${rollMs}ms`,
  "--arcade-shift": `${shiftPixels}px`,
  "--arcade-shift-cycle": `${shiftCycleMs}ms`,
  "--arcade-cursor": `${cursorMs}ms`,
  "--arcade-scan-height": `${scanlineHeight}px`,
  "--arcade-scan-pitch": `${scanlinePitch}px`,
  "--arcade-scan-opacity": `${scanlineOpacityPercent}%`,
  "--arcade-glow": `${glowBlur}px`,
  "--arcade-band-white": `${bandWhitePercent}%`,
  "--arcade-gap": String(COLUMN_GAP),
  "--arcade-lead": String(MARKER_LEAD),
};
for (const [name, value] of Object.entries(LOOK)) root.style.setProperty(name, value);

// A keyframe's place in the cycle is a percentage, which a custom property cannot give.
const shiftRule = document.createElement("style");
shiftRule.textContent = shiftKeyframes("arcade-shift", {
  cycleMs: shiftCycleMs,
  atMs: shiftAtMs,
  lengthMs: shiftMs,
});
document.head.append(shiftRule);

/** The widest the entry or the table gets, in pixels at scale 1: the longest title, the facts or the table. */
const WIDEST = Math.max(
  textColumns([...(entryTitle.dataset.px ?? "")].length),
  textColumns([...SCORES_TITLE].length),
  layoutColumns(
    [
      ["SCORE", String(maxScore)],
      ["LVL", String(scoreRules.maxLevel)],
      ["RANK", rankText(scoreEntries)],
    ],
    COLUMN_GAP,
  ),
  layoutColumns(
    [
      ["RANK", "SCORE", "LVL", "NAME"],
      [
        rankText(scoreEntries),
        String(maxScore),
        String(scoreRules.maxLevel),
        "M".repeat(nameLetters),
      ],
    ],
    COLUMN_GAP,
    MARKER_LEAD,
  ),
);

/** The largest scale at which the widest of the entry and the table is no wider than the board. */
function chooseLookScale(boardWidth: number): void {
  root.style.setProperty("--arcade-scale", String(chooseScale(WIDEST, boardWidth, pixelScales)));
}

/** The one chooser of docs/SPEC.md 2.3 and 2.11: the start, each obstacle and the dot. */
const choose: Chooser = (count) => Math.floor(Math.random() * count);
/** A new game, at the start level of a playtest page (docs/SPEC.md 2.1 (2), 2.14 (2)). */
const freshGame = (): GameState =>
  newGame({
    size: gridSize,
    startLength,
    clearAhead,
    dotsPerLevel,
    startLevel: options.startLevel ?? undefined,
    special,
    choose,
  });
const getStore = (): Storage => window.localStorage;

const scoreBook = createScoreBook(getStore, scoresStorageKey, scoreRules);

let state = freshGame();
let best = readBest(getStore, storageKey, maxScore);

// The event log of the current game (docs/SPEC.md 2.13).
const LOG_VALUES = { size: gridSize, startLength, clearAhead, dotsPerLevel, delays, special };
const FIRST_LINE = firstLine(__BUILD__, LOG_VALUES, options);
let gameMadeAt = performance.now();
let ticks = 0;
let log: Log = startLog(FIRST_LINE, { t: 0, k: 0 }, state, LOG_VALUES);
const stamp = (): Stamp => ({ t: performance.now() - gameMadeAt, k: ticks });
const ended = (game: GameState): boolean =>
  game.status === "over" || game.status === "blown" || game.status === "won";

/** The first of the Slow button's factors, the one a level or a game starts at (docs/SPEC.md 2.14 (5)). */
const firstFactor = firstSlowFactor(slowFactors);
let factor = firstFactor;

/** Makes a new game by the New game command and starts its log (docs/SPEC.md 2.13 (1), (4)). */
function newGameWithLog(input: Input): GameState {
  const game = freshGame();
  factor = firstFactor;
  gameMadeAt = performance.now();
  ticks = 0;
  log = startLog(FIRST_LINE, { t: 0, k: 0 }, game, LOG_VALUES, input);
  const closesPanel = logOpen() || scoresOpen();
  hideLog();
  hideScores();
  entering = null;
  entryPanel.hidden = true;
  // The New game command that closes the log panel or the scores panel puts the focus on the
  // New game button (docs/SPEC.md 2.5).
  if (closesPanel) newGameButton.focus();
  return game;
}
let timer: number | undefined;
let bannerTimers: { blink: number; end: number } | undefined;

/** Starts the blinking "Special Level" text (docs/SPEC.md 2.12 (11)). */
function showBanner(): void {
  hideBanner();
  banner.hidden = false;
  const blink = window.setInterval(() => {
    banner.hidden = !banner.hidden;
  }, bannerBlinkMs);
  const end = window.setTimeout(hideBanner, bannerMs);
  bannerTimers = { blink, end };
}

function hideBanner(): void {
  if (bannerTimers !== undefined) {
    window.clearInterval(bannerTimers.blink);
    window.clearTimeout(bannerTimers.end);
    bannerTimers = undefined;
  }
  banner.hidden = true;
}

/** Makes `next` the game state: saves a new best score, starts or stops the timer, redraws. */
function apply(next: GameState): void {
  const justEnded = next.status !== state.status && ended(next);
  const enteredSpecial = next.run !== null && next.status === "ready" && next.level !== state.level;
  // A level laid out starts at the first factor (docs/SPEC.md 2.14 (5)).
  if (next.level !== state.level) factor = firstFactor;
  state = next;
  if (enteredSpecial) showBanner();
  else if (state.status !== "ready" || state.run === null) hideBanner();
  // A playtest page leaves the best score as it was (docs/SPEC.md 2.9 (2), 2.14 (4)).
  const madeBest = justEnded && !options.playtest && state.score > best;
  if (madeBest) {
    best = state.score;
    writeBest(getStore, storageKey, best, maxScore);
  }
  if (justEnded) {
    log = logEnd(log, stamp(), state, madeBest);
    askForName();
  }
  syncTimer();
  render();
}

/**
 * The tick timer runs only while the game is `running`. It schedules each tick when the one before
 * it has run, and when the game starts or goes on from `paused`, with the delay of the level times
 * the factor of that moment; a tick already waiting keeps its delay, so a press of the Slow button
 * changes the delay of the ticks scheduled after it (docs/SPEC.md 2.2, 2.10 (2), 2.12 (2), 2.14 (6)).
 */
function syncTimer(): void {
  if (state.status !== "running") {
    if (timer !== undefined) window.clearTimeout(timer);
    timer = undefined;
    return;
  }
  if (timer === undefined) timer = window.setTimeout(onTick, delayOfLevel(state.level) * factor);
}

/** One tick of the timer: the game moves on, and the log notes it (docs/SPEC.md 2.13 (2)). */
function onTick(): void {
  timer = undefined;
  ticks++;
  const before = state;
  const after = tick(before, choose);
  log = logTick(log, stamp(), before, after);
  apply(after);
}

/** An input that makes a line in the log, and what it does (docs/SPEC.md 2.13 (4)). */
function onInput(
  input: Input,
  next: GameState,
  ignored: ReturnType<typeof ignoredBecause> | "repeat" | null,
): void {
  const before = state;
  log = logInput(log, stamp(), input, ignored, before, next);
  apply(next);
}

const logOpen = (): boolean => !logPanel.hidden;

/** True from an opening that paused a running game until the panel closes (docs/SPEC.md 2.13 (6)). */
let pausedByLog = false;
/** Counts openings and closings of the panel, so a copy that finishes later can tell (2.13 (6)). */
let panelSession = 0;
let copiedTimer: number | undefined;

/** The Copy button back to its plain look and text, and the live region emptied (2.13 (6)). */
function resetCopied(): void {
  if (copiedTimer !== undefined) {
    window.clearTimeout(copiedTimer);
    copiedTimer = undefined;
  }
  logCopy.classList.remove("copied");
  logCopy.textContent = "Copy";
  logLive.textContent = "";
}

/**
 * Opens the log panel over the board, in every state of the game (docs/SPEC.md 2.13 (6)). A running
 * game is paused first, and the panel shows the log after that pause, then its checksum line, made
 * now and not kept (2.13 (7)).
 */
function openLog(): void {
  if (anyPanelOpen()) return;
  panelSession++;
  resetCopied();
  if (state.status === "running") {
    pausedByLog = true;
    log = logPanelPause(log, stamp());
    apply(pauseIfRunning(state));
  }
  logTextBox.textContent = panelText(log.lines, sha256);
  keysBlocked = new Set(keysDown);
  logPanel.hidden = false;
  logClose.focus();
}

/** Hides the panel; the game is left as it is. */
function hideLog(): void {
  panelSession++;
  resetCopied();
  pausedByLog = false;
  logPanel.hidden = true;
}

/** Close and Escape: hides the panel and goes on, but only if opening it paused the game. */
function closeLog(): void {
  const goOn = pausedByLog && state.status === "paused";
  hideLog();
  logLink.focus();
  if (goOn) {
    log = logPanelResume(log, stamp());
    apply(togglePause(state));
  }
}

/**
 * Copy: the text the panel showed to the clipboard, with "✓ Copied!" for `copiedMs` after it; if the
 * browser refuses, no feedback and the text selected (docs/SPEC.md 2.13 (6)). A copy that finishes
 * after the panel closed or opened again does nothing.
 */
async function copyLog(): Promise<void> {
  const session = panelSession;
  logLive.textContent = "";
  let copied = false;
  try {
    await navigator.clipboard.writeText(logTextBox.textContent ?? "");
    copied = true;
  } catch {
    copied = false;
  }
  if (session !== panelSession) return;
  resetCopied();
  if (copied) {
    logCopy.classList.add("copied");
    logCopy.textContent = "✓ Copied!";
    logLive.textContent = "Copied";
    copiedTimer = window.setTimeout(resetCopied, copiedMs);
    return;
  }
  const range = document.createRange();
  range.selectNodeContents(logTextBox);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

// The high score list: the name entry, the table and their panels (docs/SPEC.md 2.15).

/** The name being entered: the game's score and level, the letters and the selected slot. */
interface Entering {
  readonly score: number;
  readonly level: number;
  name: string;
  selected: number;
}
/** Not `null` while the name entry is open. */
let entering: Entering | null = null;
/** True from an opening of the table that paused a running game until the panel closes (2.15 (5)). */
let pausedByScores = false;

const scoresOpen = (): boolean => !scoresPanel.hidden;
/** Only one panel is open at a time: the log panel, the name entry or the table (2.13 (6), 2.15). */
const anyPanelOpen = (): boolean => logOpen() || entering !== null || scoresOpen();

/** The keys that are down now, by `KeyboardEvent.code`, and those that were down when a panel opened. */
const keysDown = new Set<string>();
let keysBlocked = new Set<string>();
const keyId = (event: KeyboardEvent): string => event.code || event.key;

function makeButton(className: string, drawn: string, label: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.innerHTML = drawn;
  button.setAttribute("aria-label", label);
  return button;
}

/** The slots of the name entry: each a letter button with an Up and a Down button (2.15 (4)). */
const slotButtons: HTMLButtonElement[] = [];
for (let index = 0; index < nameLetters; index++) {
  const column = document.createElement("div");
  column.className = "slot-column";
  const up = makeButton("slot-step", drawShape("arrowUp"), `Letter ${index + 1} up`);
  const letter = makeButton("slot", "", `Letter ${index + 1}, A`);
  const down = makeButton("slot-step", drawShape("arrowDown"), `Letter ${index + 1} down`);
  up.addEventListener("click", () => changeLetter(index, 1, up));
  down.addEventListener("click", () => changeLetter(index, -1, down));
  letter.addEventListener("click", () => selectSlot(index));
  column.append(up, letter, down);
  entrySlots.append(column);
  slotButtons.push(letter);
}

/** Shows the letters and the selection of the name being entered. */
function renderEntry(): void {
  if (entering === null) return;
  const current = entering;
  slotButtons.forEach((button, index) => {
    const letter = current.name[index] ?? "A";
    const selected = index === current.selected;
    // The cursor block sits behind the letter of the selected slot (docs/SPEC.md 2.16 (1)).
    const cursor = selected ? `<span class="slot-cursor">${drawShape("cursor")}</span>` : "";
    button.innerHTML = `<span class="slot-face">${cursor}${drawText(letter)}</span>`;
    button.setAttribute("aria-label", `Letter ${index + 1}, ${letter}`);
    if (index === current.selected) button.setAttribute("aria-current", "true");
    else button.removeAttribute("aria-current");
  });
}

/** Selects a slot and gives it the focus (2.15 (4)). */
function selectSlot(index: number): void {
  if (entering === null) return;
  entering.selected = index;
  renderEntry();
  slotButtons[index]?.focus();
}

/**
 * Changes the letter of a slot, which a press on its Up or Down button selects first; the focus
 * stays on the button pressed (2.15 (4)).
 */
function changeLetter(index: number, delta: 1 | -1, pressed: HTMLElement): void {
  if (entering === null) return;
  entering.selected = index;
  entering.name = stepLetter(entering.name, index, delta);
  renderEntry();
  pressed.focus();
}

/** Opens the name entry for the game that has just ended, with the rank it would have (2.15 (4)). */
function openEntry(rank: number): void {
  entering = { score: state.score, level: state.level, name: startName(scoreRules), selected: 0 };
  drawInto(entryScore, String(entering.score));
  drawInto(entryLevel, String(entering.level));
  drawInto(entryRank, rankText(rank));
  keysBlocked = new Set(keysDown);
  entryPanel.hidden = false;
  renderEntry();
  slotButtons[0]?.focus();
}

/**
 * A game that has ended on a page that is not a playtest page asks for a name when it qualifies
 * (2.15 (3)). The list is read now, with the best score as it is (2.15 (6)); the opening of the entry
 * is the same moment, so one read serves both.
 */
function askForName(): void {
  if (options.playtest) return;
  const rank = qualifyingRank(
    scoreBook.read(),
    { score: state.score, level: state.level },
    best,
    scoreRules,
  );
  if (rank !== null) openEntry(rank);
}

/** Closes the name entry and gives the focus to the New game button (2.15 (4)). */
function closeEntry(): void {
  entering = null;
  entryPanel.hidden = true;
  newGameButton.focus();
}

/** Skip and Escape: nothing is stored, the entry closes (2.15 (4)). */
function skipEntry(): void {
  if (entering === null) return;
  log = logScores(log, stamp(), { kind: "skipped" });
  closeEntry();
  render();
}

/**
 * OK and Enter: the list is read again, so that the entries another tab stored in the meantime are
 * kept, and the entry is stored or found no longer to fit; the panel then turns into the table
 * (2.15 (4), (6)).
 */
function confirmName(): void {
  if (entering === null) return;
  const { score, level, name } = entering;
  const fresh = scoreBook.read();
  const result = confirmEntry(fresh, { score, level, name }, best, scoreRules);
  entering = null;
  entryPanel.hidden = true;
  if (result.kind === "stored") {
    scoreBook.write(result.stored);
    log = logScores(log, stamp(), { kind: "name", name, rank: result.rank });
    showTable(result.stored, result.rank);
  } else {
    log = logScores(log, stamp(), { kind: "full", name });
    showTable(fresh, null);
  }
  render();
}

/** Fills the table from `entries` and the best score, marking the row of `rank` (2.15 (5)). */
function fillTable(entries: Parameters<typeof listAsShown>[0], rank: number | null): void {
  const { list } = listAsShown(entries, null, best, scoreRules);
  scoresRows.replaceChildren(
    ...list.map((entry, index) => {
      const row = document.createElement("tr");
      if (rank === index + 1) row.setAttribute("aria-current", "true");
      const texts = [
        rankText(index + 1),
        String(entry.score),
        entry.level === 0 ? "--" : String(entry.level),
        entry.name,
      ];
      texts.forEach((text, column) => {
        const cell = document.createElement("td");
        // The triangle that marks the new entry's row stands before its rank (docs/SPEC.md 2.15 (5)).
        const marker = column === 0 && rank === index + 1 ? drawShape("marker") : "";
        cell.innerHTML = marker + drawText(text);
        row.append(cell);
      });
      return row;
    }),
  );
  scoresEmpty.hidden = list.length > 0;
}

/** Shows the table, with the focus on Close (2.15 (5)). */
function showTable(entries: Parameters<typeof listAsShown>[0], rank: number | null): void {
  fillTable(entries, rank);
  keysBlocked = new Set(keysDown);
  scoresPanel.hidden = false;
  scoresClose.focus();
}

/**
 * Opens the table over the board, in every state of the game, from the Scores link. A running game is
 * paused first (2.15 (5)). The list is read as it is now.
 */
function openScores(): void {
  if (anyPanelOpen()) return;
  if (state.status === "running") {
    pausedByScores = true;
    log = logPanelPause(log, stamp(), "scores");
    apply(pauseIfRunning(state));
  }
  showTable(scoreBook.read(), null);
}

/** Hides the table; the game is left as it is. */
function hideScores(): void {
  pausedByScores = false;
  scoresPanel.hidden = true;
}

/**
 * Close, Escape and Enter: hides the table, gives the focus to the New game button and goes on, but
 * only if opening it paused the game (2.15 (5)).
 */
function closeScores(): void {
  const goOn = pausedByScores && state.status === "paused";
  hideScores();
  newGameButton.focus();
  if (goOn) {
    log = logPanelResume(log, stamp(), "scores");
    apply(togglePause(state));
  }
}

/** Keeps Tab inside the name entry's dialog (2.15 (4)). */
function keepFocusInEntry(event: KeyboardEvent): void {
  const buttons = [...entryPanel.querySelectorAll("button")];
  const first = buttons[0];
  const last = buttons[buttons.length - 1];
  const active = document.activeElement;
  const outside = !(active instanceof HTMLElement) || !entryPanel.contains(active);
  if (outside || (event.shiftKey && active === first)) {
    event.preventDefault();
    (event.shiftKey ? last : first)?.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first?.focus();
  }
}

const hasModifier = (event: KeyboardEvent): boolean =>
  event.ctrlKey || event.metaKey || event.altKey;

/**
 * The keys while the name entry is open (docs/SPEC.md 2.15 (4)): arrows change the letter or move the
 * selection, Enter confirms (or presses the focused button other than a slot), Space presses the
 * focused button other than a slot, Escape skips. A key already down when the entry opened does
 * nothing until it is released, and a repeat of Enter, Space or Escape does nothing.
 */
function entryKey(event: KeyboardEvent): void {
  if (keysBlocked.has(keyId(event))) {
    event.preventDefault();
    return;
  }
  if (hasModifier(event) || entering === null) return;
  const active = document.activeElement;
  const onButton =
    active instanceof HTMLButtonElement &&
    entryPanel.contains(active) &&
    !slotButtons.includes(active);
  switch (event.key) {
    case "Escape":
      event.preventDefault();
      if (!event.repeat) skipEntry();
      return;
    case "ArrowUp":
    case "ArrowDown":
      event.preventDefault();
      entering.name = stepLetter(
        entering.name,
        entering.selected,
        event.key === "ArrowUp" ? 1 : -1,
      );
      renderEntry();
      return;
    case "ArrowLeft":
    case "ArrowRight": {
      event.preventDefault();
      const next = Math.min(
        nameLetters - 1,
        Math.max(0, entering.selected + (event.key === "ArrowRight" ? 1 : -1)),
      );
      if (next !== entering.selected) selectSlot(next);
      return;
    }
    case "Enter":
    case " ":
      event.preventDefault();
      if (event.repeat) return;
      if (onButton) active.click();
      else if (event.key === "Enter") confirmName();
      return;
    case "Tab":
      keepFocusInEntry(event);
      return;
    default:
  }
}

/**
 * The keys while the table is open (docs/SPEC.md 2.15 (5)): Escape and Enter close it, Space presses
 * the focused Close, Tab stays on Close, and no game key does anything. A key already down when it
 * opened does nothing until it is released, and a repeat of Enter, Space or Escape does nothing.
 */
function scoresKey(event: KeyboardEvent): void {
  if (keysBlocked.has(keyId(event))) {
    event.preventDefault();
    return;
  }
  if (hasModifier(event)) return;
  switch (event.key) {
    case "Escape":
    case "Enter":
      event.preventDefault();
      if (!event.repeat) closeScores();
      return;
    case " ":
      event.preventDefault();
      if (!event.repeat && document.activeElement === scoresClose) closeScores();
      return;
    case "Tab":
      event.preventDefault();
      scoresClose.focus();
      return;
    case "ArrowUp":
    case "ArrowDown":
    case "ArrowLeft":
    case "ArrowRight":
      event.preventDefault();
      return;
    default:
  }
}

/**
 * Tab and Shift+Tab in the log panel (docs/SPEC.md 2.13 (6)): between Copy and Close, and with
 * two buttons each leads to the other; from outside the panel Tab goes to Copy and Shift+Tab to
 * Close. The log's text is never reached, so it is not a Tab stop.
 */
function keepFocusInLog(event: KeyboardEvent): void {
  const active = document.activeElement;
  event.preventDefault();
  if (active === logCopy) logClose.focus();
  else if (active === logClose) logCopy.focus();
  else (event.shiftKey ? logClose : logCopy).focus();
}

const KEY_NAMES: Readonly<Record<string, string>> = { " ": "Space" };
const COMMAND_WORDS = { pause: "pause", newGame: "new" } as const;

const cellText = (cell: Cell): string => `${cell.x},${cell.y}`;

/** True while all the snake's segments share one cell, as on a freshly laid-out level. */
function onOneCell(snake: readonly Cell[]): boolean {
  const head = snake[0];
  return head !== undefined && snake.every((part) => part.x === head.x && part.y === head.y);
}

function render(): void {
  const head = state.snake[0];
  root.dataset.status = state.status;
  root.dataset.level = String(state.level);
  root.dataset.delay = String(delayOfLevel(state.level));
  if (options.slow) root.dataset.factor = String(factor);
  const info = specialInfo(state);
  root.dataset.special = String(info !== null);
  root.dataset.waiting = String(state.run?.waiting ?? false);
  root.dataset.score = String(state.score);
  root.dataset.best = String(best);
  root.dataset.head = head === undefined ? "" : cellText(head);
  root.dataset.heading = state.heading;
  root.dataset.length = String(state.snake.length);
  root.dataset.snake = state.snake.map(cellText).join(";");
  root.dataset.obstacles = state.obstacles.map(cellText).join(";");
  levelText.textContent = String(state.level);
  scoreText.textContent = String(state.score);
  bestText.textContent = String(best);
  statusText.textContent = STATUS_TEXT[state.status](state);
  specialRow.hidden = info === null;
  // The Slow button is shown only on a special level (docs/SPEC.md 2.14 (5)).
  slowRow.hidden = !options.slow || info === null;
  // A hidden Slow button gives up the focus at once, so Space then pauses (docs/SPEC.md 2.6).
  if (slowRow.hidden && document.activeElement === slowButton) slowButton.blur();
  if (info !== null) {
    turnsText.textContent = String(info.turnsLeft);
    secondsText.textContent = String(info.secondsLeft);
    shieldText.textContent = String(info.shieldLeft);
  }
  pauseButton.textContent = state.status === "paused" ? "Resume" : "Pause";
  draw();
}

function draw(): void {
  const side = canvas.width;
  const cell = side / gridSize;
  const style = getComputedStyle(canvas);
  const colour = (name: string): string => style.getPropertyValue(name).trim();
  const gap = Math.max(1, Math.round(cell * CELL_GAP));
  const square = (at: Cell): void => {
    context.fillRect(at.x * cell + gap, at.y * cell + gap, cell - 2 * gap, cell - 2 * gap);
  };
  context.clearRect(0, 0, side, side);

  if (state.food !== null) {
    context.fillStyle = colour("--food");
    context.beginPath();
    context.arc(
      (state.food.x + 0.5) * cell,
      (state.food.y + 0.5) * cell,
      cell * (0.5 - CELL_GAP),
      0,
      2 * Math.PI,
    );
    context.fill();
  }

  context.fillStyle = colour("--obstacle");
  for (const obstacle of state.obstacles) square(obstacle);

  // Tail first, so the head is drawn on top where segments share a cell.
  for (let index = state.snake.length - 1; index >= 0; index--) {
    const part = state.snake[index];
    if (part === undefined) continue;
    context.fillStyle = colour(index === 0 ? "--head" : "--snake");
    square(part);
  }

  const head = state.snake[0];
  if (head !== undefined && onOneCell(state.snake)) {
    const axis = MARK_AXIS[state.heading];
    const centreX = (head.x + 0.5) * cell;
    const centreY = (head.y + 0.5) * cell;
    const across = { x: -axis.y * MARK_HALF_WIDTH * cell, y: axis.x * MARK_HALF_WIDTH * cell };
    context.fillStyle = colour("--mark");
    context.beginPath();
    context.moveTo(centreX + axis.x * MARK_LENGTH * cell, centreY + axis.y * MARK_LENGTH * cell);
    context.lineTo(centreX + across.x, centreY + across.y);
    context.lineTo(centreX - across.x, centreY - across.y);
    context.closePath();
    context.fill();
  }
}

/**
 * Sizes the canvas to its frame, whose width the style sheet caps. The canvas gets a whole number
 * of device pixels per cell and one canvas pixel per device pixel, so it is crisp on high-density
 * screens.
 */
function sizeBoard(container: HTMLElement): void {
  const ratio = window.devicePixelRatio || 1;
  const cellPixels = Math.max(1, Math.floor((container.clientWidth * ratio) / gridSize));
  const side = cellPixels * gridSize;
  const cssSide = `${side / ratio}px`;
  chooseLookScale(side / ratio);
  if (canvas.width === side && canvas.style.width === cssSide) return;
  canvas.width = side;
  canvas.height = side;
  canvas.style.width = cssSide;
  canvas.style.height = cssSide;
  // The Slow button sits at the board's right edge (docs/SPEC.md 2.14 (5)).
  slowRow.style.width = cssSide;
  draw();
}

// Keys (docs/SPEC.md 2.5, 2.6), whichever button has the focus.
document.addEventListener("keydown", (event) => {
  keysDown.add(keyId(event));
  // Ctrl, Meta and Alt with Enter or Space press no button, in a panel or out of it: the browser's
  // own click, which Chromium fires on the key-up of Space, is stopped (docs/SPEC.md 2.6).
  if (
    hasModifier(event) &&
    (event.key === "Enter" || event.key === " ") &&
    document.activeElement instanceof HTMLButtonElement
  ) {
    event.preventDefault();
  }
  if (entering !== null) {
    entryKey(event);
    return;
  }
  if (scoresOpen()) {
    scoresKey(event);
    return;
  }
  // While the log panel is open, Escape closes it and a new game closes it too; other game keys do
  // nothing and make no line (docs/SPEC.md 2.13 (4), (6)).
  if (logOpen() && event.key === "Escape") {
    event.preventDefault();
    closeLog();
    return;
  }
  if (logOpen() && event.key === "Tab" && !hasModifier(event)) {
    keepFocusInLog(event);
    return;
  }
  // Enter or Space on a focused button does that button's job (docs/SPEC.md 2.6): the page presses
  // it itself, once, and stops the browser's own click. A repeat, a key that was already down when
  // the focus arrived, and Ctrl, Meta or Alt press nothing. With the log panel open a button
  // outside it counts as no button: the key goes on as the command it is.
  const focused = document.activeElement;
  if ((event.key === "Enter" || event.key === " ") && focused instanceof HTMLButtonElement) {
    event.preventDefault();
    if (!logOpen() || logPanel.contains(focused)) {
      if (!hasModifier(event) && !event.repeat && !keysBlocked.has(keyId(event))) focused.click();
      return;
    }
  }
  const command = keyToCommand(event.key, {
    ctrl: event.ctrlKey,
    meta: event.metaKey,
    alt: event.altKey,
  });
  if (command === null) return;
  if (logOpen() && command.type !== "newGame") return;
  // While the log panel is open a repeat, or a key that was already down when it opened, does
  // nothing and makes no line (docs/SPEC.md 2.13 (4)); a held Enter that opened it from the focused
  // Log link would otherwise write a line for every repeat.
  if (logOpen() && (event.repeat || keysBlocked.has(keyId(event)))) {
    event.preventDefault();
    return;
  }
  // Keeps the arrows and Space from scrolling the page, and keeps a focused button from also
  // being pressed by a key that does something in the game.
  event.preventDefault();
  const key = KEY_NAMES[event.key] ?? event.key;
  if (command.type === "turn") {
    const ignored = ignoredBecause(state, command.direction);
    onInput(
      { kind: "key", key, command: command.direction },
      turn(state, command.direction),
      ignored,
    );
    return;
  }
  const input: Input = { kind: "key", key, command: COMMAND_WORDS[command.type] };
  // A held Space, P or Enter does not flip the pause, or start new games, again and again.
  if (event.repeat) {
    const ignoredByState = command.type === "pause" && togglePause(state) === state;
    onInput(input, state, ignoredByState ? "state" : "repeat");
    return;
  }
  if (command.type === "pause") {
    const next = togglePause(state);
    onInput(input, next, next === state ? "state" : null);
    return;
  }
  apply(newGameWithLog(input));
});

document.addEventListener("keyup", (event) => {
  keysDown.delete(keyId(event));
  keysBlocked.delete(keyId(event));
});
window.addEventListener("blur", () => {
  keysDown.clear();
  keysBlocked.clear();
});

// Swipes on the board (docs/SPEC.md 2.7). A mouse drag is not a swipe.
let swipeStart: { pointerId: number; point: Point } | null = null;
canvas.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "mouse") return;
  swipeStart = { pointerId: event.pointerId, point: { x: event.clientX, y: event.clientY } };
});
canvas.addEventListener("pointerup", (event) => {
  if (swipeStart === null || swipeStart.pointerId !== event.pointerId) return;
  const from = swipeStart.point;
  swipeStart = null;
  const direction = swipeToDirection(from, { x: event.clientX, y: event.clientY }, minSwipe);
  if (direction === null || anyPanelOpen()) return;
  onInput({ kind: "swipe", direction }, turn(state, direction), ignoredBecause(state, direction));
});
canvas.addEventListener("pointercancel", () => {
  swipeStart = null;
});

// Buttons (docs/SPEC.md 2.5, 2.7).
startButton.addEventListener("click", () => {
  if (anyPanelOpen()) return;
  const next = start(state);
  onInput({ kind: "button", label: "Start" }, next, next === state ? "state" : null);
});
pauseButton.addEventListener("click", () => {
  if (anyPanelOpen()) return;
  const next = togglePause(state);
  const label = pauseButton.textContent ?? "Pause";
  onInput({ kind: "button", label }, next, next === state ? "state" : null);
});
// The New game button does nothing while the name entry is open (docs/SPEC.md 2.5).
newGameButton.addEventListener("click", () => {
  if (entering !== null) return;
  apply(newGameWithLog({ kind: "button", label: "New game" }));
});
// The Slow button (docs/SPEC.md 2.14 (5)): steps the factor in `ready`, `running` and `paused`; in an
// ended game the press is ignored and logged so; with a panel open it does nothing.
slowButton.addEventListener("click", () => {
  if (anyPanelOpen()) return;
  if (ended(state)) {
    onInput({ kind: "button", label: "Slow" }, state, "state");
    return;
  }
  factor = stepSlowFactor(factor, slowFactors);
  log = logSlow(log, stamp(), factor);
  render();
});

// The event log's link and panel (docs/SPEC.md 2.13 (6)).
logLink.addEventListener("click", openLog);
// The high score list's links and buttons (docs/SPEC.md 2.15).
scoresLink.addEventListener("click", openScores);
scoresClose.addEventListener("click", closeScores);
entryOk.addEventListener("click", confirmName);
entrySkip.addEventListener("click", skipEntry);
logClose.addEventListener("click", closeLog);
logCopy.addEventListener("click", () => {
  void copyLog();
});

// A hidden page pauses a running game (docs/SPEC.md 2.5).
document.addEventListener("visibilitychange", () => {
  const hidden = document.visibilityState === "hidden";
  const next = hidden ? pauseIfRunning(state) : state;
  log = logPage(log, stamp(), hidden, state, next);
  apply(next);
});

// Size and colours follow the screen.
new ResizeObserver(() => sizeBoard(frame)).observe(frame);
window.addEventListener("resize", () => sizeBoard(frame));
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", draw);

root.style.setProperty("--slow-size", `${slowButtonSize}px`);
sizeBoard(frame);
render();
