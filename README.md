# PantsOnly

**PantsOnly - Block YouTube Shorts** is a small, privacy-friendly browser
extension that removes YouTube Shorts instead of merely hiding one sidebar
button. The same blocking logic supports Firefox, Zen, Chrome, Edge, and other
Chromium browsers.

It blocks:

- Shorts shelves on Home, Search, Subscriptions, and channel pages
- individual Shorts cards mixed into feeds and recommendations
- desktop, mini-sidebar, channel-tab, chip, and mobile navigation links
- dynamically loaded items during infinite scrolling and YouTube SPA navigation
- clicks and direct visits to `/shorts` URLs

It does not collect data, use analytics, load remote code, or make network
requests. See [PRIVACY.md](PRIVACY.md) for the full policy.

## Install for development

Install dependencies and build both browser targets:

```sh
npm ci
npm run build
```

### Firefox and Zen

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…**.
3. Select `build/firefox/manifest.json`.

Temporary add-ons disappear when the browser exits. Permanent Firefox and Zen
installation requires an AMO-signed package.

### Chrome and Chromium

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the `build/chrome` directory.

## Architecture

All functional code is shared:

- `rules.js` contains renderer, semantic, safety, and localization rules.
- `content.js` handles DOM classification, dynamic insertion, SPA navigation,
  click blocking, and recycled-node revalidation.
- `background.js` blocks direct navigation into the Shorts player and works with
  either the `browser` or `chrome` extension API namespace.
- `hide-shorts.css` is generated from `rules.js` for early, flash-free hiding.

`scripts/build.mjs` copies those shared files into browser-specific build
directories. The Firefox manifest uses an event-page background script and
Mozilla's required privacy metadata. The Chrome manifest uses a Manifest V3
service worker and omits Firefox-only metadata.

## How it remains effective

YouTube replaces page sections without full page loads. The extension combines
early CSS rules, a `MutationObserver`, SPA navigation listeners, capture-phase
click blocking, and a background URL guard. It identifies Shorts by both
YouTube renderer names and the more stable `/shorts` link destination, so a
wrapper rename alone does not defeat the block.

Visible localized text is used only as a last-resort signal inside known
navigation, tab, and chip components. URL, renderer, and semantic-attribute
signals are language-neutral.

## Safety and performance

- Dedicated Shorts shelves are removed, while mixed shelves retain ordinary
  `/watch` videos and lose only their Shorts cards.
- Page-level containers such as `ytd-search`, `#contents`, and rich-grid groups
  are explicitly protected from being hidden.
- Hidden nodes are revalidated and restored if YouTube recycles them into normal
  video cards during infinite scrolling.
- Mutation work is batched into animation frames and revalidation is limited to
  elements previously classified as Shorts.
- Generated CSS uses grouped `:is()` selectors rather than a large selector
  Cartesian product.

The controlled Firefox benchmark and results are documented in
[`benchmarks/performance-2026-09-10.md`](benchmarks/performance-2026-09-10.md).

## Development

```sh
npm ci
npm run check
npm run package
```

`npm run package` creates:

- `dist/firefox/pantsonly-firefox.zip`
- `dist/chrome/pantsonly-chrome.zip`

The checks regenerate the stylesheet, build both browser variants, run
behavioral DOM and cross-browser API tests, validate manifests/locales/icons,
and run Mozilla's add-on linter.

A scheduled GitHub Actions check also runs every day against live YouTube. It
first confirms that an unprotected search exposes Shorts, repeats the same
bounded scroll test with PantsOnly loaded, and fails if any visible Shorts links
remain or ordinary video results disappear. Each run retains screenshots and a
machine-readable report for 14 days. Run it locally with `npm run test:live`
after installing Playwright's Chromium build with
`npx playwright install chromium`.

For local diagnostics, set `localStorage["no-youtube-shorts-debug"]` to `"1"`
on YouTube and reload. The extension logs only local aggregate counts.

See [CONTRIBUTING.md](CONTRIBUTING.md) for development and regression-reporting
guidance and [CHANGELOG.md](CHANGELOG.md) for release history.

## License and trademark

Licensed under the [Mozilla Public License 2.0](LICENSE).

YouTube is a trademark of Google LLC. This project is independent and is not
affiliated with, endorsed by, or sponsored by Google or YouTube.
