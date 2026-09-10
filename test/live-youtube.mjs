import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const extensionPath = path.join(repositoryRoot, "build", "chrome");
const outputDirectory = path.resolve(
  repositoryRoot,
  process.env.LIVE_TEST_OUTPUT ?? "test-results/live-youtube"
);
const queries = (process.env.LIVE_YOUTUBE_QUERIES ?? "dance shorts,iphone duo")
  .split(",")
  .map((query) => query.trim())
  .filter(Boolean);
const scrollSteps = Number.parseInt(process.env.LIVE_YOUTUBE_SCROLL_STEPS ?? "12", 10);
const shortsLinks = 'a[href^="/shorts/"], a[href*="youtube.com/shorts/"]';
const watchLinks = 'a[href^="/watch"], a[href*="youtube.com/watch"]';
const report = {
  timestamp: new Date().toISOString(),
  queries,
  scrollSteps,
  baseline: [],
  protected: null,
  status: "running"
};

await mkdir(outputDirectory, { recursive: true });

async function launch(extensionEnabled) {
  const profile = await mkdtemp(path.join(tmpdir(), "pantsonly-live-"));
  const args = ["--lang=en-US"];
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
    viewport: { width: 1440, height: 1000 }
  });

  return { context, profile };
}

async function closeBrowser(browser) {
  if (!browser) return;
  await browser.context.close();
  await rm(browser.profile, { recursive: true, force: true });
}

async function acceptConsent(page) {
  const button = page.getByRole("button", { name: /accept all|i agree/i }).first();
  if (await button.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await button.click();
    await page.waitForTimeout(1_500);
  }
}

async function countVisible(page, selector) {
  return page.locator(selector).evaluateAll((elements) =>
    elements.filter((element) => element.getClientRects().length > 0).length
  );
}

async function scan(page, query, screenshotName) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await acceptConsent(page);
  await page.locator("ytd-search, ytm-search").first().waitFor({
    state: "attached",
    timeout: 30_000
  });

  for (let step = 0; step < scrollSteps; step += 1) {
    await page.evaluate(() => window.scrollBy(0, Math.max(window.innerHeight * 1.5, 1_200)));
    await page.waitForTimeout(750);
  }
  await page.waitForTimeout(2_000);

  const result = {
    query,
    url: page.url(),
    visibleShortsLinks: await countVisible(page, shortsLinks),
    totalShortsLinks: await page.locator(shortsLinks).count(),
    visibleWatchLinks: await countVisible(page, watchLinks),
    hiddenMarkers: await page.locator("[data-no-youtube-shorts-hidden]").count()
  };
  await page.screenshot({
    path: path.join(outputDirectory, screenshotName),
    fullPage: false
  });
  return result;
}

let baselineBrowser;
let protectedBrowser;

try {
  baselineBrowser = await launch(false);
  const baselinePage = baselineBrowser.context.pages()[0];
  let matchedBaseline;

  for (const query of queries) {
    const result = await scan(baselinePage, query, `baseline-${report.baseline.length + 1}.png`);
    report.baseline.push(result);
    if (result.visibleShortsLinks > 0 && result.visibleWatchLinks > 0) {
      matchedBaseline = result;
      break;
    }
  }

  assert.ok(
    matchedBaseline,
    "The control searches did not expose both Shorts and ordinary videos; the live check is inconclusive."
  );
  await closeBrowser(baselineBrowser);
  baselineBrowser = null;

  protectedBrowser = await launch(true);
  const protectedPage = protectedBrowser.context.pages()[0];
  report.protected = await scan(protectedPage, matchedBaseline.query, "protected.png");

  assert.ok(report.protected.visibleWatchLinks > 0, "PantsOnly hid all ordinary video results.");
  assert.equal(
    report.protected.visibleShortsLinks,
    0,
    `PantsOnly left ${report.protected.visibleShortsLinks} visible Shorts links.`
  );
  assert.ok(
    report.protected.hiddenMarkers > 0 || report.protected.totalShortsLinks > 0,
    "No evidence showed that PantsOnly encountered or classified Shorts content."
  );
  report.status = "passed";
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.status = "failed";
  report.error = error instanceof Error ? error.stack : String(error);
  console.error(report.error);
  process.exitCode = 1;
} finally {
  await closeBrowser(baselineBrowser);
  await closeBrowser(protectedBrowser);
  await writeFile(path.join(outputDirectory, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
}
