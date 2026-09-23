Махачкала LIVE Bot v2.5

Release gate:
- npm test / node tests/run-tests.cjs
- node --check for every JS/CJS file
- no hardcoded Telegram token
- AUTO_PUBLISH defaults to OFF unless explicitly set to true

Key safety behavior:
- RIA general Dagestan stories are NOT treated as Makhachkala merely because the agency dateline says “МАХАЧКАЛА”.
- /news/makhachkala/* is accepted as city-local.
- Other RIA categories require a strong Makhachkala cue in the headline.
- Politics/election material is filtered from automatic candidates.
- Real source connectivity is verified only after deployment via /api/source-health.

Do not enable AUTO_PUBLISH until source-health and dry-run endpoints have been checked in production and persistent deduplication is added.

Git deployment connection verified on 2026-09-23.
