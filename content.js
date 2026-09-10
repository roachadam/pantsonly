(function blockYouTubeShorts() {
  "use strict";

  const RULES = globalThis.NoYouTubeShortsRules;
  if (!RULES) throw new Error("PantsOnly rules were not loaded");

  const SHORTS_PATH = new RegExp(RULES.shortsPathSource, "i");
  const DIRECT_SHORTS = RULES.directShortsSelectors.join(",");
  const SHORTS_SIGNALS = RULES.semanticSignalSelectors.join(",");
  const DEDICATED_SHELVES = RULES.dedicatedShelfSelectors.join(",");
  const GENERIC_SHELVES = RULES.genericShelfSelectors.join(",");
  const CARDS = RULES.cardSelectors.join(",");
  const NAVIGATION = RULES.navigationSelectors.join(",");
  const PROTECTED = RULES.protectedSelectors.join(",");
  const HIDDEN_ATTRIBUTE = "data-no-youtube-shorts-hidden";
  const LEGACY_CLASS = "no-youtube-shorts-hidden";
  const dirtyRoots = new Set();
  const hiddenElements = new Set();
  const localizedLabels = new Set(
    RULES.localizedShortsLabels.map((label) => normalizeLabel(label))
  );

  let scanQueued = false;
  let scanFrameId;
  let observer;
  let hiddenThisPass = 0;

  function normalizeLabel(value) {
    return String(value || "")
      .normalize("NFKC")
      .replace(/\s+/gu, " ")
      .trim()
      .toLocaleLowerCase(document.documentElement.lang || undefined);
  }

  function isShortsUrl(rawUrl) {
    try {
      return SHORTS_PATH.test(new URL(rawUrl, location.origin).pathname);
    } catch {
      return false;
    }
  }

  function isWatchUrl(rawUrl) {
    try {
      return new URL(rawUrl, location.origin).pathname === "/watch";
    } catch {
      return false;
    }
  }

  function leaveShorts() {
    if (!SHORTS_PATH.test(location.pathname)) return false;
    document.documentElement.classList.add("no-youtube-shorts-block-page");
    location.replace(`${location.origin}/?no_shorts=1`);
    return true;
  }

  function isProtected(element) {
    return element.matches(PROTECTED);
  }

  function hide(element, reason) {
    if (!element || isProtected(element)) return false;
    const existingReason = element.getAttribute(HIDDEN_ATTRIBUTE);
    if (existingReason && shouldRemainHidden(element, existingReason)) {
      hiddenElements.add(element);
      return true;
    }
    if (element.getAttribute(HIDDEN_ATTRIBUTE) !== reason) {
      element.setAttribute(HIDDEN_ATTRIBUTE, reason);
      hiddenThisPass += 1;
    }
    hiddenElements.add(element);
    return true;
  }

  function unhide(element) {
    element.removeAttribute(HIDDEN_ATTRIBUTE);
    element.classList.remove(LEGACY_CLASS);
    hiddenElements.delete(element);
  }

  function elementsMatching(root, selector) {
    const matches = [];
    if (root instanceof Element && root.matches(selector)) matches.push(root);
    root.querySelectorAll(selector).forEach((element) => matches.push(element));
    return matches;
  }

  function containsShortsLink(element) {
    if (element.matches("[href]")) {
      const href = element.getAttribute("href") || element.href;
      if (isShortsUrl(href)) return true;
    }
    return [...element.querySelectorAll("[href]")].some((link) =>
      isShortsUrl(link.getAttribute("href") || link.href)
    );
  }

  function containsWatchLink(element) {
    return [...element.querySelectorAll("[href]")].some((link) =>
      isWatchUrl(link.getAttribute("href") || link.href)
    );
  }

  function containsSemanticSignal(element) {
    return element.matches(SHORTS_SIGNALS) || Boolean(element.querySelector(SHORTS_SIGNALS));
  }

  function hasLocalizedLabel(element) {
    const labelled = [element, ...element.querySelectorAll("[title], [aria-label]")];
    for (const candidate of labelled) {
      if (localizedLabels.has(normalizeLabel(candidate.getAttribute("title")))) return true;
      if (localizedLabels.has(normalizeLabel(candidate.getAttribute("aria-label")))) return true;
    }
    return localizedLabels.has(normalizeLabel(element.textContent));
  }

  function isDedicatedShelf(element) {
    return element.matches(DEDICATED_SHELVES);
  }

  function isSafeShortsShelf(element) {
    if (isDedicatedShelf(element)) return true;
    return element.matches(GENERIC_SHELVES) &&
      containsSemanticSignal(element) &&
      !containsWatchLink(element);
  }

  function shouldRemainHidden(element, reason) {
    if (!element.isConnected || isProtected(element)) return false;
    switch (reason) {
      case "dedicated":
        return element.matches(DIRECT_SHORTS);
      case "shelf":
        return isSafeShortsShelf(element);
      case "card":
        return element.matches(CARDS) && containsSemanticSignal(element);
      case "navigation":
        return element.matches(NAVIGATION) &&
          (containsSemanticSignal(element) || hasLocalizedLabel(element));
      case "link":
        return element.matches("[href]") &&
          isShortsUrl(element.getAttribute("href") || element.href);
      default:
        return false;
    }
  }

  function revalidateHidden() {
    for (const element of [...hiddenElements]) {
      const reason = element.getAttribute(HIDDEN_ATTRIBUTE);
      if (!reason || !shouldRemainHidden(element, reason)) unhide(element);
    }
  }

  function processSignal(signal) {
    const isDedicated = signal.matches(DIRECT_SHORTS);
    if (isDedicated) hide(signal, "dedicated");

    const shelf = signal.closest(`${DEDICATED_SHELVES},${GENERIC_SHELVES}`);
    if (shelf && isSafeShortsShelf(shelf)) hide(shelf, "shelf");
    if (isDedicated) return;

    const navigation = signal.closest(NAVIGATION);
    if (navigation) {
      hide(navigation, "navigation");
      return;
    }

    const card = signal.closest(CARDS);
    if (card) {
      hide(card, "card");
      return;
    }

    if (signal.matches("[href]") && containsShortsLink(signal)) hide(signal, "link");
  }

  function scan(root = document) {
    if (leaveShorts() || !(root instanceof Element || root instanceof Document)) return;

    elementsMatching(root, DIRECT_SHORTS).forEach((element) => hide(element, "dedicated"));
    elementsMatching(root, SHORTS_SIGNALS).forEach(processSignal);

    // Text is deliberately evaluated only on known navigation/tab/chip wrappers.
    // It cannot climb into search results or a broad feed container.
    elementsMatching(root, NAVIGATION).forEach((element) => {
      if (hasLocalizedLabel(element)) hide(element, "navigation");
    });
  }

  function minimalDirtyRoots(roots) {
    return roots.filter((root, index) =>
      !roots.some((other, otherIndex) =>
        index !== otherIndex && other instanceof Element && other.contains(root)
      )
    );
  }

  function flushScans() {
    scanQueued = false;
    scanFrameId = undefined;
    hiddenThisPass = 0;
    const connected = [...dirtyRoots].map((root) =>
      root === document || root.isConnected ? root : document
    );
    dirtyRoots.clear();
    for (const root of minimalDirtyRoots([...new Set(connected)])) scan(root);
    revalidateHidden();

    if (localStorage.getItem("no-youtube-shorts-debug") === "1" && hiddenThisPass) {
      console.debug(`[PantsOnly] hid or reclassified ${hiddenThisPass} elements`);
    }
  }

  function queueScan(root = document) {
    dirtyRoots.add(root);
    if (scanQueued) return;
    scanQueued = true;
    scanFrameId = requestAnimationFrame(flushScans);
  }

  document.addEventListener("click", (event) => {
    const link = event.target instanceof Element ? event.target.closest("[href]") : null;
    const href = link && (link.getAttribute("href") || link.href);
    if (!link || !isShortsUrl(href)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    processSignal(link);
  }, true);

  observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === "attributes") {
        queueScan(record.target);
        continue;
      }
      for (const node of record.addedNodes) {
        if (node instanceof Element) queueScan(node);
      }
      if (record.removedNodes.length) queueScan(record.target);
    }
  });

  if (!leaveShorts()) {
    const start = () => {
      document.querySelectorAll(`.${LEGACY_CLASS}`).forEach(unhide);
      document.querySelectorAll(`[${HIDDEN_ATTRIBUTE}]`).forEach((element) => {
        hiddenElements.add(element);
      });
      scan();
      revalidateHidden();
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: RULES.watchedAttributes
      });
    };
    if (document.documentElement) start();
    else document.addEventListener("DOMContentLoaded", start, { once: true });
  }

  window.addEventListener("yt-navigate-finish", () => {
    if (!leaveShorts()) queueScan(document);
  });
  window.addEventListener("popstate", () => {
    if (!leaveShorts()) queueScan(document);
  });
  window.addEventListener("pagehide", () => {
    observer?.disconnect();
    dirtyRoots.clear();
    hiddenElements.clear();
    if (scanFrameId !== undefined) cancelAnimationFrame(scanFrameId);
    scanFrameId = undefined;
    scanQueued = false;
  });

  if (new URLSearchParams(location.search).has("no_shorts")) {
    window.addEventListener("DOMContentLoaded", () => {
      const notice = document.createElement("div");
      notice.id = "no-youtube-shorts-notice";
      const extensionApi = globalThis.browser ?? globalThis.chrome;
      notice.textContent = extensionApi?.i18n?.getMessage("shortsBlocked") || "Shorts blocked";
      document.body.append(notice);
      setTimeout(() => notice.remove(), 2200);
      history.replaceState(history.state, "", "/");
    }, { once: true });
  }
})();
