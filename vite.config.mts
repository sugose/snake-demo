import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

/**
 * The commit the page is built from, for the event log's first line (docs/SPEC.md 2.13 (3)): the
 * CI's commit, short, when there is one, else "dev".
 */
function build(): string {
  const sha = process.env.GITHUB_SHA;
  return sha !== undefined && sha !== "" ? sha.slice(0, 7) : "dev";
}

export default defineConfig({
  plugins: [viteSingleFile()],
  define: { __BUILD__: JSON.stringify(build()) },
});
