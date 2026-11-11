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
  logSlow,
  logText,
  logTick,
  type Stamp,
  startLog,
} from "./log";
import { firstSlowFactor, readQuery, stepSlowFactor } from "./query";
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
} = config;
/**
 * The best score's bound (docs/SPEC.md 2.9 (3)): at most one level per 5 cells of the board can be
 * cleared, and no level gives more than the dots of a normal level or the turns and seconds of a
 * special one.
 */
const maxScore =
  ((gridSize * gridSize) / dotsPerLevel) * Math.max(dotsPerLevel, maxTurns + specialSeconds);
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
  over: endText,
  blown: endText,
  won: endText,
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
const slowRow = element("slow-row", HTMLElement);
const slowButton = element("slow", HTMLButtonElement);
const logPanel = element("log-panel", HTMLElement);
const logTextBox = element("log-text", HTMLElement);
const logCopy = element("log-copy", HTMLButtonElement);
const logLive = element("log-live", HTMLElement);
const logClose = element("log-close", HTMLButtonElement);
const frame = canvas.parentElement;
if (frame === null) throw new Error("the board has no frame");
const drawing = canvas.getContext("2d");
if (drawing === null) throw new Error("the browser gives no 2D canvas");
const context: CanvasRenderingContext2D = drawing;

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
  hideLog();
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
  if (justEnded) log = logEnd(log, stamp(), state, madeBest);
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
 * game is paused first, and the panel shows the log after that pause.
 */
function openLog(): void {
  if (logOpen()) return;
  panelSession++;
  resetCopied();
  if (state.status === "running") {
    pausedByLog = true;
    log = logPanelPause(log, stamp());
    apply(pauseIfRunning(state));
  }
  logTextBox.textContent = logText(log);
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
  // While the log panel is open, Escape closes it and a new game closes it too; other game keys do
  // nothing and make no line (docs/SPEC.md 2.13 (4), (6)).
  if (logOpen() && event.key === "Escape") {
    event.preventDefault();
    closeLog();
    return;
  }
  const command = keyToCommand(event.key, {
    ctrl: event.ctrlKey,
    meta: event.metaKey,
    alt: event.altKey,
  });
  if (command === null) return;
  if (logOpen() && command.type !== "newGame") return;
  // Keeps the arrows and Space from scrolling the page, and keeps a focused button from also
  // acting on Space or Enter (its click), so each key acts once.
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
  if (direction === null || logOpen()) return;
  onInput({ kind: "swipe", direction }, turn(state, direction), ignoredBecause(state, direction));
});
canvas.addEventListener("pointercancel", () => {
  swipeStart = null;
});

// Buttons (docs/SPEC.md 2.5, 2.7).
startButton.addEventListener("click", () => {
  if (logOpen()) return;
  const next = start(state);
  onInput({ kind: "button", label: "Start" }, next, next === state ? "state" : null);
});
pauseButton.addEventListener("click", () => {
  if (logOpen()) return;
  const next = togglePause(state);
  const label = pauseButton.textContent ?? "Pause";
  onInput({ kind: "button", label }, next, next === state ? "state" : null);
});
newGameButton.addEventListener("click", () =>
  apply(newGameWithLog({ kind: "button", label: "New game" })),
);
// The Slow button (docs/SPEC.md 2.14 (5)): steps the factor in `ready`, `running` and `paused`; in an
// ended game the press is ignored and logged so; with the log panel open it does nothing.
slowButton.addEventListener("click", () => {
  if (logOpen()) return;
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
