import { config } from "./config";

describe("config (docs/SPEC.md 3)", () => {
  it("holds exactly the named values of the spec", () => {
    expect(config).toEqual({
      gridSize: 20,
      startLength: 3,
      minSwipe: 30,
      storageKey: "snake-demo.best",
      dotsPerLevel: 5,
      firstDelay: 125,
      delayStep: 5,
      shortestDelay: 50,
      clearAhead: 8,
      specialEvery: 5,
      shieldLayers: 3,
      maxTurns: 20,
      specialSeconds: 30,
      jumpSeconds: 3,
      clearAheadOfHead: 2,
      bannerBlinkMs: 250,
      bannerMs: 3000,
    });
  });

  it("cannot be changed at run time", () => {
    expect(Object.isFrozen(config)).toBe(true);
  });
});
