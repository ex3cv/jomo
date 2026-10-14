# JOMO

*You can't read the entire internet.*

*Your browser is not a retirement home for interesting articles.*

**One click. No negotiations.**

*The internet will still be there tomorrow.*

**Joy of Missing Out. A small Firefox extension for letting go of tabs.**

We leave articles, documentation, GitHub repositories,
and discussions open for later. Eventually, the browser becomes an accidental
TODO list. Curiosity turns into obligation, and a row of tabs becomes a collection
of things we feel we should read, learn, or remember.

The internet is effectively infinite; your time and attention are not. JOMO helps you make a
conscious decision to let some of it go.

## What JOMO does

JOMO is a Firefox extension intended for open-source release. It will:

- Provide a toolbar button that immediately closes **all eligible
  unpinned tabs across regular, non-private Firefox windows** when clicked.
- Preserve pinned tabs.
- Leave private windows untouched.

The toolbar click itself is your decision. JOMO will never close tabs automatically.

## What it deliberately doesn't do

JOMO is not a productivity app, a tab manager, or a bookmarking system. It won't
move your digital obligations into a tidier pile.

There will be no:

- Confirmation dialogs, popups, or countdowns.
- Second chances offered by JOMO or unnecessary interactions.
- Saving tabs for later or maintaining a history of closed tabs.
- Statistics, streaks, or achievements.
- Guilt-inducing notifications.
- Automatic tab closing.
- User accounts or telemetry.

There is no backlog to maintain and no score to improve.

## Philosophy

An interesting link is an invitation, not a debt. JOMO exists to make declining
that invitation feel ordinary. It promises neither greater productivity nor a
cure for anything. It's just a small tool for letting go.

“No negotiations” is a core product principle. Letting go shouldn't require a
debate with a dialog box. JOMO helps you drop accumulated browser obligations
without guilt, hesitation, or unnecessary friction. You don't need another
opportunity to reconsider. That's precisely why JOMO exists.

The interaction should be calm, friendly, and reassuring. The personality can be
sarcastic, provocative, and slightly cynical. The joke is the absurdity of trying
to consume an endless internet, never the person with too many tabs open. No
shaming, no lectures about better habits.

The planned icon is a **mushroom cloud**: deliberately provocative, representing
the destruction of accumulated browser clutter, not violence against people.
The contrast is intentional: the icon says “Nuke the tabs.” The interface says
“It's okay to let go.” Any interface text will avoid aggressive language.

## Installation and use

Use desktop Firefox 109 or newer. There is no build step:

1. Download or clone this repository.
2. Open `about:debugging#/runtime/this-firefox` in Firefox.
3. Click **Load Temporary Add-on…** and select this repository's `manifest.json`.
4. Pin JOMO to the toolbar from Firefox's Extensions menu if needed.

Click JOMO's toolbar button to immediately close unpinned tabs across **all
regular, non-private windows**, not just the current window. Pinned tabs remain;
private and non-regular windows are excluded. There is no confirmation, popup,
notification, or completion screen. The temporary icon is a simple **J**;
the mushroom cloud artwork will come later.

Temporary installation lasts until Firefox restarts. Firefox Add-ons installation
instructions will be added when a published release is available.

### Permissions and compatibility

JOMO requests **no API or host permissions**. Reading tab IDs, pinned state, and
window metadata and removing tabs do not require the `tabs` permission, which
would grant access to sensitive tab properties. See Mozilla's
[Tabs API documentation](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs).
JOMO does not read or store URLs or browsing history.

The Manifest V3 extension uses Firefox's supported
[background scripts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background),
not a Chrome service worker. Private browsing access is disabled in the manifest,
and cleanup also checks window and tab privacy explicitly.

## Development

Use Node.js 18 or newer and Make. No npm install, dependencies, or bundler:

```sh
make test   # Node's built-in test runner
make check  # Tests, JavaScript syntax checks, and manifest JSON validation
```

Tests run the actual background script with lightweight browser API fakes. They
cover toolbar-only cleanup, pinned tabs, multiple windows, private and non-regular
windows, empty states, eligibility changes, disappearing tabs/windows, API errors,
repeated clicks, and permission scope. These checks do not prove actual Firefox
behavior or replace Firefox's manifest validation when loading the extension.

The engineering approach is intentionally modest:

- Follow KISS and YAGNI: build only what the current requirements need.
- Keep dependencies minimal and prefer browser-native APIs.
- Avoid unnecessary abstractions and configuration without a demonstrated need.
- Favor simple, understandable code.
- Test behavior rather than implementation details.

The same restraint applies to features. Organizing, tracking, and gamifying the
tabs would miss the point of letting them go.

### Manual Firefox verification

Manual Firefox verification has **not yet been performed**. Use disposable tabs
in a test profile: clicking JOMO affects every regular window in that profile.

1. Install temporarily using the steps above. Verify installation and extension
   reload leave existing tabs alone. Open new windows and tabs; verify they stay.
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

### Known limitations

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
- There is no JOMO backup or undo. Firefox's own session behavior is independent
  of JOMO.

## License

An open-source license will be selected and added before release. No license has
been granted yet.
