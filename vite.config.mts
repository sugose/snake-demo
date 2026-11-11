import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

/**
 * The commit the page is built from, for the version line and the event log's first line (docs/SPEC.md 2.17, 2.13 (3)): the
 * CI's commit, short, when there is one, else "dev".
 */
function build(): string {
  const sha = process.env.GITHUB_SHA;
  return sha !== undefined && sha !== "" ? sha.slice(0, 7) : "dev";
}

/** The `version` of package.json when the page is built, whatever it is (docs/SPEC.md 2.17 (1), (3)). */
function version(): string {
  const text = readFileSync(new URL("./package.json", import.meta.url), "utf8");
  return (JSON.parse(text) as { version: string }).version;
}

export default defineConfig({
  plugins: [viteSingleFile()],
  define: { __VERSION__: JSON.stringify(version()), __BUILD__: JSON.stringify(build()) },
});
