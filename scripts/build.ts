import { copyFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = import.meta.dir.replace("/scripts", "");
const DIST = join(ROOT, "dist");
const PUBLIC = join(ROOT, "public");
const IS_WATCH = process.argv.includes("--watch");
const IS_PROD = process.argv.includes("--prod");

function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

function copyStaticAssets(): void {
  ensureDir(DIST);
  ensureDir(join(DIST, "icons"));

  copyFileSync(join(PUBLIC, "manifest.json"), join(DIST, "manifest.json"));

  const iconsDir = join(PUBLIC, "icons");
  if (existsSync(iconsDir)) {
    for (const file of readdirSync(iconsDir)) {
      copyFileSync(join(iconsDir, file), join(DIST, "icons", file));
    }
  }

  copyFileSync(
    join(ROOT, "src", "popup", "popup.html"),
    join(DIST, "popup.html"),
  );
  copyFileSync(
    join(ROOT, "src", "popup", "popup.css"),
    join(DIST, "popup.css"),
  );
}

async function build(): Promise<void> {
  const sharedConfig = {
    bundle: true as const,
    minify: IS_PROD,
    sourcemap: IS_PROD ? ("none" as const) : ("inline" as const),
    target: "browser" as const,
    format: "esm" as const,
    drop: IS_PROD ? (["console"] as const) : ([] as const),
    outdir: DIST,
    splitting: false as const,
  };

  const results = await Promise.all([
    Bun.build({
      ...sharedConfig,
      entrypoints: [join(ROOT, "src", "background", "index.ts")],
      naming: "background.js",
    }),
    Bun.build({
      ...sharedConfig,
      entrypoints: [join(ROOT, "src", "content", "index.ts")],
      naming: "content.js",
    }),
    Bun.build({
      ...sharedConfig,
      entrypoints: [join(ROOT, "src", "popup", "index.ts")],
      naming: "popup.js",
    }),
    Bun.build({
      ...sharedConfig,
      entrypoints: [join(ROOT, "src", "content", "interceptor.ts")],
      naming: "interceptor.js",
    }),
  ]);

  const allSuccess = results.every((r) => r.success);
  if (!allSuccess) {
    for (const result of results) {
      if (!result.success) {
        for (const log of result.logs) {
          console.error(log);
        }
      }
    }
    process.exit(1);
  }

  copyStaticAssets();
  console.log(`Build complete${IS_PROD ? " (production)" : ""}`);
}

await build();

if (IS_WATCH) {
  console.log("Watching for changes...");
  const watcher = Bun.serve({
    port: 0,
    fetch(): Response {
      return new Response("build watcher");
    },
  });

  const { watch } = await import("node:fs");
  watch(join(ROOT, "src"), { recursive: true }, async () => {
    try {
      await build();
    } catch (e: unknown) {
      console.error("Build failed:", e);
    }
  });

  process.on("SIGINT", () => {
    watcher.stop();
    process.exit(0);
  });
}
