import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { closeSync, mkdtempSync, openSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// `npm run verify-log` (docs/SPEC.md 2.13 (7)), run as a process: the script is `scripts/verify-log`,
// started the way the npm script starts it, with `node`.

const SCRIPT = join(__dirname, "..", "scripts", "verify-log");
const node = (text: string): string => createHash("sha256").update(text, "utf8").digest("hex");
const utf8 = (text: string): Buffer => Buffer.from(text, "utf8");
const ONE_TWO = "c3f9c8c283a2b1f2f1896f27a01cbe3cddc0c9d93f752e4639035a0f5b36f6e8";
const EMPTY = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const good = `one\ntwo\nsha256 ${ONE_TWO}\n`;

interface Outcome {
  readonly stdout: string;
  readonly stderr: string;
  readonly code: number | null;
}

function run(args: readonly string[], input?: Buffer): Outcome {
  const result = spawnSync("node", [SCRIPT, ...args], { input: input ?? Buffer.alloc(0) });
  return {
    stdout: result.stdout.toString("utf8"),
    stderr: result.stderr.toString("utf8"),
    code: result.status,
  };
}

let dir = "";
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "verify-log-"));
});
afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

let counter = 0;
/** Writes `bytes` to a new file and returns its path. */
function fileOf(bytes: Buffer): string {
  counter++;
  const path = join(dir, `log-${counter}.txt`);
  writeFileSync(path, bytes);
  return path;
}

type Case = readonly [name: string, input: Buffer, line: string, code: number];
const MATCH = "match\n";
const MISMATCH = "mismatch\n";
const NONE = "no checksum\n";
const CASES: readonly Case[] = [
  ["match", utf8(good), MATCH, 0],
  ["match without the final line feed", utf8(good.slice(0, -1)), MATCH, 0],
  ["a changed character", utf8(`one\ntwx\nsha256 ${ONE_TWO}\n`), MISMATCH, 1],
  ["a removed line", utf8(`one\nsha256 ${ONE_TWO}\n`), MISMATCH, 1],
  ["an added line", utf8(`one\ntwo\nthree\nsha256 ${ONE_TWO}\n`), MISMATCH, 1],
  ["no checksum line", utf8("one\ntwo\n"), NONE, 2],
  ["capital letters in the digits", utf8(`one\ntwo\nsha256 ${ONE_TWO.toUpperCase()}\n`), NONE, 2],
  ["extra spaces on the checksum line", utf8(`one\ntwo\nsha256  ${ONE_TWO}\n`), NONE, 2],
  ["a last line of another shape", utf8(`one\ntwo\nsha256 ${ONE_TWO} ok\n`), NONE, 2],
  ["an empty input", Buffer.alloc(0), NONE, 2],
  ["an input of only line feeds", utf8("\n\n\n"), NONE, 2],
  ["an input of only lines of spaces and tabs", utf8(" \n\t\n \t \n"), NONE, 2],
  ["trailing empty lines", utf8(`${good}\n\n`), MATCH, 0],
  ["trailing lines of spaces and tabs", utf8(`${good}  \n\t\n`), MATCH, 0],
  ["a lone CR", utf8(`one\rtwo\nsha256 ${ONE_TWO}\n`), MISMATCH, 1],
  ["a lone CR on the checksum line", utf8(`one\ntwo\nsha256 ${ONE_TWO}\r`), NONE, 2],
  ["a byte order mark", Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), utf8(good)]), MATCH, 0],
  ["CR LF input", utf8(`one\r\ntwo\r\nsha256 ${ONE_TWO}\r\n`), MATCH, 0],
  [
    "an invalid byte in a log line",
    Buffer.concat([utf8("one\ntw"), Buffer.from([0xff]), utf8(`\nsha256 ${ONE_TWO}\n`)]),
    MISMATCH,
    1,
  ],
  [
    "an invalid byte in the checksum line",
    Buffer.concat([utf8("one\ntwo\nsha256 "), Buffer.from([0xff]), utf8(`${ONE_TWO.slice(1)}\n`)]),
    NONE,
    2,
  ],
  ["multi-byte text", utf8(`Ångström €\n😀\nsha256 ${node("Ångström €\n😀\n")}\n`), MATCH, 0],
  ["a checksum line alone", utf8(`sha256 ${EMPTY}\n`), MATCH, 0],
];

describe("the outcomes, from a file", () => {
  for (const [name, input, line, code] of CASES) {
    it(`${name}: ${line.trim()}, exit ${code}`, () => {
      const outcome = run([fileOf(input)]);
      expect(outcome).toEqual({ stdout: line, stderr: "", code });
    });
  }
});

describe("the outcomes, from the standard input", () => {
  for (const [name, input, line, code] of CASES) {
    it(`${name}: ${line.trim()}, exit ${code}`, () => {
      const outcome = run([], input);
      expect(outcome).toEqual({ stdout: line, stderr: "", code });
    });
  }
});

describe("exit 3", () => {
  it("a missing file: a message on the standard error, nothing on the standard output", () => {
    const outcome = run([join(dir, "no-such-file.txt")]);
    expect(outcome.code).toBe(3);
    expect(outcome.stdout).toBe("");
    expect(outcome.stderr).not.toBe("");
  });

  it("a file that cannot be read (a directory)", () => {
    const outcome = run([dir]);
    expect(outcome.code).toBe(3);
    expect(outcome.stdout).toBe("");
    expect(outcome.stderr).not.toBe("");
  });

  it("two arguments, even when both files are good", () => {
    const outcome = run([fileOf(utf8(good)), fileOf(utf8(good))]);
    expect(outcome.code).toBe(3);
    expect(outcome.stdout).toBe("");
    expect(outcome.stderr).not.toBe("");
  });

  it("two arguments, the first missing", () => {
    const outcome = run([join(dir, "no-such-file.txt"), fileOf(utf8(good))]);
    expect(outcome.code).toBe(3);
    expect(outcome.stdout).toBe("");
  });

  it("a standard input that cannot be read (a directory)", () => {
    const fd = openSync(dir, "r");
    try {
      const result = spawnSync("node", [SCRIPT], { stdio: [fd, "pipe", "pipe"] });
      expect(result.status).toBe(3);
      expect(result.stdout.toString("utf8")).toBe("");
      expect(result.stderr.toString("utf8")).not.toBe("");
    } finally {
      closeSync(fd);
    }
  });

  it("a file is read, not the standard input, when a name is given", () => {
    const outcome = run([fileOf(utf8(good))], utf8("not a log\n"));
    expect(outcome).toEqual({ stdout: MATCH, stderr: "", code: 0 });
  });
});
