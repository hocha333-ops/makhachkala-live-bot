async function removeDuplicate(){
  const token=process.env.TELEGRAM_BOT_TOKEN;
  const channel=process.env.TELEGRAM_CHANNEL||"@mkala_live05";
  if(!token||!["@mkala_live05","-1004499154803"].includes(channel))throw Error("Telegram channel credentials mismatch");
  const r=await fetch("https://api.telegram.org/bot"+token+"/deleteMessage",{
    method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({chat_id:channel,message_id:"24"}),signal:AbortSignal.timeout(7000)
  });
  const j=await r.json();
  if(j.ok&&j.result===true)return true;
  if(j.error_code===400&&/message to delete not found/i.test(j.description||""))return true;
  throw Error("Unable to remove duplicate post 24: "+(j.description||r.status));
}
module.exports={removeDuplicate};
