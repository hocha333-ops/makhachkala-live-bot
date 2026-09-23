Махачкала LIVE Bot v2.8.0

Release gate:
- GitHub Actions: npm test
- node --check for every JS/CJS file
- Vercel preview deployment must be READY
- source-health and editorial preview are checked again after Production deployment
- AUTO_PUBLISH stays OFF until the final publication test

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

AUTO_PUBLISH is OFF by default.
