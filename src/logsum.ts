/**
 * The log text and the checksum line of the event log, and the judgement of a pasted log
 * (docs/SPEC.md 2.13 (7)). Pure: the hash function is passed in, so the page calls it with
 * `src/sha256.ts` and `scripts/verify-log` with Node's own SHA-256. This file imports nothing, so the
 * script can read it as it is.
 */

/** A SHA-256 function: a string as UTF-8 to 64 lowercase hexadecimal digits. */
export type Hash = (text: string) => string;

/** What `judge` says about a pasted log. */
export type Verdict = "match" | "mismatch" | "no checksum";

/** The log text: the lines in order, each followed by one line feed (2.13 (7)). */
export function logTextOf(lines: readonly string[]): string {
  return lines.map((line) => `${line}\n`).join("");
}

/** The checksum line of a log text: `sha256`, one space, the 64 digits and a line feed (2.13 (7)). */
export function checksumLine(text: string, hash: Hash): string {
  return `sha256 ${hash(text)}\n`;
}

/** What the log panel shows and Copy copies: the log text and then its checksum line (2.13 (6), (7)). */
export function panelText(lines: readonly string[], hash: Hash): string {
  const text = logTextOf(lines);
  return text + checksumLine(text, hash);
}

/** A line that is of the form of the checksum line: capitals, extra spaces and other text are not. */
const CHECKSUM = /^sha256 ([0-9a-f]{64})$/;
/** A line that is empty or holds only spaces and tabs. */
const BLANK = /^[ \t]*$/;

/**
 * Judges a pasted log given as bytes (2.13 (7)): decoded as UTF-8 (a leading byte order mark removed,
 * an invalid byte becoming U+FFFD), CR LF read as LF (a lone CR stays in its line), trailing empty
 * lines and lines of spaces and tabs ignored. The last line left is the checksum line and the lines
 * before it, each followed by a line feed, the log text.
 */
export function judge(bytes: Uint8Array, hash: Hash): Verdict {
  const text = new TextDecoder("utf-8").decode(bytes).replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  while (lines.length > 0 && BLANK.test(lines[lines.length - 1] as string)) lines.pop();
  const last = lines.pop();
  const found = last === undefined ? null : CHECKSUM.exec(last);
  if (found === null) return "no checksum";
  return hash(logTextOf(lines)) === found[1] ? "match" : "mismatch";
}
