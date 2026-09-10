import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../background.js", import.meta.url), "utf8");

function loadBackground(namespace = "browser") {
  const listeners = [];
  const updates = [];
  const event = {
    addListener(listener, filter) {
      listeners.push({ listener, filter });
    }
  };
  const extensionApi = {
      tabs: { update: (...arguments_) => updates.push(arguments_) },
      webNavigation: {
        onBeforeNavigate: event,
        onHistoryStateUpdated: event,
        onReferenceFragmentUpdated: event
      }
  };
  const context = vm.createContext({ URL, [namespace]: extensionApi });
  vm.runInContext(source, context);
  return { listeners, updates };
}

test("background guard redirects direct and SPA Shorts navigation", () => {
  const { listeners, updates } = loadBackground();
  assert.equal(listeners.length, 3);
  for (const { filter } of listeners) {
    assert.deepEqual(
      JSON.parse(JSON.stringify(filter.url)),
      [{ hostEquals: "youtube.com" }, { hostSuffix: ".youtube.com" }]
    );
  }

  listeners[0].listener({
    frameId: 0,
    tabId: 42,
    url: "https://www.youtube.com/shorts/abc?feature=share"
  });
  assert.deepEqual(
    JSON.parse(JSON.stringify(updates)),
    [[42, { url: "https://www.youtube.com/?no_shorts=1" }]]
  );
});

test("background guard supports the Chromium chrome namespace", () => {
  const { listeners, updates } = loadBackground("chrome");
  listeners[0].listener({
    frameId: 0,
    tabId: 7,
    url: "https://m.youtube.com/shorts/chromium"
  });
  assert.deepEqual(
    JSON.parse(JSON.stringify(updates)),
    [[7, { url: "https://m.youtube.com/?no_shorts=1" }]]
  );
});

test("background guard ignores ordinary videos and subframes", () => {
  const { listeners, updates } = loadBackground();
  listeners[0].listener({ frameId: 0, tabId: 1, url: "https://youtube.com/watch?v=abc" });
  listeners[0].listener({ frameId: 2, tabId: 1, url: "https://youtube.com/shorts/abc" });
  assert.deepEqual(updates, []);
});
