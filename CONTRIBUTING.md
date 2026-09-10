# Contributing

Thanks for helping keep YouTube Shorts out of ordinary browsing.

## Development setup

Requirements:

- Node.js 22.13 or newer
- npm
- Firefox 140 or newer for Firefox testing
- Chrome 105 or newer for Chromium testing

Install dependencies and run every check:

```sh
npm ci
npm run check
```

Create both store-ready archives:

```sh
npm run package
```

The resulting files are written to `dist/firefox` and `dist/chrome`.

For an interactive real-browser smoke test, run `npm run smoke:firefox` or
`npm run smoke:chrome`. Each command builds the correct manifest, launches a
temporary browser profile, and opens the standard `iphone duo` search fixture.

## Making blocker changes

`rules.js` is the source of truth for renderer, signal, card, navigation, and
safety selectors. Do not edit `hide-shorts.css` directly; regenerate it with
`npm run generate`.

Every bug fix should include a small DOM regression test that demonstrates the
broken YouTube structure and confirms that ordinary videos and page-level
containers remain visible. Avoid matching arbitrary class names or visible text
outside the tightly scoped navigation fallback.

Before opening a pull request, run `npm run check` and verify that
`hide-shorts.css` has no uncommitted generated changes.

## Reporting a YouTube layout regression

Please include:

- the affected YouTube page and locale
- whether the problem occurs in Firefox, Chromium, or both
- a screenshot
- a sanitized HTML excerpt around the smallest affected renderer, if possible

Do not include account identifiers, cookies, private recommendations, or other
personal information.
