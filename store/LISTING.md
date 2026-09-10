# Browser-store listing

## Name

PantsOnly - Block YouTube Shorts

## Short description

PantsOnly removes YouTube Shorts from navigation, feeds, search,
recommendations, and direct links.

## Full description

PantsOnly removes Shorts throughout YouTube while leaving ordinary videos
intact. It handles Home, Search, Subscriptions, channel pages,
recommendations, navigation links, infinite scrolling, and direct Shorts URLs.

The blocker uses YouTube renderer names, semantic attributes, and `/shorts`
destinations instead of depending on a single fragile CSS class. It continually
handles YouTube's single-page navigation and restores nodes if YouTube recycles
them into ordinary video cards.

Privacy is deliberately simple: no analytics, accounts, ads, remote code, data
collection, or extension-originated network requests. All matching happens
locally in the browser.

Source code and issue reporting are available from the project homepage.

## Privacy questionnaire

- Single purpose: Remove YouTube Shorts.
- Website access: `youtube.com` only, required to identify and hide Shorts.
- `webNavigation`: Required to block direct and single-page navigation into the
  Shorts player.
- Data collection: None.
- Data transmission: None.
- Remote code: None.
- Advertising or affiliate behavior: None.

## Reviewer test steps

1. Search YouTube for `iphone duo`.
2. Confirm ordinary `/watch` results remain visible.
3. Confirm Shorts shelves and individual `/shorts` cards are absent while
   scrolling.
4. Confirm the Shorts navigation entry is absent.
5. Open a direct `https://www.youtube.com/shorts/...` link and confirm it returns
   to YouTube Home with a short blocked notice.

## Required listing artwork

The extension icons are ready under `assets/icons`. The 1400×560 marquee and
440×280 promotional graphics are ready under `assets/store`. Reproducible,
full-bleed 1280×800 browser screenshots are stored under
`assets/store/screenshots`. Regenerate them with `npm run screenshots:store`.
They show live YouTube pages rather than mocked UI.

## Trademark notice

YouTube is a trademark of Google LLC. This project is independent and is not
affiliated with, endorsed by, or sponsored by Google or YouTube.
