import { build } from "esbuild";
import { rmSync } from "node:fs";

rmSync("dist", { recursive: true, force: true });

const shared = {
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  minify: false,
  sourcemap: false,
  logLevel: "info",
  banner: {
    js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);",
  },
};

await Promise.all([
  build({ ...shared, entryPoints: ["src/cli.ts"], outfile: "dist/cli.js" }),
  build({ ...shared, entryPoints: ["hooks/pre_tool_use.ts"], outfile: "dist/hooks/pre_tool_use.js" }),
  build({ ...shared, entryPoints: ["hooks/post_tool_use.ts"], outfile: "dist/hooks/post_tool_use.js" }),
  build({ ...shared, entryPoints: ["hooks/user_prompt_submit.ts"], outfile: "dist/hooks/user_prompt_submit.js" }),
  build({ ...shared, entryPoints: ["hooks/judge_worker.ts"], outfile: "dist/hooks/judge_worker.js" }),
]);
