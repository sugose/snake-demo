import base from "./playwright.config";

// Local only (excluded from git): the same projects, a server of its own on port 4274 serving this worktree's dist.
export default {
  ...base,
  use: { ...base.use, baseURL: "http://localhost:4274" },
  webServer: {
    command: "npx vite preview --port 4274 --strictPort",
    url: "http://localhost:4274",
    reuseExistingServer: false,
  },
};
