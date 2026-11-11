import { versionText } from "./version";

describe("versionText (docs/SPEC.md 2.17 (1), (3))", () => {
  it.each([
    ["0.2.0", "abc1234", "v0.2.0 · abc1234"],
    ["1.10.3", "dev", "v1.10.3 · dev"],
    ["0.3.0-rc.1", "abc1234", "v0.3.0-rc.1 · abc1234"],
  ])("version %s and build %s give %s", (version, build, text) => {
    expect(versionText(version, build)).toBe(text);
  });

  it("separates the version and the build with a space, the middle dot U+00B7 and a space", () => {
    expect(versionText("0.2.0", "dev")).toBe("v0.2.0 · dev");
  });
});
