#!/bin/bash
set -eu

label="$1"
output="$2"
query_url="https://www.youtube.com/results?search_query=iphone+duo&benchmark_run=${label}"

mkdir -p "$(dirname "$output")"
printf 'timestamp,rss_kib,cpu_percent,processes\n' > "$output"

# Move the single benchmark tab off YouTube before sampling. This gives Firefox
# a consistent quiet interval and prevents identical-URL navigation from being
# treated as a no-op on later trials.
osascript <<'APPLESCRIPT'
tell application "Firefox" to activate
delay 0.3
tell application "System Events"
  keystroke "l" using command down
  keystroke "about:blank"
  key code 36
  delay 4
end tell
APPLESCRIPT

(
  while true; do
    timestamp="$(perl -MTime::HiRes=time -e 'printf "%.3f", time')"
    ps -axo rss=,%cpu=,command= | awk -v timestamp="$timestamp" '
      /\/Applications\/Firefox\.app\// && $0 !~ /awk/ {
        rss += $1
        cpu += $2
        processes += 1
      }
      END {
        printf "%s,%.0f,%.2f,%d\n", timestamp, rss, cpu, processes
      }
    ' >> "$output"
    sleep 0.25
  done
) &
sampler_pid=$!

osascript - "$query_url" "$label" <<'APPLESCRIPT'
on run argv
  set queryUrl to item 1 of argv
  tell application "Firefox" to activate
  delay 0.4
  tell application "System Events"
    keystroke "l" using command down
    delay 0.1
    keystroke queryUrl
    key code 36
    delay 6
    repeat 24 times
      key code 121
      delay 0.25
    end repeat
    delay 6
  end tell
end run
APPLESCRIPT

kill "$sampler_pid" 2>/dev/null || true
wait "$sampler_pid" 2>/dev/null || true
