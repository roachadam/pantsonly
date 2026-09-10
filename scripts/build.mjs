import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";

const browser = process.argv[2];
if (!new Set(["firefox", "chrome"]).has(browser)) {
  throw new Error("Usage: node scripts/build.mjs <firefox|chrome>");
}

const projectRoot = new URL("../", import.meta.url);
const outputRoot = new URL(`../build/${browser}/`, import.meta.url);
const runtimeFiles = [
  "background.js",
  "content.js",
  "rules.js",
  "hide-shorts.css"
];
const iconFiles = [16, 32, 48, 96, 128].map((size) => `icon-${size}.png`);

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

for (const file of runtimeFiles) {
  await cp(new URL(`../${file}`, import.meta.url), new URL(file, outputRoot));
}
await cp(new URL("../_locales/", import.meta.url), new URL("_locales/", outputRoot), {
  recursive: true
});
await mkdir(new URL("assets/icons/", outputRoot), { recursive: true });
for (const icon of iconFiles) {
  await cp(
    new URL(`../assets/icons/${icon}`, import.meta.url),
    new URL(`assets/icons/${icon}`, outputRoot)
  );
}

const manifest = JSON.parse(await readFile(new URL("manifest.json", projectRoot), "utf8"));
if (browser === "chrome") {
  manifest.background = { service_worker: "background.js" };
  manifest.minimum_chrome_version = "105";
  delete manifest.browser_specific_settings;
}

await writeFile(
  new URL("manifest.json", outputRoot),
  `${JSON.stringify(manifest, null, 2)}\n`
);

console.log(`Built ${browser} extension at build/${browser}`);
