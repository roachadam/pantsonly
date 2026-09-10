"use strict";

const extensionApi = globalThis.browser ?? globalThis.chrome;
const SHORTS_PATH = /^\/shorts(?:\/|$)/i;

function shortsFreeUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (!SHORTS_PATH.test(url.pathname)) return null;

    // Keep the user on YouTube, but outside the Shorts player. The marker lets
    // the content script display a small, self-clearing explanation.
    url.pathname = "/";
    url.search = "?no_shorts=1";
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

function redirectShorts(details) {
  if (details.frameId !== 0) return;
  const redirectUrl = shortsFreeUrl(details.url);
  if (redirectUrl) extensionApi.tabs.update(details.tabId, { url: redirectUrl });
}

const filter = {
  url: [
    { hostEquals: "youtube.com" },
    { hostSuffix: ".youtube.com" }
  ]
};
extensionApi.webNavigation.onBeforeNavigate.addListener(redirectShorts, filter);
extensionApi.webNavigation.onHistoryStateUpdated.addListener(redirectShorts, filter);
extensionApi.webNavigation.onReferenceFragmentUpdated.addListener(redirectShorts, filter);
