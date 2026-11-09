import { config } from "./config";

describe("config (docs/SPEC.md 3)", () => {
  it("holds exactly the five named values of the spec", () => {
    expect(config).toEqual({
      gridSize: 20,
      startLength: 3,
      ticksPerSecond: 8,
      minSwipe: 30,
      storageKey: "snake-demo.best",
    });
  });

  it("cannot be changed at run time", () => {
    expect(Object.isFrozen(config)).toBe(true);
  });
});
