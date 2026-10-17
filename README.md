# JOMO

**Joy of Missing Out. A small Firefox extension for letting go of tabs.**

*You can't read the entire internet.*

*Your browser is not a retirement home for interesting articles.*

**One click. No negotiations.**

*The internet will still be there tomorrow.*

![JOMO mushroom cloud icon](icons/jomo-96.png)

We leave articles, documentation, GitHub repositories,
and discussions open for later. Eventually, the browser becomes an accidental
TODO list. Curiosity turns into obligation, and a row of tabs becomes a collection
of things we feel we should read, learn, or remember.

The internet is effectively infinite; your time and attention are not. JOMO helps you make a
conscious decision to let some of it go.

## What JOMO does

JOMO is a Firefox extension intended for open-source release. It:

- Provides a toolbar button that immediately closes **all eligible
  unpinned tabs across regular, non-private Firefox windows** when clicked.
- Preserves pinned tabs.
- Leaves private windows untouched.

The toolbar click itself is your decision. JOMO will never close tabs automatically.

## What it deliberately doesn't do

JOMO is not a productivity app, a tab manager, or a bookmarking system. It won't
move your digital obligations into a tidier pile.

There are no:

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

## Visual identity

The icon is a **mushroom cloud**: deliberately provocative, representing
the destruction of accumulated browser clutter, not violence against people.
The contrast is intentional: the icon says “Nuke the tabs.” The interface says
“It's okay to let go.” Any interface text will avoid aggressive language.

## Installation

Use desktop Firefox 109 or newer:

1. Download or clone this repository.
2. Open `about:debugging#/runtime/this-firefox` in Firefox.
3. Click **Load Temporary Add-on…** and select this repository's
   [manifest.json](manifest.json).
4. Pin JOMO to the toolbar from Firefox's Extensions menu if needed.

Temporary installation lasts until Firefox restarts. This repository does not
currently provide published Firefox Add-ons installation instructions.

## Usage

Click JOMO's toolbar button to immediately close unpinned tabs across **all
regular, non-private windows**, not just the current window. Pinned tabs remain;
private and non-regular windows are excluded. There is no confirmation, popup,
notification, or completion screen.

JOMO requests no access to website contents and does not collect telemetry or
store URLs or browsing history.

A few things to expect:

- Clicks while cleanup is running are ignored. Newly opened tabs and tabs moved
  to another window during cleanup may remain until another click.
- Avoid pinning tabs during cleanup: a tab pinned at the very last moment can
  still close because Firefox checks and closes tabs in separate steps.
- When a window's last tab closes, Firefox may close the window or create a
  replacement tab. JOMO leaves that behavior to Firefox.
- If Firefox cannot check or close a tab, it may remain open. JOMO does not retry
  automatically or show an error screen.
- JOMO provides no backup or undo. Firefox's own session behavior is independent
  of JOMO.

## Development

See [Developing JOMO](docs/development.md) for the repository structure, local
setup, validation, Firefox considerations, and packaging status.

## License

JOMO is open-source software licensed under the MIT License. See [LICENSE](LICENSE)⁠￼for details.
