import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const directory = process.argv[2];
if (!directory) throw new Error("usage: node scripts/summarize-benchmark.mjs <results-directory>");

function percentile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

const files = (await readdir(directory)).filter((file) => file.endsWith(".csv")).sort();
const results = [];
for (const file of files) {
  const lines = (await readFile(path.join(directory, file), "utf8")).trim().split("\n").slice(1);
  const samples = lines.map((line) => {
    const [timestamp, rssKib, cpuPercent, processes] = line.split(",").map(Number);
    return { timestamp, rssKib, cpuPercent, processes };
  }).filter((sample) => sample.processes > 0);
  if (!samples.length) continue;
  const rss = samples.map((sample) => sample.rssKib / 1024);
  const cpu = samples.map((sample) => sample.cpuPercent);
  const startedAt = samples[0].timestamp;
  const loadCpu = samples.filter((sample) => sample.timestamp - startedAt < 6).map((sample) => sample.cpuPercent);
  const scrollCpu = samples.filter((sample) => {
    const elapsed = sample.timestamp - startedAt;
    return elapsed >= 6 && elapsed < 12;
  }).map((sample) => sample.cpuPercent);
  const settleCpu = samples.filter((sample) => sample.timestamp - startedAt >= 12).map((sample) => sample.cpuPercent);
  results.push({
    run: file.replace(".csv", ""),
    samples: samples.length,
    durationSeconds: samples.at(-1).timestamp - samples[0].timestamp,
    rssStartMiB: rss[0],
    rssMedianMiB: percentile(rss, 0.5),
    rssPeakMiB: Math.max(...rss),
    rssEndMiB: rss.at(-1),
    rssGrowthMiB: rss.at(-1) - rss[0],
    cpuMeanPercent: mean(cpu),
    cpuMedianPercent: percentile(cpu, 0.5),
    cpuP95Percent: percentile(cpu, 0.95),
    cpuPeakPercent: Math.max(...cpu),
    cpuLoadMeanPercent: mean(loadCpu),
    cpuScrollMeanPercent: mean(scrollCpu),
    cpuSettleMeanPercent: mean(settleCpu)
  });
}

console.log(JSON.stringify(results, null, 2));
