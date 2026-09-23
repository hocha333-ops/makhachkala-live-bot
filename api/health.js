module.exports = function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  res.status(200).json({
    ok:true,
    service:"makhachkala-live-bot",
    version:"2.7.0",
    telegramTokenConfigured:Boolean(process.env.TELEGRAM_BOT_TOKEN),
    channelConfigured:Boolean(process.env.TELEGRAM_CHANNEL),
    publishSecretConfigured:Boolean(process.env.PUBLISH_SECRET),
    persistentDedup:"supabase-rpc",
    autoPublish:process.env.AUTO_PUBLISH === "true"
  });
};
