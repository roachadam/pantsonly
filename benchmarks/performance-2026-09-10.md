# Firefox performance benchmark — 2026-09-10

## Environment

- Firefox 151.0.4 on macOS
- One Firefox window and one tab
- Query: `iphone duo` (with a unique inert query parameter per run)
- Three runs with PantsOnly 1.0.0 loaded
- Three runs with the temporary add-on removed
- Each run: reset the tab to `about:blank` for 4 seconds, navigate to the
  search, wait 6 seconds, send 24 Page Down inputs 250 ms apart, then settle
  for 6 seconds
- Aggregate RSS and CPU for every Firefox process sampled every 250 ms

The enabled runs were performed first and the disabled runs second. This order
was chosen after discarding an initial pilot whose second tab and repeated URL
made its results invalid.

## Median of three runs

| Metric | Add-on removed | Add-on loaded | Difference |
| --- | ---: | ---: | ---: |
| Median RSS | 2,590 MiB | 2,533 MiB | -57 MiB (-2.2%) |
| Peak RSS | 2,734 MiB | 2,675 MiB | -59 MiB (-2.1%) |
| End RSS | 2,734 MiB | 2,644 MiB | -90 MiB (-3.3%) |
| Per-run RSS growth | 734 MiB | 692 MiB | -42 MiB (-5.7%) |
| Whole-run mean CPU | 49.9% | 61.5% | +11.7 points |
| Load-phase mean CPU | 61.9% | 75.5% | +13.6 points |
| Scroll-phase mean CPU | 68.6% | 71.5% | +3.0 points (+4.3%) |
| Settle-phase mean CPU | 26.0% | 35.6% | +9.6 points |
| CPU p95 | 141.6% | 145.7% | +4.1 points (+2.9%) |
| Peak CPU | 175.5% | 154.8% | -20.7 points |

CPU can exceed 100% because the measurement sums Firefox's multiprocess CPU
usage across cores.

## Interpretation

The add-on did not increase memory in this workload. Its enabled runs used about
2–3% less Firefox RSS, plausibly because several large Shorts shelves were hidden
and did not remain visually active.

Scrolling overhead was modest: approximately three aggregate CPU percentage
points, or 4.3% relative to the disabled scrolling workload. Load and post-scroll
CPU were measurably higher, while p95 CPU was only 2.9% higher and peak CPU was
lower. This suggests extra selector matching and observer revalidation rather
than severe UI stalls, but it is enough overhead to justify optimizing the
generated `:has()` rule count and full-document hidden-node revalidation.

This is a live-site macro benchmark, not a deterministic engine benchmark.
Network responses, advertisements, YouTube experiments, and process garbage
collection introduce noise. The values measure all Firefox processes, not only
the content script. The three-run median is therefore more meaningful than any
individual sample.
