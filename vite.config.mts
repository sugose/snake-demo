import { execSync } from "node:child_process";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

/**
 * The commit the page is built from, for the event log's first line (docs/SPEC.md 2.13 (3)): the
 * CI's commit when there is one, else "dev".
 */
function build(): string {
  const sha = process.env.GITHUB_SHA;
  if (sha !== undefined && sha !== "") return sha.slice(0, 7);
  try {
    const head = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
    return head === "" ? "dev" : `dev-${head}`;
  } catch {
    return "dev";
  }
}

export default defineConfig({
  plugins: [viteSingleFile()],
  define: { __BUILD__: JSON.stringify(build()) },
});
