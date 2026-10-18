async function sendTelegramMessage(text, options = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const channel = process.env.TELEGRAM_CHANNEL || "@mkala_live05";
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN missing");
  const params = {chat_id: channel, text};
  if (options.parseMode) params.parse_mode = options.parseMode;
  if (options.disablePreview) params.disable_web_page_preview = "true";
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {"Content-Type":"application/x-www-form-urlencoded"},
    body: new URLSearchParams(params),
    signal: AbortSignal.timeout(8000)
  });
  const data = await response.json();
  if(!response.ok||!data.ok){
    const err=new Error(`Telegram error: ${data.description||response.status}`);
    // A definitive 4xx rejection means the message was not accepted.
    // Timeouts and 5xx remain uncertain and must not trigger blind retries.
    err.telegramRejected=response.status>=400&&response.status<500&&data.ok===false;
    throw err;
  }
  return data.result;
}
module.exports = {sendTelegramMessage};
