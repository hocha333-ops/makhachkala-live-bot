const crypto = require("crypto");
const { sendTelegramMessage } = require("../lib/telegram.cjs");

const EXPECTED = "c4429f7330f2dc1603f2a519bb380bd8dc07173093515a0ea4b5120e0c6b19c7";

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ ok: false, error: "GET only" });
    }
    const key = typeof req.query?.k === "string" ? req.query.k : "";
    const actual = crypto.createHash("sha256").update(key).digest("hex");
    if (actual !== EXPECTED) return res.status(401).json({ ok: false, error: "Unauthorized" });

    const result = await sendTelegramMessage("https://vitranel.ru/tg-preview-20261001-a");
    return res.status(200).json({
      ok: true,
      message_id: result.message_id,
      chat_id: result.chat?.id,
      channel: result.chat?.username
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
};
