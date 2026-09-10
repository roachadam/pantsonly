import { readFile, writeFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../rules.js", import.meta.url), "utf8");
const context = vm.createContext({});
vm.runInContext(source, context);
const rules = context.NoYouTubeShortsRules;

function quoteAttribute(value) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function isSelector(selectors) {
  return `:is(${selectors.join(",")})`;
}

const signals = isSelector(rules.semanticSignalSelectors);
const navigation = isSelector(rules.navigationSelectors);
const localizedAttributes = rules.localizedShortsLabels.flatMap((label) => {
  const escaped = quoteAttribute(label);
  return [`[title="${escaped}"]`, `[aria-label="${escaped}"]`];
});

const selectors = [
  isSelector([
    ...rules.directShortsSelectors,
    ...rules.shortsLinkSelector.split(", ")
  ]),
  `${isSelector(rules.dedicatedShelfSelectors)}:has(${signals})`,
  `${isSelector(rules.genericShelfSelectors)}:has(${signals}):not(:has([href^="/watch"]))`,
  `${isSelector([...rules.cardSelectors, ...rules.navigationSelectors])}:has(${signals})`,
  `${navigation}:has(${isSelector(localizedAttributes)})`
];

const generatedRules = [...selectors]
  .map((selector) => `${selector} {\n  display: none !important;\n}`)
  .join("\n\n");

const css = `/* Generated from rules.js by scripts/generate-css.mjs. Do not edit. */

html.no-youtube-shorts-block-page body {
  visibility: hidden !important;
}

${generatedRules}

[data-no-youtube-shorts-hidden] {
  display: none !important;
}

#no-youtube-shorts-notice {
  position: fixed;
  z-index: 2147483647;
  right: 20px;
  bottom: 20px;
  padding: 10px 14px;
  border-radius: 8px;
  color: #fff;
  background: #272727;
  box-shadow: 0 3px 12px rgb(0 0 0 / 35%);
  font: 13px/1.35 system-ui, sans-serif;
}
`;

await writeFile(new URL("../hide-shorts.css", import.meta.url), css);
