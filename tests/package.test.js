const { test } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync, spawnSync } = require("node:child_process");
const { mkdtempSync, cpSync, readFileSync, writeFileSync, rmSync, utimesSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");

const root = join(__dirname, "..");
test("package is a valid, reproducible XPI containing only runtime files", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "jomo-test-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  for (const file of ["Makefile", "manifest.json", "background.js", "icons", "scripts", "README.md", "tests", ".forgejo"]) {
    cpSync(join(root, file), join(dir, file), { recursive: true });
  }
  const manifest = JSON.parse(readFileSync(join(dir, "manifest.json")));
  manifest.version = "1.2.3";
  writeFileSync(join(dir, "manifest.json"), JSON.stringify(manifest));
  const archive = join(dir, "dist/jomo-1.2.3.xpi");
  execFileSync("make", ["package"], { cwd: dir });
  execFileSync("unzip", ["-t", archive]);
  const entries = execFileSync("unzip", ["-Z1", archive], { encoding: "utf8" }).trim().split("\n");
  assert.deepEqual(entries.sort(), ["background.js", "manifest.json", "icons/jomo.svg",
    ...[16, 32, 48, 96].map((size) => `icons/jomo-${size}.png`)].sort());
  assert.deepEqual(JSON.parse(execFileSync("unzip", ["-p", archive, "manifest.json"])), manifest);
  for (const entry of entries) {
    assert.deepEqual(execFileSync("unzip", ["-p", archive, entry]), readFileSync(join(dir, entry)));
  }
  const first = readFileSync(archive);
  utimesSync(join(dir, "background.js"), new Date(), new Date());
  execFileSync("make", ["package"], { cwd: dir });
  assert.deepEqual(readFileSync(archive), first);
  rmSync(join(dir, "icons/jomo-16.png"));
  assert.notEqual(spawnSync("make", ["package"], { cwd: dir }).status, 0);
});

test("release tag must match the manifest version", () => {
  const { version } = JSON.parse(readFileSync(join(root, "manifest.json")));
  for (const [tag, succeeds] of [[`v${version}`, true], ["v9.9.9", false], [version, false]]) {
    const result = spawnSync(process.execPath, ["scripts/release.mjs", "--check-tag"], {
      cwd: root, env: { ...process.env, RELEASE_TAG: tag },
    });
    assert.equal(result.status === 0, succeeds);
  }
});

for (const scenario of ["success", "existing", "create failure", "upload failure", "publish failure"]) {
  test(`release API flow: ${scenario}`, (t) => {
    const dir = mkdtempSync(join(tmpdir(), "jomo-release-test-"));
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    cpSync(join(root, "manifest.json"), join(dir, "manifest.json"));
    const { version } = JSON.parse(readFileSync(join(dir, "manifest.json")));
    require("node:fs").mkdirSync(join(dir, "dist"));
    writeFileSync(join(dir, `dist/jomo-${version}.xpi`), "fake archive for API transport test");
    const script = `
      import assert from 'node:assert/strict';
      const scenario = ${JSON.stringify(scenario)};
      const calls = [];
      globalThis.fetch = async (url, options = {}) => {
        calls.push(options.method || 'GET');
        assert.equal(options.headers.Authorization, 'token test-token');
        let status = 200;
        if (calls.length === 1) status = scenario === 'existing' ? 200 : 404;
        if (options.method === 'POST' && !url.includes('/assets')) {
          assert.equal(JSON.parse(options.body).draft, true);
          status = scenario === 'create failure' ? 500 : 201;
        }
        if (url.includes('/assets')) {
          assert.equal(options.body.get('attachment').name, 'jomo-${version}.xpi');
          status = scenario === 'upload failure' ? 500 : 201;
        }
        if (options.method === 'PATCH') {
          assert.deepEqual(JSON.parse(options.body), { draft: false });
          status = scenario === 'publish failure' ? 500 : 200;
        }
        return new Response(JSON.stringify({ id: 7 }), { status });
      };
      let failed = false;
      try { await import(${JSON.stringify(require("node:url").pathToFileURL(join(root, "scripts/release.mjs")).href)}); }
      catch { failed = true; }
      assert.equal(failed, scenario !== 'success');
      const count = { success: 4, existing: 1, 'create failure': 2, 'upload failure': 3, 'publish failure': 4 }[scenario];
      assert.deepEqual(calls, ['GET', 'POST', 'POST', 'PATCH'].slice(0, count));
    `;
    execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      cwd: dir, env: { ...process.env, RELEASE_TAG: `v${version}`, FORGEJO_API_URL: "https://forgejo.invalid/api/v1",
        FORGEJO_REPOSITORY: "owner/jomo", FORGEJO_TOKEN: "test-token" },
    });
  });
}
