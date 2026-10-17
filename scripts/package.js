const { readFileSync, mkdtempSync, mkdirSync, writeFileSync, utimesSync, rmSync, renameSync } = require("node:fs");
const { join, resolve, dirname } = require("node:path");
const { tmpdir } = require("node:os");
const { execFileSync } = require("node:child_process");

const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const version = manifest.version;
if (!/^\d+(?:\.\d+){0,3}$/.test(version)) throw new Error("Invalid package version");
const files = ["manifest.json", ...manifest.background.scripts,
  ...Object.values(manifest.icons), manifest.action.default_icon];
const stage = mkdtempSync(join(tmpdir(), "jomo-package-"));
const output = resolve("dist", `jomo-${version}.xpi`);
try {
  for (const file of [...new Set(files)].sort()) {
    if (file.startsWith("/") || file.split("/").includes("..")) throw new Error("Invalid asset path");
    const target = join(stage, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, readFileSync(file), { mode: 0o644 });
    utimesSync(target, new Date("2000-01-01T00:00:00Z"), new Date("2000-01-01T00:00:00Z"));
  }
  execFileSync("zip", ["-X", "-q", "package.xpi", ...new Set(files.sort())], {
    cwd: stage, env: { ...process.env, TZ: "UTC" },
  });
  execFileSync("unzip", ["-t", join(stage, "package.xpi")]);
  mkdirSync(dirname(output), { recursive: true });
  // Copy via a sibling file so the final name only appears after validation.
  writeFileSync(`${output}.tmp`, readFileSync(join(stage, "package.xpi")));
  renameSync(`${output}.tmp`, output);
  console.log(output);
} finally {
  rmSync(stage, { recursive: true, force: true });
}
