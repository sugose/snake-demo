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
  type EndReason,
  type GameState,
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

const PLAY = "Arrow keys, W A S D, a swipe or Start to play";

/** The reason an ended game gives, by why it ended (docs/SPEC.md 2.8). */
const END_REASON: Readonly<Record<EndReason, string>> = {
  wall: "Game over: you hit the wall.",
  obstacle: "Game over: you hit an obstacle.",
  self: "Game over: you ran into yourself.",
  turns: "Blown up: no turns left.",
  time: "Blown up: time ran out.",
  full: "You won! The board is full.",
  noRoom: "You won! There is no room for the next level.",
};

/** The status line of an ended game: its reason, then how to play again (docs/SPEC.md 2.8). */
function endText(state: GameState): string {
  const reason = state.ended === null ? "Game over." : END_REASON[state.ended];
  const crashed = state.ended === "wall" || state.ended === "obstacle";
  const noShield = crashed && state.run !== null ? " No shield left." : "";
  return `${reason}${noShield} Enter or New game to play again`;
}

/**
 * The status line while the snake waits after a shielded crash (docs/SPEC.md 2.12 (10)): the layers
 * left, and the two turns at right angles to the heading that go on.
 */
function waitingText(state: GameState): string {
  const left = specialInfo(state)?.shieldLeft ?? 0;
  const sides = state.heading === "up" || state.heading === "down" ? "left or right" : "up or down";
  const lost = `Shield lost, ${left === 0 ? "none" : left} left. Turn ${sides} to go on.`;
  return left === 0 ? `${lost} The next crash ends the game.` : lost;
}

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
const frame = canvas.parentElement;
if (frame === null) throw new Error("the board has no frame");
const drawing = canvas.getContext("2d");
if (drawing === null) throw new Error("the browser gives no 2D canvas");
const context: CanvasRenderingContext2D = drawing;

/** The one chooser of docs/SPEC.md 2.3 and 2.11: the start, each obstacle and the dot. */
const choose: Chooser = (count) => Math.floor(Math.random() * count);
const freshGame = (): GameState =>
  newGame({ size: gridSize, startLength, clearAhead, dotsPerLevel, special, choose });
const getStore = (): Storage => window.localStorage;

let state = freshGame();
let best = readBest(getStore, storageKey, maxScore);
let timer: { id: number; delay: number } | undefined;
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
  const ended =
    next.status !== state.status &&
    (next.status === "over" || next.status === "blown" || next.status === "won");
  const enteredSpecial = next.run !== null && next.status === "ready" && next.level !== state.level;
  state = next;
  if (enteredSpecial) showBanner();
  else if (state.status !== "ready" || state.run === null) hideBanner();
  if (ended && state.score > best) {
    best = state.score;
    writeBest(getStore, storageKey, best, maxScore);
  }
  syncTimer();
  render();
}

/**
 * The tick timer runs only while the game is `running`, with the delay of the current level
 * (docs/SPEC.md 2.2, 2.10 (2), 2.12 (2)); a timer with another level's delay is replaced.
 */
function syncTimer(): void {
  const delay = delayOfLevel(state.level);
  if (timer !== undefined && (state.status !== "running" || timer.delay !== delay)) {
    window.clearInterval(timer.id);
    timer = undefined;
  }
  if (state.status === "running" && timer === undefined) {
    timer = { id: window.setInterval(() => apply(tick(state, choose)), delay), delay };
  }
}

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
  draw();
}

// Keys (docs/SPEC.md 2.5, 2.6), whichever button has the focus.
document.addEventListener("keydown", (event) => {
  const command = keyToCommand(event.key, {
    ctrl: event.ctrlKey,
    meta: event.metaKey,
    alt: event.altKey,
  });
  if (command === null) return;
  // Keeps the arrows and Space from scrolling the page, and keeps a focused button from also
  // acting on Space or Enter (its click), so each key acts once.
  event.preventDefault();
  if (command.type === "turn") {
    apply(turn(state, command.direction));
    return;
  }
  // A held Space, P or Enter does not flip the pause, or start new games, again and again.
  if (event.repeat) return;
  apply(command.type === "pause" ? togglePause(state) : freshGame());
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
  if (direction !== null) apply(turn(state, direction));
});
canvas.addEventListener("pointercancel", () => {
  swipeStart = null;
});

// Buttons (docs/SPEC.md 2.5, 2.7).
startButton.addEventListener("click", () => apply(start(state)));
pauseButton.addEventListener("click", () => apply(togglePause(state)));
newGameButton.addEventListener("click", () => apply(freshGame()));

// A hidden page pauses a running game (docs/SPEC.md 2.5).
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") apply(pauseIfRunning(state));
});

// Size and colours follow the screen.
new ResizeObserver(() => sizeBoard(frame)).observe(frame);
window.addEventListener("resize", () => sizeBoard(frame));
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", draw);

sizeBoard(frame);
render();
