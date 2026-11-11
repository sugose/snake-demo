import { createHash } from "node:crypto";
import { sha256 } from "./sha256";

// SHA-256 of a string as UTF-8 (docs/SPEC.md 2.13 (7)).

/** Node's own SHA-256 of `text` as UTF-8, in lowercase hexadecimal. */
const node = (text: string): string => createHash("sha256").update(text, "utf8").digest("hex");

describe("sha256 against the published test vectors", () => {
  // The vectors of FIPS 180-4 / NIST CSRC "SHA-256 example" values, written out here by hand.
  it("the empty message", () => {
    expect(sha256("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it('"abc"', () => {
    expect(sha256("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("the 56-byte message of FIPS 180-4", () => {
    const message = "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq";
    expect(message).toHaveLength(56);
    expect(sha256(message)).toBe(
      "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
    );
  });

  it("the 112-byte message of FIPS 180-4", () => {
    const message =
      "abcdefghbcdefghicdefghijdefghijkefghijklfghijklmghijklmnhijklmnoijklmnopjklmnopqklmnopqrlmnopqrsmnopqrstnopqrstu";
    expect(message).toHaveLength(112);
    expect(sha256(message)).toBe(
      "cf5b16a778af8380036ce59e7b0492370b249b11e8f07a51afac45037afee9d1",
    );
  });

  it('one million "a"', () => {
    expect(sha256("a".repeat(1_000_000))).toBe(
      "cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0",
    );
  });
});

describe("sha256 against Node's result", () => {
  // 55 and 56 bytes straddle the padding's room for the length, 63 to 65 the block size.
  for (const length of [1, 54, 55, 56, 57, 63, 64, 65, 111, 119, 120, 121, 127, 128, 129, 1000]) {
    it(`an input of ${length} bytes`, () => {
      const text = Array.from({ length }, (_, i) => String.fromCharCode(33 + ((i * 7) % 90))).join(
        "",
      );
      expect(text).toHaveLength(length);
      expect(sha256(text)).toBe(node(text));
    });
  }

  it("is lowercase hexadecimal of 64 digits", () => {
    expect(sha256("Snake")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("multi-byte UTF-8: two, three and four bytes a character", () => {
    for (const text of ["åäö", "€", "日本語", "😀", "a😀b€ö", "é"]) {
      expect(sha256(text)).toBe(node(text));
    }
  });

  it("multi-byte input of 55, 56, 63, 64 and 65 bytes", () => {
    // "ö" is 2 bytes, "€" 3 and "😀" 4.
    const bytes = (text: string): number => new TextEncoder().encode(text).length;
    const cases = [
      `${"ö".repeat(27)}a`, // 55
      "ö".repeat(28), // 56
      "€".repeat(21), // 63
      "😀".repeat(16), // 64
      `${"😀".repeat(16)}a`, // 65
    ];
    expect(cases.map(bytes)).toEqual([55, 56, 63, 64, 65]);
    for (const text of cases) expect(sha256(text)).toBe(node(text));
  });

  it("a lone surrogate is hashed as U+FFFD, as Node does", () => {
    expect(sha256("a\ud800b")).toBe(node("a\ud800b"));
    expect(sha256("\udc00")).toBe(node("\udc00"));
  });

  it("a line feed is hashed as the byte 0x0a", () => {
    expect(sha256("a\nb\n")).toBe(node("a\nb\n"));
    expect(sha256("a\r\nb")).not.toBe(sha256("a\nb"));
  });
});
