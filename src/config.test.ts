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
      copiedMs: 2000,
      maxStartLevel: 99,
      slowFactors: [1, 2, 4],
      slowButtonSize: 24,
      scoreEntries: 10,
      nameLetters: 3,
      scoresStorageKey: "snake-demo.scores",
      recordsStorageKey: "snake-demo.records",
      maxRecordTurns: 99999,
      maxRecordTimeMs: 99999999,
      seenVersionStorageKey: "snake-demo.seen-version",
      pixelScales: [1, 2, 3],
      bandHeight: 40,
      rollMs: 8000,
      shiftPixels: 2,
      shiftMs: 120,
      shiftCycleMs: 7000,
      shiftAtMs: [900, 3300, 5600],
      cursorMs: 500,
      scanlineHeight: 1,
      scanlinePitch: 3,
      scanlineOpacityPercent: 25,
      glowBlur: 4,
      bandWhitePercent: 6,
    });
  });

  it("cannot be changed at run time", () => {
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.slowFactors)).toBe(true);
    const values: Readonly<Record<string, unknown>> = config;
    expect(Object.isFrozen(values.pixelScales)).toBe(true);
    expect(Object.isFrozen(values.shiftAtMs)).toBe(true);
  });
});
