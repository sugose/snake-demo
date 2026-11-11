import { createHash } from "node:crypto";
import { checksumLine, judge, logTextOf, panelText, type Verdict } from "./logsum";

// The log text, the checksum line and the judgement of a pasted log (docs/SPEC.md 2.13 (7)).

const node = (text: string): string => createHash("sha256").update(text, "utf8").digest("hex");
const utf8 = (text: string): Uint8Array => new TextEncoder().encode(text);

// Worked out outside the code, with `printf 'one\ntwo\n' | sha256sum` and the like.
const ONE_TWO = "c3f9c8c283a2b1f2f1896f27a01cbe3cddc0c9d93f752e4639035a0f5b36f6e8";
const ONE = "2c8b08da5ce60398e1f19af0e5dccc744df274b826abe585eaba68c525434806";
const THREE = "b6285c57e8797db5d4c51c80d6f11938afda9b11c6a003549709189e9b4b92a2";
const EMPTY = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const FIRST_LOG = [
  "FIRST",
  "[t=0 #0] level 1 normal delay=125 start=(10,10) right obstacles=- dot=(0,19)",
  "[t=250 #2] key ArrowUp up used",
];
const FIRST_LOG_SUM = "320521a968f556c51e03603798ab6fb341ae78e6cdcac6b6a3edfb2d4877aadb";
const UNICODE_SUM = "42971da0592af318daf2c7a23f0681e9a71be841975510d771088b3cb813bb48";

describe("the log text and the checksum line", () => {
  it("the log text is each line followed by one line feed", () => {
    expect(logTextOf(["one", "two"])).toBe("one\ntwo\n");
    expect(logTextOf(["one"])).toBe("one\n");
  });

  it("a log of no lines has the empty text", () => {
    expect(logTextOf([])).toBe("");
  });

  it("the checksum line is sha256, one space, the 64 digits and a line feed", () => {
    expect(checksumLine("one\ntwo\n", node)).toBe(`sha256 ${ONE_TWO}\n`);
    expect(checksumLine("one\n", node)).toBe(`sha256 ${ONE}\n`);
    expect(checksumLine("", node)).toBe(`sha256 ${EMPTY}\n`);
  });

  it("the checksum is of the text as UTF-8", () => {
    expect(checksumLine("Ångström €\n😀\n", node)).toBe(`sha256 ${UNICODE_SUM}\n`);
  });

  it("the panel's text is the log text and then the checksum line, for a given log", () => {
    expect(panelText(["one", "two"], node)).toBe(`one\ntwo\nsha256 ${ONE_TWO}\n`);
    expect(panelText(FIRST_LOG, node)).toBe(`${FIRST_LOG.join("\n")}\nsha256 ${FIRST_LOG_SUM}\n`);
  });

  it("the checksum line has no stamp and is only at the end", () => {
    const lines = panelText(FIRST_LOG, node).split("\n");
    expect(lines).toHaveLength(FIRST_LOG.length + 2);
    expect(lines.at(-1)).toBe("");
    expect(lines.filter((line) => line.startsWith("sha256 "))).toHaveLength(1);
    expect(lines.at(-2)).toMatch(/^sha256 [0-9a-f]{64}$/);
  });

  it("the hash function is the one passed in", () => {
    const zeros = "0".repeat(64);
    expect(panelText(["one"], () => zeros)).toBe(`one\nsha256 ${zeros}\n`);
    const seen: string[] = [];
    checksumLine("a\nb\n", (text) => {
      seen.push(text);
      return zeros;
    });
    expect(seen).toEqual(["a\nb\n"]);
  });
});

describe("the judgement of a pasted log", () => {
  const good = `one\ntwo\nsha256 ${ONE_TWO}\n`;
  const judged = (input: string | Uint8Array): Verdict =>
    judge(typeof input === "string" ? utf8(input) : input, node);

  it("match: the digits are those of the log text", () => {
    expect(judged(good)).toBe("match");
  });

  it("match for what the panel makes, whole", () => {
    expect(judged(panelText(FIRST_LOG, node))).toBe("match");
  });

  it("match without the final line feed", () => {
    expect(judged(good.slice(0, -1))).toBe("match");
  });

  it("mismatch: a changed character", () => {
    expect(judged(`one\ntwx\nsha256 ${ONE_TWO}\n`)).toBe("mismatch");
  });

  it("mismatch: a removed line", () => {
    expect(judged(`one\nsha256 ${ONE_TWO}\n`)).toBe("mismatch");
  });

  it("mismatch: an added line", () => {
    expect(judged(`one\ntwo\nthree\nsha256 ${ONE_TWO}\n`)).toBe("mismatch");
  });

  it("mismatch: a changed digit", () => {
    const digits = `${ONE_TWO.slice(0, -1)}7`;
    expect(judged(`one\ntwo\nsha256 ${digits}\n`)).toBe("mismatch");
  });

  it("match for the digits of three lines when the log has three", () => {
    expect(judged(`one\ntwo\nthree\nsha256 ${THREE}\n`)).toBe("match");
  });

  it("a checksum line alone is the checksum of the empty log text", () => {
    expect(judged(`sha256 ${EMPTY}\n`)).toBe("match");
    expect(judged(`sha256 ${ONE}\n`)).toBe("mismatch");
  });

  it("an empty line inside the log counts as a line of the log text", () => {
    expect(
      judged(`a\n\nsha256 ${"a7da489976d0047490617adb4f7a1f27f7af8b52a5176fd002ffe471863520ab"}\n`),
    ).toBe("match");
  });

  it("no checksum: the last line is not a checksum line", () => {
    expect(judged("one\ntwo\n")).toBe("no checksum");
    expect(judged(`sha256 ${ONE_TWO}\none\n`)).toBe("no checksum");
  });

  it("no checksum: capital letters in the digits", () => {
    expect(judged(`one\ntwo\nsha256 ${ONE_TWO.toUpperCase()}\n`)).toBe("no checksum");
    expect(judged(`one\ntwo\nsha256 ${ONE_TWO.slice(0, 63)}C\n`)).toBe("no checksum");
  });

  it("no checksum: a capital S in the word", () => {
    expect(judged(`one\ntwo\nSHA256 ${ONE_TWO}\n`)).toBe("no checksum");
    expect(judged(`one\ntwo\nSha256 ${ONE_TWO}\n`)).toBe("no checksum");
  });

  it("no checksum: extra spaces on the checksum line", () => {
    expect(judged(`one\ntwo\nsha256  ${ONE_TWO}\n`)).toBe("no checksum");
    expect(judged(`one\ntwo\n sha256 ${ONE_TWO}\n`)).toBe("no checksum");
    expect(judged(`one\ntwo\nsha256 ${ONE_TWO} \n`)).toBe("no checksum");
    expect(judged(`one\ntwo\nsha256\t${ONE_TWO}\n`)).toBe("no checksum");
    expect(judged(`one\ntwo\nsha256 ${ONE_TWO}\t\n`)).toBe("no checksum");
  });

  it("no checksum: too few or too many digits, other characters, other text", () => {
    expect(judged(`one\ntwo\nsha256 ${ONE_TWO.slice(1)}\n`)).toBe("no checksum");
    expect(judged(`one\ntwo\nsha256 ${ONE_TWO}0\n`)).toBe("no checksum");
    expect(judged(`one\ntwo\nsha256 ${ONE_TWO.slice(0, 63)}g\n`)).toBe("no checksum");
    expect(judged(`one\ntwo\nsha256 ${ONE_TWO} ok\n`)).toBe("no checksum");
    expect(judged(`one\ntwo\nsha256: ${ONE_TWO}\n`)).toBe("no checksum");
    expect(judged(`one\ntwo\nx sha256 ${ONE_TWO}\n`)).toBe("no checksum");
    expect(judged(`one\ntwo\n[t=1 #0] sha256 ${ONE_TWO}\n`)).toBe("no checksum");
  });

  it("no checksum: an empty input", () => {
    expect(judged("")).toBe("no checksum");
  });

  it("no checksum: an input of only line feeds", () => {
    expect(judged("\n")).toBe("no checksum");
    expect(judged("\n\n\n")).toBe("no checksum");
  });

  it("no checksum: an input of only lines of spaces and tabs", () => {
    expect(judged(" \n\t\n \t \n")).toBe("no checksum");
    expect(judged("   ")).toBe("no checksum");
  });

  it("trailing empty lines are ignored", () => {
    expect(judged(`${good}\n\n\n`)).toBe("match");
    expect(judged(`${good.slice(0, -1)}\n\n`)).toBe("match");
  });

  it("trailing lines of spaces and tabs are ignored", () => {
    expect(judged(`${good}  \n\t\n \t \n`)).toBe("match");
    expect(judged(`${good} \t`)).toBe("match");
    expect(judged(`${good}\n \n\n\t`)).toBe("match");
  });

  it("empty lines and lines of spaces before the checksum line are part of the log text", () => {
    expect(judged(`one\ntwo\n\nsha256 ${ONE_TWO}\n`)).toBe("mismatch");
    expect(judged(`one\ntwo\n \nsha256 ${ONE_TWO}\n`)).toBe("mismatch");
  });

  it("a lone CR stays in its line", () => {
    expect(judged(`one\r\ntwo\nsha256 ${ONE_TWO}\n`)).toBe("match");
    expect(judged(`one\rtwo\nsha256 ${ONE_TWO}\n`)).toBe("mismatch");
    expect(judged(`one\ntwo\r\nsha256 ${ONE_TWO}\r`)).toBe("no checksum");
    expect(judged(`one\ntwo\nsha256 ${ONE_TWO}\r\r\n`)).toBe("no checksum");
    expect(judged(`one\ntwo\n\r\nsha256 ${ONE_TWO}\n`)).toBe("mismatch");
  });

  it("a line of only a CR is not an empty line", () => {
    expect(judged(`${good}\r`)).toBe("no checksum");
    expect(judged(`${good}\r\n\r\n`)).toBe("match");
  });

  it("CR LF input is read as LF", () => {
    expect(judged(`one\r\ntwo\r\nsha256 ${ONE_TWO}\r\n`)).toBe("match");
    expect(judged(`one\r\ntwx\r\nsha256 ${ONE_TWO}\r\n`)).toBe("mismatch");
    expect(judged(`one\r\ntwo\r\nsha256 ${ONE_TWO}\r\n\r\n\r\n`)).toBe("match");
  });

  it("a byte order mark at the start is removed", () => {
    const bom = Uint8Array.of(0xef, 0xbb, 0xbf);
    expect(judged(Uint8Array.of(...bom, ...utf8(good)))).toBe("match");
    expect(judged(Uint8Array.of(...bom, ...utf8(`sha256 ${EMPTY}\n`)))).toBe("match");
  });

  it("a byte order mark after the start is part of the text", () => {
    expect(judged(`one\n﻿two\nsha256 ${ONE_TWO}\n`)).toBe("mismatch");
    expect(judged(`one\ntwo\n﻿sha256 ${ONE_TWO}\n`)).toBe("no checksum");
  });

  it("an invalid byte in a log line makes a mismatch", () => {
    const input = Uint8Array.of(...utf8("one\ntw"), 0xff, ...utf8(`\nsha256 ${ONE_TWO}\n`));
    expect(judged(input)).toBe("mismatch");
  });

  it("an invalid byte becomes U+FFFD, so a log that held that character matches", () => {
    const text = "one\ntw�\n";
    const input = Uint8Array.of(
      ...utf8("one\ntw"),
      0xff,
      ...utf8("\n"),
      ...utf8(`sha256 ${node(text)}\n`),
    );
    expect(judged(input)).toBe("match");
  });

  it("an invalid byte in the checksum line makes no checksum", () => {
    const input = Uint8Array.of(
      ...utf8("one\ntwo\nsha256 "),
      0xff,
      ...utf8(ONE_TWO.slice(1)),
      0x0a,
    );
    expect(judged(input)).toBe("no checksum");
    const after = Uint8Array.of(...utf8(`one\ntwo\nsha256 ${ONE_TWO}`), 0xc3, 0x0a);
    expect(judged(after)).toBe("no checksum");
  });

  it("multi-byte text in the log is hashed as UTF-8", () => {
    expect(judged(`Ångström €\n😀\nsha256 ${UNICODE_SUM}\n`)).toBe("match");
  });

  it("uses the hash function passed in, not its own", () => {
    const zeros = "0".repeat(64);
    expect(judge(utf8(`one\nsha256 ${zeros}\n`), () => zeros)).toBe("match");
    expect(judge(utf8(`one\nsha256 ${ONE}\n`), () => zeros)).toBe("mismatch");
  });
});
