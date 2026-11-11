/**
 * The text of the version line (docs/SPEC.md 2.17 (1)): `v`, the version, a space, the middle dot
 * (U+00B7), a space and the build. The page and the log's first line take the same two build-time
 * constants (2.17 (3)).
 */
export function versionText(version: string, build: string): string {
  return `v${version} · ${build}`;
}
