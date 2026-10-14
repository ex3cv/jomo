const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");
const { execFileSync } = require("node:child_process");

const source = readFileSync(join(__dirname, "../background.js"), "utf8");

function setup(windows = [{ id: 1, type: "normal", incognito: false }], tabs = [
  { id: 1, windowId: 1, pinned: false, incognito: false },
]) {
  const removed = [];
  const errors = [];
  const listeners = [];
  const browser = {
    action: { onClicked: { addListener: (listener) => listeners.push(listener) } },
    windows: {
      getAll: async () => windows.map((window) => ({
        ...window, tabs: tabs.filter((tab) => tab.windowId === window.id).map((tab) => ({ ...tab })),
      })),
      get: async (id) => {
        const window = windows.find((window) => window.id === id);
        if (!window) throw new Error("Missing window");
        return { ...window };
      },
    },
    tabs: {
      get: async (id) => {
        const tab = tabs.find((tab) => tab.id === id);
        if (!tab) throw new Error("Missing tab");
        return { ...tab };
      },
      remove: async (id) => {
        const index = tabs.findIndex((tab) => tab.id === id);
        if (index === -1) throw new Error("Missing tab");
        removed.push(id);
        tabs.splice(index, 1);
      },
    },
  };
  vm.runInNewContext(source, { browser, console: { error: (...args) => errors.push(args) } });
  return { browser, removed, errors, tabs, windows, listeners, click: () => listeners[0]() };
}

test("initialization does nothing; toolbar click removes eligible tabs", async () => {
  const app = setup();
  assert.equal(app.listeners.length, 1);
  assert.deepEqual(app.removed, []);
  await app.click();
  assert.deepEqual(app.removed, [1]);
});

test("preserves pinned, private and non-regular tabs across multiple windows", async () => {
  const windows = [
    { id: 1, type: "normal", incognito: false },
    { id: 2, type: "normal", incognito: false },
    { id: 3, type: "normal", incognito: true },
    ...["popup", "panel", "devtools"].map((type, i) => ({ id: i + 4, type, incognito: false })),
  ];
  const tabs = windows.flatMap((window) => [false, true].map((pinned, i) => ({
    id: window.id * 10 + i, windowId: window.id, pinned, incognito: window.incognito,
  })));
  const app = setup(windows, tabs);
  await app.click();
  assert.deepEqual(app.removed, [10, 20]);
  assert.deepEqual(tabs.map((tab) => tab.id), [11, 21, 30, 31, 40, 41, 50, 51, 60, 61]);
});

for (const tabs of [[], [{ id: 1, windowId: 1, pinned: true }]]) {
  test(`no removal when ${tabs.length ? "all tabs are pinned" : "there are no tabs"}`, async () => {
    const app = setup(undefined, tabs);
    await app.click();
    assert.deepEqual(app.removed, []);
  });
}

test("empty window list is harmless", async () => {
  const app = setup([]);
  await app.click();
  assert.deepEqual(app.removed, []);
});

for (const change of ["pin", "move", "private", "disappear", "window disappears", "window becomes popup", "window becomes private"]) {
  test(`rechecks eligibility after enumeration: ${change}`, async () => {
    const app = setup();
    const enumerate = app.browser.windows.getAll;
    app.browser.windows.getAll = async () => {
      const snapshot = await enumerate();
      if (change === "pin") app.tabs[0].pinned = true;
      if (change === "move") app.tabs[0].windowId = 2;
      if (change === "private") app.tabs[0].incognito = true;
      if (change === "disappear") app.tabs.length = 0;
      if (change === "window disappears") app.windows.length = 0;
      if (change === "window becomes popup") app.windows[0].type = "popup";
      if (change === "window becomes private") app.windows[0].incognito = true;
      return snapshot;
    };
    await app.click();
    assert.deepEqual(app.removed, []);
  });
}

test("checks pinning after the asynchronous window check", async () => {
  const app = setup();
  const getWindow = app.browser.windows.get;
  app.browser.windows.get = async (id) => {
    app.tabs[0].pinned = true;
    return getWindow(id);
  };
  await app.click();
  assert.deepEqual(app.removed, []);
});

for (const [api, method] of [["windows", "getAll"], ["windows", "get"], ["tabs", "get"], ["tabs", "remove"]]) {
  test(`${api}.${method} failure is handled, sanitized, and releases the click guard`, async () => {
    const app = setup();
    const original = app.browser[api][method];
    app.browser[api][method] = async () => { throw new Error("Sensitive https://example.com/private"); };
    await app.click();
    assert.deepEqual(app.removed, []);
    assert.equal(app.errors.length, 1);
    assert.doesNotMatch(JSON.stringify(app.errors), /Sensitive|example.com/);
    app.browser[api][method] = original;
    await app.click();
    assert.deepEqual(app.removed, [1]);
  });
}

test("a disappearing tab during removal does not prevent subsequent removals", async () => {
  const app = setup(undefined, [1, 2].map((id) => ({ id, windowId: 1, pinned: false })));
  const remove = app.browser.tabs.remove;
  app.browser.tabs.remove = async (id) => {
    if (id === 1) {
      app.tabs.splice(0, 1);
      throw new Error("Tab disappeared");
    }
    await remove(id);
  };
  await app.click();
  assert.deepEqual(app.removed, [2]);
  assert.equal(app.errors.length, 1);
});

test("repeated clicks do not overlap, and a later click can clean again", async () => {
  const app = setup();
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const enumerate = app.browser.windows.getAll;
  let enumerations = 0;
  app.browser.windows.getAll = async () => {
    enumerations++;
    await gate;
    return enumerate();
  };
  const first = app.click();
  await app.click();
  await app.click();
  assert.equal(enumerations, 1);
  release();
  await first;
  assert.deepEqual(app.removed, [1]);
  app.tabs.push({ id: 2, windowId: 1, pinned: false });
  await app.click();
  assert.deepEqual(app.removed, [1, 2]);
});

test("manifest uses Firefox MV3 scripts without permissions or additional UI", () => {
  const manifest = JSON.parse(readFileSync(join(__dirname, "../manifest.json"), "utf8"));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.background, { scripts: ["background.js"] });
  for (const key of ["permissions", "host_permissions", "optional_permissions", "optional_host_permissions"]) {
    assert.deepEqual(manifest[key] ?? [], []);
  }
  assert.equal(manifest.incognito, "not_allowed");
  assert.equal(manifest.action.default_popup, undefined);
  assert.equal(manifest.options_ui, undefined);
  assert.equal(manifest.content_scripts, undefined);
  assert.ok(readFileSync(join(__dirname, "..", manifest.action.default_icon)).length);
});

test("manifest declares that JOMO collects no data", () => {
  const manifest = JSON.parse(readFileSync(join(__dirname, "../manifest.json"), "utf8"));
  assert.deepEqual(manifest.browser_specific_settings.gecko.data_collection_permissions.required, ["none"]);
});

test("manifest icon assets exist and PNG dimensions match every declared size", () => {
  const manifest = JSON.parse(readFileSync(join(__dirname, "../manifest.json"), "utf8"));
  assert.deepEqual(Object.keys(manifest.icons), ["16", "32", "48", "96"]);
  for (const [size, path] of Object.entries(manifest.icons)) {
    const png = readFileSync(join(__dirname, "..", path));
    assert.equal(path, `icons/jomo-${size}.png`);
    assert.deepEqual(png.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    assert.equal(png.toString("ascii", 12, 16), "IHDR");
    assert.equal(png.readUInt32BE(16), Number(size));
    assert.equal(png.readUInt32BE(20), Number(size));
  }
  assert.equal(manifest.action.default_icon, "icons/jomo.svg");
  assert.equal(manifest.action.default_title, "JOMO — Let go of unpinned tabs");
});

test("canonical toolbar SVG is well-formed XML with an SVG root", () => {
  const path = join(__dirname, "../icons/jomo.svg");
  execFileSync("xmllint", ["--nonet", "--noout", path]);
  const root = execFileSync("xmllint", ["--nonet", "--xpath",
    "concat(local-name(/*), '|', namespace-uri(/*))", path], { encoding: "utf8" });
  assert.equal(root.trim(), "svg|http://www.w3.org/2000/svg");
});
