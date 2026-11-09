import { type Command, type Direction, keyToCommand, swipeToDirection } from "./input";

const none = { ctrl: false, meta: false, alt: false };

function turn(direction: Direction): Command {
  return { type: "turn", direction };
}

describe("keyToCommand", () => {
  describe("turns (docs/SPEC.md 2.6)", () => {
    it.each<[string, Direction]>([
      ["ArrowUp", "up"],
      ["ArrowDown", "down"],
      ["ArrowLeft", "left"],
      ["ArrowRight", "right"],
    ])("maps the arrow key %s to a turn %s", (key, direction) => {
      expect(keyToCommand(key, none)).toEqual(turn(direction));
    });

    it.each<[string, Direction]>([
      ["w", "up"],
      ["W", "up"],
      ["a", "left"],
      ["A", "left"],
      ["s", "down"],
      ["S", "down"],
      ["d", "right"],
      ["D", "right"],
    ])("maps the letter %s to a turn %s, in either case", (key, direction) => {
      expect(keyToCommand(key, none)).toEqual(turn(direction));
    });
  });

  describe("pause and new game (docs/SPEC.md 2.5, 2.6)", () => {
    it.each([" ", "p", "P"])("maps %j to pause", (key) => {
      expect(keyToCommand(key, none)).toEqual({ type: "pause" });
    });

    it("maps Enter to a new game", () => {
      expect(keyToCommand("Enter", none)).toEqual({ type: "newGame" });
    });
  });

  describe("other keys do nothing", () => {
    it.each([
      "",
      "Escape",
      "Tab",
      "Shift",
      "Control",
      "x",
      "X",
      "q",
      "1",
      "Spacebar",
      "Space",
      "arrowup",
      "Up",
      "ww",
      "Pause",
      "NumpadEnter",
      "constructor",
      "toString",
      "__proto__",
    ])("gives null for %j", (key) => {
      expect(keyToCommand(key, none)).toBeNull();
    });
  });

  describe("modifiers", () => {
    const commandKeys = ["ArrowUp", "w", "W", "D", " ", "p", "P", "Enter"];
    const modifierSets = [
      { ctrl: true, meta: false, alt: false },
      { ctrl: false, meta: true, alt: false },
      { ctrl: false, meta: false, alt: true },
      { ctrl: true, meta: true, alt: true },
    ];

    it.each(commandKeys.flatMap((key) => modifierSets.map((mods) => [key, mods] as const)))(
      "gives null for %j with modifiers %j",
      (key, mods) => {
        expect(keyToCommand(key, mods)).toBeNull();
      },
    );

    it("gives the same command for an upper-case letter as for its lower case (Shift does not matter)", () => {
      expect(keyToCommand("W", none)).toEqual(keyToCommand("w", none));
      expect(keyToCommand("P", none)).toEqual(keyToCommand("p", none));
    });
  });

  it("returns a new object on each call", () => {
    const first = keyToCommand("ArrowUp", none);
    const second = keyToCommand("ArrowUp", none);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
  });

  it("does not mutate the modifiers it is given", () => {
    const mods = { ctrl: true, meta: false, alt: false };
    const copy = { ...mods };
    keyToCommand("w", mods);
    keyToCommand("w", none);
    expect(mods).toEqual(copy);
  });
});

describe("swipeToDirection (docs/SPEC.md 2.7)", () => {
  const min = 30;
  const origin = { x: 100, y: 100 };
  const to = (dx: number, dy: number) => ({ x: origin.x + dx, y: origin.y + dy });

  describe("direction along the longer axis", () => {
    it.each<[number, number, Direction]>([
      [50, 0, "right"],
      [-50, 0, "left"],
      [0, 50, "down"],
      [0, -50, "up"],
      [50, 10, "right"],
      [-50, -49, "left"],
      [10, 50, "down"],
      [49, -50, "up"],
    ])("a swipe of dx=%d, dy=%d is %s", (dx, dy, direction) => {
      expect(swipeToDirection(origin, to(dx, dy), min)).toBe(direction);
    });

    it("treats positive dy as down, since screen y grows downward", () => {
      expect(swipeToDirection({ x: 0, y: 0 }, { x: 0, y: 40 }, min)).toBe("down");
      expect(swipeToDirection({ x: 0, y: 40 }, { x: 0, y: 0 }, min)).toBe("up");
    });
  });

  describe("threshold, horizontal axis", () => {
    it("gives null just under the threshold", () => {
      expect(swipeToDirection(origin, to(29.9, 0), min)).toBeNull();
      expect(swipeToDirection(origin, to(-29.9, 0), min)).toBeNull();
    });

    it("turns at exactly the threshold", () => {
      expect(swipeToDirection(origin, to(30, 0), min)).toBe("right");
      expect(swipeToDirection(origin, to(-30, 0), min)).toBe("left");
    });

    it("turns over the threshold", () => {
      expect(swipeToDirection(origin, to(31, 0), min)).toBe("right");
      expect(swipeToDirection(origin, to(-31, 0), min)).toBe("left");
    });
  });

  describe("threshold, vertical axis", () => {
    it("gives null just under the threshold", () => {
      expect(swipeToDirection(origin, to(0, 29.9), min)).toBeNull();
      expect(swipeToDirection(origin, to(0, -29.9), min)).toBeNull();
    });

    it("turns at exactly the threshold", () => {
      expect(swipeToDirection(origin, to(0, 30), min)).toBe("down");
      expect(swipeToDirection(origin, to(0, -30), min)).toBe("up");
    });

    it("turns over the threshold", () => {
      expect(swipeToDirection(origin, to(0, 31), min)).toBe("down");
      expect(swipeToDirection(origin, to(0, -31), min)).toBe("up");
    });
  });

  it("gives null when both axes are under the threshold, even if their sum is not", () => {
    expect(swipeToDirection(origin, to(29, 28), min)).toBeNull();
  });

  it("turns when only the longer axis reaches the threshold", () => {
    expect(swipeToDirection(origin, to(30, 29), min)).toBe("right");
    expect(swipeToDirection(origin, to(-29, 30), min)).toBe("down");
  });

  it("uses the threshold it is given, not a fixed one", () => {
    expect(swipeToDirection(origin, to(50, 0), 60)).toBeNull();
    expect(swipeToDirection(origin, to(10, 0), 5)).toBe("right");
  });

  it("gives null for no movement", () => {
    expect(swipeToDirection(origin, origin, min)).toBeNull();
    expect(swipeToDirection(origin, origin, 0)).toBeNull();
  });

  describe("exact diagonals give null", () => {
    it.each([
      [40, 40],
      [-40, 40],
      [40, -40],
      [-40, -40],
      [30, 30],
      [1000, -1000],
    ])("dx=%d, dy=%d", (dx, dy) => {
      expect(swipeToDirection(origin, to(dx, dy), min)).toBeNull();
    });
  });

  describe("non-finite input gives null", () => {
    const bad = [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];

    it.each(bad)("start.x = %p", (v) => {
      expect(swipeToDirection({ x: v, y: 0 }, { x: 100, y: 0 }, min)).toBeNull();
    });

    it.each(bad)("start.y = %p", (v) => {
      expect(swipeToDirection({ x: 0, y: v }, { x: 0, y: 100 }, min)).toBeNull();
    });

    it.each(bad)("end.x = %p", (v) => {
      expect(swipeToDirection({ x: 0, y: 0 }, { x: v, y: 0 }, min)).toBeNull();
    });

    it.each(bad)("end.y = %p", (v) => {
      expect(swipeToDirection({ x: 0, y: 0 }, { x: 0, y: v }, min)).toBeNull();
    });

    it.each(bad)("minDistance = %p", (v) => {
      expect(swipeToDirection(origin, to(100, 0), v)).toBeNull();
    });
  });

  it("does not mutate the points it is given", () => {
    const start = { x: 1, y: 2 };
    const end = { x: 80, y: 3 };
    swipeToDirection(start, end, min);
    expect(start).toEqual({ x: 1, y: 2 });
    expect(end).toEqual({ x: 80, y: 3 });
  });
});
