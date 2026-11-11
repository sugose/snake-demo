import base from "./playwright.config";

// Local only (excluded from git): the same projects, a server of its own on port 4273 serving a copy of the old build.
export default {
  ...base,
  use: { ...base.use, baseURL: "http://localhost:4273" },
  webServer: {
    command: "npx vite preview --outDir /tmp/work/dist-red --port 4273 --strictPort",
    url: "http://localhost:4273",
    reuseExistingServer: false,
  },
};
