/**
 * The page (docs/SPEC.md 2, 3): wires the game rules, the input mapping and the best score to the
 * canvas, the tick timer, the keys, swipes and buttons, and the page's visibility. No game logic
 * lives here; it is covered by the browser tests in `e2e/`.
 */
import "./style.css";
import { config } from "./config";
import {
  type FoodChooser,
  type GameState,
  newGame,
  pauseIfRunning,
  type Status,
  start,
  tick,
  togglePause,
  turn,
} from "./game";
import { keyToCommand, type Point, swipeToDirection } from "./input";
import { readBest, writeBest } from "./storage";

const { gridSize, startLength, ticksPerSecond, minSwipe, storageKey } = config;
const maxScore = gridSize * gridSize;
const tickMilliseconds = 1000 / ticksPerSecond;

/** The one-line status for each state (docs/SPEC.md 2.5, 2.8). */
const STATUS_TEXT: Readonly<Record<Status, string>> = {
  ready: "Arrow keys, W A S D, a swipe or Start to play",
  running: "Space or P to pause",
  paused: "Paused. Space, P or Resume to go on",
  over: "Game over. Enter or New game to play again",
  won: "You won! Enter or New game to play again",
};

/** The gap around a snake cell, as a share of the cell, so the cells read as separate. */
const CELL_GAP = 0.08;

function element<T extends HTMLElement>(id: string, type: { new (): T; name: string }): T {
  const found = document.getElementById(id);
  if (!(found instanceof type)) throw new Error(`index.html has no ${type.name} with id "${id}"`);
  return found;
}

const root = element("game", HTMLElement);
const canvas = element("board", HTMLCanvasElement);
const scoreText = element("score", HTMLElement);
const bestText = element("best", HTMLElement);
const statusText = element("status", HTMLElement);
const startButton = element("start", HTMLButtonElement);
const pauseButton = element("pause", HTMLButtonElement);
const newGameButton = element("new-game", HTMLButtonElement);
const frame = canvas.parentElement;
if (frame === null) throw new Error("the board has no frame");
const drawing = canvas.getContext("2d");
if (drawing === null) throw new Error("the browser gives no 2D canvas");
const context: CanvasRenderingContext2D = drawing;

const chooseFood: FoodChooser = (freeCount) => Math.floor(Math.random() * freeCount);
const freshGame = (): GameState => newGame({ size: gridSize, startLength, choose: chooseFood });
const getStore = (): Storage => window.localStorage;

let state = freshGame();
let best = readBest(getStore, storageKey, maxScore);
let timer: number | undefined;

/** Makes `next` the game state: saves a new best score, starts or stops the timer, redraws. */
function apply(next: GameState): void {
  const ended = next.status !== state.status && (next.status === "over" || next.status === "won");
  state = next;
  if (ended && state.score > best) {
    best = state.score;
    writeBest(getStore, storageKey, best, maxScore);
  }
  syncTimer();
  render();
}

/** The tick timer runs only while the game is `running` (docs/SPEC.md 2.2). */
function syncTimer(): void {
  if (state.status === "running" && timer === undefined) {
    timer = window.setInterval(() => apply(tick(state, chooseFood)), tickMilliseconds);
  } else if (state.status !== "running" && timer !== undefined) {
    window.clearInterval(timer);
    timer = undefined;
  }
}

function render(): void {
  const head = state.snake[0];
  root.dataset.status = state.status;
  root.dataset.score = String(state.score);
  root.dataset.best = String(best);
  root.dataset.head = head === undefined ? "" : `${head.x},${head.y}`;
  root.dataset.length = String(state.snake.length);
  scoreText.textContent = String(state.score);
  bestText.textContent = String(best);
  statusText.textContent = STATUS_TEXT[state.status];
  pauseButton.textContent = state.status === "paused" ? "Resume" : "Pause";
  draw();
}

function draw(): void {
  const side = canvas.width;
  const cell = side / gridSize;
  const style = getComputedStyle(canvas);
  const colour = (name: string): string => style.getPropertyValue(name).trim();
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

  const gap = Math.max(1, Math.round(cell * CELL_GAP));
  state.snake.forEach((part, index) => {
    context.fillStyle = colour(index === 0 ? "--head" : "--snake");
    context.fillRect(part.x * cell + gap, part.y * cell + gap, cell - 2 * gap, cell - 2 * gap);
  });
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

// Keys (docs/SPEC.md 2.6).
document.addEventListener("keydown", (event) => {
  // Space and Enter on a focused button are the button's own (a click), so they act once.
  if (event.target instanceof HTMLButtonElement && (event.key === " " || event.key === "Enter")) {
    return;
  }
  const command = keyToCommand(event.key, {
    ctrl: event.ctrlKey,
    meta: event.metaKey,
    alt: event.altKey,
  });
  if (command === null) return;
  // Keeps the arrows and Space from scrolling the page.
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
