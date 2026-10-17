# Developing JOMO

For JOMO's purpose, installation, and usage, see the [README](../README.md).
Run all commands below from the repository root.

## Repository structure and architecture

- [manifest.json](../manifest.json): Firefox compatibility, toolbar action, icons,
  and the declaration that JOMO collects no data.
- [background.js](../background.js): the sole application script. A toolbar click
  enumerates windows and sequentially rechecks and removes eligible tabs. A
  single in-memory flag prevents overlapping cleanup; `finally` resets it.
- [tests/background.test.js](../tests/background.test.js): behavior tests and
  manifest/icon validation using Node's built-in test runner and browser API fakes.
- [Makefile](../Makefile): authoritative local and CI validation commands.
- [icons/](../icons/): canonical SVG source and generated PNGs.
- [.forgejo/workflows/test.yml](../.forgejo/workflows/test.yml): CI orchestration.

There are no application frameworks, runtime dependencies, or persistent storage.
Only the toolbar listener triggers cleanup; loading the script does not remove tabs.

## Development environment and validation

Use Node.js 18 or newer, Make, `zip`, `unzip`, and `xmllint` (libxml2, for SVG
XML validation). Release publishing runs on Node.js 24 in CI.
No npm install, runtime dependencies, or bundler:

```sh
make test   # Node's built-in test runner
make check  # Tests, JavaScript syntax checks, and manifest JSON validation
```

Tests run the actual background script with lightweight browser API fakes. They
cover toolbar-only cleanup, pinned tabs, multiple windows, private and non-regular
windows, empty states, eligibility changes, disappearing tabs/windows, API errors,
repeated clicks, permission scope, icon paths, PNG dimensions, and SVG XML validity.
These checks do not prove actual Firefox behavior or replace Firefox's manifest
validation when loading the extension.

The engineering approach is intentionally modest:

- Follow KISS and YAGNI: build only what the current requirements need.
- Keep dependencies minimal and prefer browser-native APIs.
- Avoid unnecessary abstractions and configuration without a demonstrated need.
- Favor simple, understandable code.
- Test behavior rather than implementation details.

The same restraint applies to features. Organizing, tracking, and gamifying the
tabs would miss the point of letting them go.

## Running locally

Follow the [temporary installation steps](../README.md#installation). The repository
is loaded directly; no build is required. Use **Reload** for JOMO in
`about:debugging#/runtime/this-firefox` after editing extension files. Use
**Inspect** there to view the background console.

## Firefox considerations

JOMO requests **no API or host permissions**. Reading tab IDs, pinned state, and
window metadata and removing tabs do not require the `tabs` permission, which
would grant access to sensitive tab properties. See Mozilla's
[Tabs API documentation](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs).
JOMO does not read or store URLs or browsing history.

The Manifest V3 extension uses Firefox's supported
[background scripts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background),
not a Chrome service worker. Private browsing access is disabled in the manifest,
and cleanup also checks window and tab privacy explicitly.

### Cleanup safeguards and limitations

- Each candidate's window is checked again, then its current pinned state,
  privacy, and window ID are checked immediately before removal. Tabs moved out
  of the checked window are skipped for that click. Newly opened tabs are not
  added to an in-progress cleanup.
- Firefox's `tabs.remove()` has no atomic “remove only if still unpinned” option.
  A tab pinned after the final check but before removal can still be closed.
  Sequential checks minimize this race; they cannot eliminate it.
- Firefox may close a window or create a replacement tab when its last tab is
  removed. JOMO accepts that behavior and never calls `windows.remove()`.
- Clicks during cleanup are ignored, not queued. API failures skip the affected
  candidate and log a generic error without browsing data; enumeration failure
  ends that cleanup. There are no retries or user-facing error screens.

## Icon assets

A broad amber canopy, narrow stem, and charcoal outline keep the silhouette
readable on light and dark toolbars. No fireworks required. The transparent
vector source is `icons/jomo.svg`; the 16, 32, 48, and 96 pixel PNGs are rendered
from it with `rsvg-convert` (librsvg):

```sh
for size in 16 32 48 96; do
  rsvg-convert -w "$size" -h "$size" icons/jomo.svg -o "icons/jomo-$size.png"
done
```

The converter is only needed when regenerating artwork, not to run JOMO.

## Continuous integration

[Forgejo Actions](../.forgejo/workflows/test.yml) runs `make check` on pushes and
pull requests. CI only orchestrates validation defined by the Makefile; the same
command runs locally. The single job uses the `docker` runner label and the
`node:24-alpine` image, installs Make, `zip`, `unzip`, and `libxml2-utils` with `apk`, and checks out
source with `https://data.forgejo.org/actions/checkout@v6`.

The runner must support container jobs. Execution on the actual runner has not
been verified here. The separate [release workflow](../.forgejo/workflows/release.yml)
is described below.

## Manual Firefox verification

Manual Firefox verification has **not yet been performed**. Use disposable tabs
in a test profile: clicking JOMO affects every regular window in that profile.
Automated tests cannot establish actual Firefox background lifecycle behavior.

1. Install temporarily using the [README instructions](../README.md#installation).
   Verify installation and extension reload leave existing tabs alone. Open new
   windows and tabs; verify they stay.
2. Open two regular windows, each with pinned and unpinned tabs.
3. Open a private window with tabs. Create a separate popup window, for example
   from a page's developer console with
   `window.open("about:blank", "jomo-test", "popup,width=400,height=300")`.
   Allow that test popup if Firefox blocks it, and confirm it opens as a popup
   window rather than a regular tab.
4. Click JOMO in a regular window. Verify unpinned tabs in both regular windows
   disappear, pinned tabs remain, and private/popup windows are unaffected.
5. Test a regular window containing only one unpinned tab. Accept Firefox's native
   replacement-tab or window-closing behavior; JOMO must not explicitly close windows.
6. Open more disposable tabs and click repeatedly while cleanup runs. Verify no
   duplicate-removal errors, then open another tab and verify a later click works.
7. Inspect JOMO's background console via **Inspect** in `about:debugging` for errors.
8. With JOMO temporarily loaded, open several unpinned tabs and at least one pinned
   tab. Close the extension's background debugger and allow Firefox to suspend the
   background context. Click the JOMO toolbar icon to reactivate it. Verify that
   eligible unpinned tabs close and pinned tabs remain untouched.

## Building and packaging

There is no compilation or bundling step. From the repository root, run:

```sh
make package
```

This writes `dist/jomo-<version>.xpi`, using the version in `manifest.json`.
[scripts/package.js](../scripts/package.js) packages the manifest at the archive
root, its background script, and its referenced icons. Tests, documentation,
Git metadata, and CI/development files are excluded. Generated archives are ignored
by Git. Packaging requires system `zip` and `unzip`, avoiding an npm ZIP dependency.

Every archive is checked with `unzip -t` before it replaces the local output.
Sorted entries, fixed timestamps, normalized file modes, and omitted ZIP extra
fields make repeated packages reproducible with the same ZIP toolchain. Identical
bytes across different ZIP implementations are not guaranteed. `make test` also
checks archive contents, versioned filenames, repeatability, and missing assets.

## Automated releases

Commit the intended version in `manifest.json`, then push a matching tag:

```sh
git tag v0.1.0
git push origin v0.1.0
```

Use the actual manifest version; `v0.1.0` is an example. Pushing a tag matching
`v*` starts the [release workflow](../.forgejo/workflows/release.yml). It checks
out the tag, runs `make check`, requires the tag to equal `v` plus the manifest
version exactly, and runs `make package`. Only then does
[scripts/release.mjs](../scripts/release.mjs) create a draft Forgejo release, upload
the XPI, and publish the release. The asset appears under the repository's
**Releases** page as `jomo-<version>.xpi`.

Enable repository Actions and Releases and provide a container-capable runner
with the existing `docker` label. The job uses `node:24-alpine` and Forgejo's
automatic `FORGEJO_TOKEN` for this repository's release API. Tag-push jobs need
repository write access; no manually configured secret or long-lived token is
required. The runner needs network access to Forgejo, the action/image registries,
and Alpine package repositories.

Existing releases (including drafts) are rejected, never updated or overwritten.
API failures fail the job. If upload or publication fails after draft creation,
the draft remains for inspection; remove that failed draft manually before retrying.
API flow tests use fake responses; actual Forgejo execution remains unverified.

**Release artifacts are unsigned.** They are not normally installable in standard
Firefox without Mozilla signing. This workflow does not sign, submit to Mozilla,
or manage update feeds. The manifest's existing `update_url` is unchanged;
publishing a Forgejo asset does not update that feed. For development, use the
[temporary installation instructions](../README.md#installation).
