Махачкала LIVE Bot v2.10.2

Release gate:
- GitHub Actions: npm test
- node --check for every JS/CJS file
- Vercel preview deployment must be READY
- source-health and editorial preview are checked again after Production deployment
- AUTO_PUBLISH stays OFF until the final publication test

v2.10.2:
- removes the last residual push condition from the production scheduler
- adds regression coverage requiring schedule/manual-only execution
- OIDC scheduler remains restricted to refs/heads/main
- AUTO_PUBLISH remains OFF

v2.10.1:
- production OIDC scheduler accepts only refs/heads/main
- temporary release-branch push trigger removed
- scheduler target: hourly urgent plus 08:07/13:07/18:07 Europe/Moscow
- AUTO_PUBLISH remains OFF for scheduled dry-run observation

v2.10.0:
- GitHub Actions scheduler authenticates with short-lived GitHub OIDC tokens
- validates GitHub issuer, audience, repository and owner IDs, workflow path, branch ref, expiry and RSA signature
- removes the scheduler's dependency on synchronizing CRON_SECRET between GitHub and Vercel
- CRON_SECRET remains supported as a fallback for Vercel/manual scheduler use
- AUTO_PUBLISH remains OFF during scheduler verification

v2.9.1:
- removes leftover leading punctuation after RIA datelines
- adds regression coverage for the punctuation artifact seen in production preview
- keeps AUTO_PUBLISH OFF

v2.9.0:
- cron endpoints accept either the existing manual PUBLISH_SECRET header or Vercel's Bearer CRON_SECRET
- CRON_SECRET is independent from PUBLISH_SECRET
- cron schedules are intentionally not activated until CRON_SECRET is configured
- AUTO_PUBLISH remains OFF

v2.8.0:
- protected publication-health endpoint with pending/published/failed/stale-pending counts
- explicit manual reconciliation endpoint for ambiguous pending records
- no automatic retry of stale pending records, preventing duplicate Telegram sends after an uncertain delivery
- Vercel build runs npm test and blocks broken releases

v2.7.3:
- normalizes HTML entities and whitespace before Telegram formatting
- removes visible &nbsp; artifacts from RIA content

v2.7.2:
- limits RIA text extraction to the current article body, stopping before related news
- prevents unrelated related-news text from changing P1-P5 classification
- keeps exact outage date/time/street count in generated P1 summaries

v2.7:
- persistent publication journal in an isolated Supabase schema: makhachkala_live
- unique source_url blocks duplicate publication
- atomic claim before Telegram send
- published / failed states
- Telegram message_id and attempt_count are stored
- failed attempts can be retried
- journal API is protected by PUBLISH_SECRET
- Supabase RPC also requires the SHA-256-derived request credential

Editorial safety:
- Makhachkala-local filtering
- automatic politics/election filtering
- P1-P5 prioritization
- rich P1 summaries
- no Telegram token or PUBLISH_SECRET in the repository

Scheduler target:
- urgent check: hourly
- editorial checks: 08:00, 13:00, 18:00 Europe/Moscow
- Vercel Hobby cannot run these frequencies; external scheduler is required unless the project moves to Pro
- GitHub scheduler authenticates with short-lived OIDC tokens; CRON_SECRET remains a fallback
- AUTO_PUBLISH stays OFF during schedule verification

AUTO_PUBLISH is OFF by default.
