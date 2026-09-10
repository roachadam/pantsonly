import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { JSDOM } from "jsdom";

const rulesSource = await readFile(new URL("../rules.js", import.meta.url), "utf8");
const contentSource = await readFile(new URL("../content.js", import.meta.url), "utf8");
const hidden = "data-no-youtube-shorts-hidden";

function start(html, { language = "en" } = {}) {
  const dom = new JSDOM(`<!doctype html><html lang="${language}"><body>${html}</body></html>`, {
    pretendToBeVisual: true,
    runScripts: "outside-only",
    url: "https://www.youtube.com/results?search_query=cooking"
  });
  dom.window.eval(rulesSource);
  dom.window.eval(contentSource);
  return dom;
}

function settle(dom) {
  return new Promise((resolve) => dom.window.setTimeout(resolve, 35));
}

function stop(dom) {
  dom.window.dispatchEvent(new dom.window.PageTransitionEvent("pagehide"));
  dom.window.close();
}

test("hides a Shorts search shelf without hiding the search page", () => {
  const dom = start(`
    <ytd-search id="search">
      <div id="contents">
        <grid-shelf-view-model id="shorts"><a href="/shorts/abc">Short</a></grid-shelf-view-model>
        <ytd-video-renderer id="video"><a href="/watch?v=normal">Normal</a></ytd-video-renderer>
      </div>
    </ytd-search>`);

  assert.equal(dom.window.document.querySelector("#shorts").getAttribute(hidden), "shelf");
  assert.equal(dom.window.document.querySelector("#search").hasAttribute(hidden), false);
  assert.equal(dom.window.document.querySelector("#contents").hasAttribute(hidden), false);
  assert.equal(dom.window.document.querySelector("#video").hasAttribute(hidden), false);
  stop(dom);
});

test("keeps a mixed shelf and its ordinary video visible", () => {
  const dom = start(`
    <grid-shelf-view-model id="mixed">
      <ytm-shorts-lockup-view-model-v2 id="short"><a href="/shorts/abc">Short</a></ytm-shorts-lockup-view-model-v2>
      <ytd-video-renderer id="video"><a href="/watch?v=normal">Normal</a></ytd-video-renderer>
    </grid-shelf-view-model>`);

  assert.equal(dom.window.document.querySelector("#mixed").hasAttribute(hidden), false);
  assert.equal(dom.window.document.querySelector("#short").getAttribute(hidden), "dedicated");
  assert.equal(dom.window.document.querySelector("#video").hasAttribute(hidden), false);
  stop(dom);
});

test("recognizes a localized linkless navigation label", () => {
  const dom = start(`
    <ytd-guide-entry-renderer id="shorts-nav"><span title="ショート">ショート</span></ytd-guide-entry-renderer>
    <ytd-guide-entry-renderer id="home-nav"><span title="ホーム">ホーム</span></ytd-guide-entry-renderer>`,
  { language: "ja" });

  assert.equal(dom.window.document.querySelector("#shorts-nav").getAttribute(hidden), "navigation");
  assert.equal(dom.window.document.querySelector("#home-nav").hasAttribute(hidden), false);
  stop(dom);
});

test("detects a Shorts href attached after insertion", async () => {
  const dom = start(`<ytd-video-renderer id="card"><a id="link">Pending</a></ytd-video-renderer>`);
  const link = dom.window.document.querySelector("#link");
  link.setAttribute("href", "/shorts/late");
  await settle(dom);

  assert.equal(dom.window.document.querySelector("#card").getAttribute(hidden), "card");
  stop(dom);
});

test("unhides a recycled card when it becomes an ordinary video", async () => {
  const dom = start(`<ytd-video-renderer id="card"><a id="link" href="/shorts/old">Old</a></ytd-video-renderer>`);
  const card = dom.window.document.querySelector("#card");
  assert.equal(card.getAttribute(hidden), "card");

  dom.window.document.querySelector("#link").setAttribute("href", "/watch?v=ordinary");
  await settle(dom);
  assert.equal(card.hasAttribute(hidden), false);
  stop(dom);
});

test("processes multiple independently inserted mutation roots", async () => {
  const dom = start(`<main id="feed"></main>`);
  const feed = dom.window.document.querySelector("#feed");
  feed.insertAdjacentHTML("beforeend", '<ytd-video-renderer id="one"><a href="/shorts/1"></a></ytd-video-renderer>');
  feed.insertAdjacentHTML("beforeend", '<ytd-video-renderer id="two"><a href="/shorts/2"></a></ytd-video-renderer>');
  await settle(dom);

  assert.equal(dom.window.document.querySelector("#one").getAttribute(hidden), "card");
  assert.equal(dom.window.document.querySelector("#two").getAttribute(hidden), "card");
  stop(dom);
});

test("cancels Shorts clicks during capture phase", () => {
  const dom = start(`<ytd-video-renderer><a id="link" href="/shorts/click">Short</a></ytd-video-renderer>`);
  const event = new dom.window.MouseEvent("click", { bubbles: true, cancelable: true });
  const allowed = dom.window.document.querySelector("#link").dispatchEvent(event);
  assert.equal(allowed, false);
  assert.equal(event.defaultPrevented, true);
  stop(dom);
});
