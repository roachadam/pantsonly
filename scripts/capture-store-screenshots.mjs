import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const extensionPath = path.join(repositoryRoot, "build", "chrome");
const outputDirectory = path.join(repositoryRoot, "assets", "store", "screenshots");
const query = process.env.STORE_SCREENSHOT_QUERY ?? "dance videos";
const viewport = { width: 1280, height: 800 };
const shortsLinks = 'a[href^="/shorts/"], a[href*="youtube.com/shorts/"]';
const searchShortsLinks =
  'ytd-search a[href^="/shorts/"], ytd-search a[href*="youtube.com/shorts/"]';
const watchLinks = 'a[href^="/watch"], a[href*="youtube.com/watch"]';
const searchVideoLinks = 'ytd-search ytd-video-renderer a[href^="/watch"]';

await mkdir(outputDirectory, { recursive: true });

async function launch(extensionEnabled) {
  const profile = await mkdtemp(path.join(tmpdir(), "pantsonly-screenshots-"));
  const args = ["--lang=en-US", "--hide-scrollbars"];
  if (extensionEnabled) {
    args.push(
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    );
  }

  const context = await chromium.launchPersistentContext(profile, {
    channel: "chromium",
    headless: true,
    args,
    locale: "en-US",
    viewport,
    deviceScaleFactor: 1,
    colorScheme: "dark"
  });
  return { context, profile };
}

async function close(browser) {
  if (!browser) return;
  await browser.context.close();
  await rm(browser.profile, { recursive: true, force: true });
}

async function acceptConsent(page) {
  const button = page.getByRole("button", { name: /accept all|i agree/i }).first();
  if (await button.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await button.click();
    await page.waitForTimeout(1_000);
  }
}

async function openSearch(page) {
  await page.goto(
    `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
    { waitUntil: "domcontentloaded", timeout: 45_000 }
  );
  await acceptConsent(page);
  await page.locator("ytd-search, ytm-search").first().waitFor({
    state: "attached",
    timeout: 30_000
  });
  await page.waitForTimeout(2_000);
}

async function visibleCount(page, selector) {
  return page.locator(selector).evaluateAll((elements) =>
    elements.filter((element) => element.getClientRects().length > 0).length
  );
}

async function findShortsViewport(page) {
  for (let step = 0; step < 14; step += 1) {
    const link = page.locator(searchShortsLinks).filter({ visible: true }).first();
    if (await link.count()) {
      await link.scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);
      return {
        href: await link.getAttribute("href")
      };
    }
    await page.evaluate(() => window.scrollBy(0, Math.max(window.innerHeight * 0.8, 600)));
    await page.waitForTimeout(650);
  }
  throw new Error(`No visible Shorts result found for query: ${query}`);
}

async function showOrdinaryVideoResults(page) {
  const link = page.locator(searchVideoLinks).first();
  await link.waitFor({ state: "attached", timeout: 30_000 });
  await link.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  assert.ok(await visibleCount(page, searchVideoLinks), "No ordinary video result is visible.");
}

async function screenshot(page, filename) {
  await page.screenshot({
    path: path.join(outputDirectory, filename),
    fullPage: false,
    animations: "disabled"
  });
}

let baselineBrowser;
let protectedBrowser;

try {
  baselineBrowser = await launch(false);
  const baselinePage = baselineBrowser.context.pages()[0];
  await openSearch(baselinePage);
  const target = await findShortsViewport(baselinePage);
  assert.ok(target.href, "A Shorts result did not expose a usable URL.");
  assert.ok(
    await visibleCount(baselinePage, searchShortsLinks),
    "Baseline has no visible Shorts in search results."
  );
  await screenshot(baselinePage, "01-search-before.png");

  await close(baselineBrowser);
  baselineBrowser = null;

  protectedBrowser = await launch(true);
  const protectedPage = protectedBrowser.context.pages()[0];
  await openSearch(protectedPage);
  await showOrdinaryVideoResults(protectedPage);
  assert.equal(await visibleCount(protectedPage, shortsLinks), 0);
  assert.ok(await visibleCount(protectedPage, watchLinks), "Protected search lost ordinary videos.");
  await screenshot(protectedPage, "02-search-after.png");

  await protectedPage.goto("https://www.youtube.com/", {
    waitUntil: "domcontentloaded",
    timeout: 45_000
  });
  await protectedPage.waitForTimeout(2_000);
  assert.equal(await visibleCount(protectedPage, shortsLinks), 0);
  await screenshot(protectedPage, "03-home-after.png");

  await protectedPage.goto(new URL(target.href, "https://www.youtube.com/").href, {
    waitUntil: "domcontentloaded",
    timeout: 45_000
  }).catch((error) => {
    // The background guard replaces the navigation before Chromium commits it.
    // Playwright reports that successful early interception as ERR_ABORTED.
    if (!String(error).includes("ERR_ABORTED")) throw error;
  });
  await protectedPage.locator("#no-youtube-shorts-notice").waitFor({
    state: "visible",
    timeout: 10_000
  });
  await protectedPage.waitForTimeout(600);
  await screenshot(protectedPage, "04-direct-link-blocked.png");

  console.log(`Captured 4 store screenshots in ${outputDirectory}`);
} finally {
  await close(baselineBrowser);
  await close(protectedBrowser);
}
