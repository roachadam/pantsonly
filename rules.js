(function defineNoYouTubeShortsRules() {
  "use strict";

  const rules = {
    shortsPathSource: "^/shorts(?:/|$)",
    shortsLinkSelector: '[href^="/shorts"], [href*="youtube.com/shorts/"]',
    directShortsSelectors: [
      "ytd-reel-shelf-renderer",
      "ytd-reel-item-renderer",
      "ytm-reel-shelf-renderer",
      "ytm-reel-item-renderer",
      "ytm-shorts-lockup-view-model",
      "ytm-shorts-lockup-view-model-v2",
      'ytd-rich-shelf-renderer[is-shorts]'
    ],
    semanticSignalSelectors: [
      '[href^="/shorts"]',
      '[href*="youtube.com/shorts/"]',
      '[overlay-style="SHORTS"]',
      '[data-style="SHORTS"]',
      '.shortsLockupViewModelHost',
      '.pivot-shorts',
      'ytm-shorts-lockup-view-model',
      'ytm-shorts-lockup-view-model-v2',
      '[is-shorts]',
      '[is-reel]'
    ],
    dedicatedShelfSelectors: [
      "ytd-reel-shelf-renderer",
      "ytm-reel-shelf-renderer",
      'ytd-rich-shelf-renderer[is-shorts]'
    ],
    genericShelfSelectors: [
      "ytd-rich-shelf-renderer",
      "grid-shelf-view-model",
      "ytm-rich-section-renderer"
    ],
    cardSelectors: [
      "ytd-reel-item-renderer",
      "ytm-reel-item-renderer",
      "ytm-shorts-lockup-view-model",
      "ytm-shorts-lockup-view-model-v2",
      ".ytGridShelfViewModelGridShelfItem",
      "ytd-rich-item-renderer",
      "ytd-video-renderer",
      "ytd-grid-video-renderer",
      "ytd-compact-video-renderer",
      "ytd-channel-video-player-renderer",
      "ytm-video-with-context-renderer"
    ],
    navigationSelectors: [
      "ytd-guide-entry-renderer",
      "ytd-mini-guide-entry-renderer",
      "ytd-guide-collapsible-entry-renderer",
      "yt-guide-entry-renderer",
      "yt-list-item-view-model",
      "yt-tab-shape",
      "tp-yt-paper-tab",
      "ytm-pivot-bar-item-renderer",
      "yt-chip-cloud-chip-renderer",
      "ytm-chip-cloud-chip-renderer"
    ],
    protectedSelectors: [
      "html",
      "body",
      "ytd-app",
      "ytm-app",
      "ytd-search",
      "ytd-browse",
      "ytd-section-list-renderer",
      "ytd-rich-grid-renderer",
      "ytd-rich-grid-group",
      "#contents"
    ],
    watchedAttributes: [
      "href",
      "title",
      "aria-label",
      "is-shorts",
      "is-reel",
      "overlay-style",
      "data-style",
      "tab-title"
    ],
    // Visible text is only a last-resort match within the navigation, tab, and
    // chip containers above. URL, attribute, and renderer signals come first.
    localizedShortsLabels: [
      "Shorts",
      "Short",
      "ショート",
      "ショート動画",
      "쇼츠",
      "短片",
      "短视频",
      "短影片",
      "Короткие видео",
      "Короткі відео",
      "Қысқа бейнелер",
      "वीडियो शॉर्ट्स",
      "YouTube शॉर्ट्स",
      "فيديوهات Shorts",
      "ویدیوهای کوتاه",
      "סרטונים קצרים"
    ]
  };

  for (const value of Object.values(rules)) {
    if (Array.isArray(value)) Object.freeze(value);
  }
  globalThis.NoYouTubeShortsRules = Object.freeze(rules);
})();
