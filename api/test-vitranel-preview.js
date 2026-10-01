const { sendTelegramMessage } = require("../lib/telegram.cjs");
const { isSchedulerAuthorized } = require("../lib/auth.cjs");

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ ok: false, error: "GET only" });
    }
    if (!(await isSchedulerAuthorized(req))) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const urls = [
      "https://telegram.org/",
      "https://vitranel.ru/",
      "https://vitranel.ru/?tg_preview_probe=20261001-2224"
    ];
    const messages = [];
    for (const url of urls) {
      const result = await sendTelegramMessage(url);
      messages.push({
        url,
        message_id: result.message_id,
        chat_id: result.chat?.id,
        channel: result.chat?.username,
        link_preview_options: result.link_preview_options || null
      });
    }
    return res.status(200).json({ ok: true, messages });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
};
