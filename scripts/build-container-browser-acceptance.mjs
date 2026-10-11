import { build } from "esbuild";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
await build({
  entryPoints: [path.join(root, "scripts/container-browser-acceptance.ts")],
  outfile: path.join(root, "dist/container-browser-acceptance.mjs"),
  bundle: true, platform: "node", format: "esm", target: "node24",
  conditions: ["react-server", "node", "import"], alias: { "@": path.join(root, "src") },
  legalComments: "none",
  banner: { js: 'import { createRequire as __createRequire } from "node:module"; const require = __createRequire(import.meta.url);' },
});
