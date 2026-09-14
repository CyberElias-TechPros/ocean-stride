// Restricted-network Linux test fallback. This is not application infrastructure.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
if (process.platform !== "linux")
  throw new Error("Use the standard Playwright installer on this platform.");
const entry = import.meta.resolve("@sparticuz/chromium");
// The pinned Chromium package ships the support libraries needed by minimal Linux sandboxes.
const { inflate } = await import(new URL("./lambdafs.js", entry).href);
const libraries = await inflate(
  fileURLToPath(new URL("../bin/al2023.tar.br", entry)),
);
const result = spawnSync(
  "npm",
  ["run", "test:e2e", "--", ...process.argv.slice(2)],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      BUNDLED_CHROMIUM: "1",
      LD_LIBRARY_PATH: [join(libraries, "lib"), process.env.LD_LIBRARY_PATH]
        .filter(Boolean)
        .join(":"),
    },
  },
);
process.exit(result.status ?? 1);
