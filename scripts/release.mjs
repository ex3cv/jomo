import { readFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync("manifest.json", "utf8"));
const { RELEASE_TAG: tag, FORGEJO_API_URL: api, FORGEJO_REPOSITORY: repository,
  FORGEJO_TOKEN: token } = process.env;
if (tag !== `v${version}`) throw new Error("Tag must equal v + manifest version");
if (process.argv.includes("--check-tag")) process.exit(0);
if (!api || !repository || !token) throw new Error("Missing Forgejo release environment");
const filename = `jomo-${version}.xpi`;
const archive = readFileSync(`dist/${filename}`);
const base = `${api}/repos/${repository}/releases`;
async function request(url, method, body) {
  const response = await fetch(url, {
    method,
    headers: { Authorization: `token ${token}`,
      ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }) },
    body: body instanceof FormData ? body : JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Forgejo ${method} failed: HTTP ${response.status}`);
  return response.json();
}
const existing = await fetch(`${base}/tags/${encodeURIComponent(tag)}`, {
  headers: { Authorization: `token ${token}` },
});
if (existing.status !== 404) throw new Error(`Refusing release creation: tag lookup returned ${existing.status}`);
const release = await request(base, "POST", {
  tag_name: tag, name: tag, draft: true,
  body: "Unsigned Firefox extension. This XPI requires Mozilla signing for normal installation in standard Firefox.",
});
const form = new FormData();
form.append("attachment", new Blob([archive], { type: "application/x-xpinstall" }), filename);
await request(`${base}/${release.id}/assets?name=${encodeURIComponent(filename)}`, "POST", form);
await request(`${base}/${release.id}`, "PATCH", { draft: false });
console.log(`Published ${tag}: ${filename}`);
