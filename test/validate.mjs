import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import vm from "node:vm";

const manifest = JSON.parse(await readFile(new URL("../manifest.json", import.meta.url)));
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url)));
const firefoxManifest = JSON.parse(
  await readFile(new URL("../build/firefox/manifest.json", import.meta.url))
);
const chromeManifest = JSON.parse(
  await readFile(new URL("../build/chrome/manifest.json", import.meta.url))
);
const background = await readFile(new URL("../background.js", import.meta.url), "utf8");
const content = await readFile(new URL("../content.js", import.meta.url), "utf8");
const rulesSource = await readFile(new URL("../rules.js", import.meta.url), "utf8");
const css = await readFile(new URL("../hide-shorts.css", import.meta.url), "utf8");
const context = vm.createContext({});
vm.runInContext(rulesSource, context);
const rules = context.NoYouTubeShortsRules;

assert.equal(manifest.manifest_version, 3);
assert.equal(packageJson.name, "pantsonly");
assert.equal(packageJson.version, manifest.version);
assert.equal(manifest.default_locale, "en");
assert.equal(manifest.homepage_url, "https://github.com/roachadam/pantsonly");
assert.equal(packageJson.repository.url, "git+https://github.com/roachadam/pantsonly.git");
assert.deepEqual(manifest.content_scripts[0].js, ["rules.js", "content.js"]);
assert.deepEqual(manifest.permissions, ["webNavigation"]);
assert.deepEqual(manifest.host_permissions, ["https://*.youtube.com/*"]);
assert.equal(manifest.browser_specific_settings.gecko.strict_min_version, "142.0");
assert.equal(manifest.browser_specific_settings.gecko_android, undefined);
assert.match(manifest.browser_specific_settings.gecko.id, /^\{[0-9a-f-]{36}\}$/i);
assert.deepEqual(Object.keys(manifest.icons), ["16", "32", "48", "96", "128"]);
assert.match(background, /hostEquals: "youtube\.com"/);
assert.match(background, /onHistoryStateUpdated/);
assert.match(background, /globalThis\.browser \?\? globalThis\.chrome/);

assert.deepEqual(firefoxManifest, manifest);
assert.deepEqual(firefoxManifest.background, { scripts: ["background.js"] });
assert.deepEqual(chromeManifest.background, { service_worker: "background.js" });
assert.equal(chromeManifest.minimum_chrome_version, "105");
assert.equal("browser_specific_settings" in chromeManifest, false);
for (const size of [16, 32, 48, 96, 128]) {
  const icon = await readFile(new URL(`../build/firefox/assets/icons/icon-${size}.png`, import.meta.url));
  assert.ok(icon.length > 100, `icon-${size}.png should be packaged`);
}

assert.ok(rules.watchedAttributes.includes("href"));
assert.ok(rules.semanticSignalSelectors.includes('[overlay-style="SHORTS"]'));
assert.ok(rules.directShortsSelectors.includes("ytm-shorts-lockup-view-model-v2"));
assert.ok(rules.protectedSelectors.includes("ytd-search"));
assert.ok(rules.localizedShortsLabels.includes("ショート"));

assert.match(content, /MutationObserver/);
assert.match(content, /attributeFilter: RULES\.watchedAttributes/);
assert.match(content, /revalidateHidden/);
assert.match(content, /containsWatchLink/);
assert.match(content, /yt-navigate-finish/);
assert.match(content, /stopImmediatePropagation/);
assert.doesNotMatch(content, /findLabelledShelf/);

assert.match(css, /^\/\* Generated from rules\.js/m);
assert.match(css, /ytm-shorts-lockup-view-model-v2/);
assert.match(css, /grid-shelf-view-model/);
assert.match(css, /:not\(:has\(\[href\^="\/watch"\]\)\)/);
assert.doesNotMatch(css, /ytd-rich-grid-group:has/);
assert.doesNotMatch(css, /ytd-search:has/);
assert.ok(Buffer.byteLength(css) < 12_000, "generated CSS should remain compact");

const localeRoot = new URL("../_locales/", import.meta.url);
const localeDirectories = await readdir(localeRoot);
assert.ok(localeDirectories.length >= 10);
for (const locale of localeDirectories) {
  const messages = JSON.parse(await readFile(new URL(`${locale}/messages.json`, localeRoot)));
  assert.equal(messages.extensionName.message, "PantsOnly - Block YouTube Shorts");
  assert.ok(messages.extensionDescription.message);
  assert.ok(messages.shortsBlocked.message);
}

console.log("Manifest, generated rules, safety invariants, and locales validated.");
