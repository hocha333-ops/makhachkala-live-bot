const {createHash}=require("node:crypto");

const SUPABASE_URL = "https://oppmjscjnqtwvebwrwxo.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_QWaajAnsB1y9h5NuBwvuww_VG6Qm3dX";

function secretHash() {
  const secret = process.env.PUBLISH_SECRET;
  if (!secret) throw new Error("PUBLISH_SECRET missing");
  return createHash("sha256").update(secret,"utf8").digest("hex");
}

async function rpc(name, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_PUBLISHABLE_KEY,
      "Authorization": `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      "x-publish-secret-sha256": secretHash()
    },
    body: JSON.stringify(body || {}),
    signal: AbortSignal.timeout(8000)
  });

  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!r.ok) {
    const detail = typeof data === "string" ? data : JSON.stringify(data);
    throw new Error(`journal rpc ${name} failed: HTTP ${r.status} ${detail}`);
  }
  return data;
}

async function claimPublication(item) {
  return rpc("mkl_claim_publication", {
    p_source_url: item.link,
    p_title: item.title || "",
    p_source: item.source || "",
    p_priority: item.priority || "P5"
  });
}

async function markPublication(sourceUrl, status, telegramMessageId = null, error = null) {
  return rpc("mkl_mark_publication", {
    p_source_url: sourceUrl,
    p_status: status,
    p_telegram_message_id: telegramMessageId,
    p_error: error
  });
}

async function recentPublications(limit = 50) {
  return rpc("mkl_recent_publications", {p_limit: limit});
}

async function publicationHealth(staleMinutes = 15) {
  const minutes = Math.max(1, Math.min(Number(staleMinutes) || 15, 1440));
  return rpc("mkl_publication_health", {p_stale_minutes: minutes});
}

module.exports = {claimPublication, markPublication, recentPublications, publicationHealth};
