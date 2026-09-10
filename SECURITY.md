# Security policy

## Supported versions

Security fixes are applied to the latest published version.

## Reporting a vulnerability

Do not open a public issue for a vulnerability that could expose user data or
enable code execution. Use GitHub's private vulnerability reporting feature for
this repository. If that feature is unavailable, contact the maintainer through
the support address shown in the browser-store listing.

Include a concise description, affected version, reproduction steps, and the
impact. Please do not include real user data.

The extension intentionally contains no remote code, telemetry, accounts, or
network requests. Any change to those properties should receive explicit
security and privacy review.

## Development-tool advisories

The published ZIP contains no third-party JavaScript dependencies. As of
September 10, 2026, a full `npm audit` reports advisories in `adm-zip` and
`image-size` through the latest `web-ext` 10.6.0 dependency tree. Those packages
are development-only and are not copied into either browser build. Run
`npm audit --omit=dev` to audit the shipped dependency surface; it currently
reports zero vulnerabilities.

Until Mozilla publishes a patched `web-ext` chain, run packaging tools only on
trusted repository files and do not use this checkout to extract or lint
untrusted extension archives. Dependabot is configured to surface an upstream
fix when one becomes available.
