// Temporary correction of a duplicate cross-source road-repair post (ID 23).
async function deleteRoadDuplicate(){
  const chat=process.env.TELEGRAM_CHANNEL||"@mkala_live05";
  if(!["@mkala_live05","-1004499154803"].includes(chat)) throw new Error("Unexpected Telegram channel");
  if(!process.env.TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN missing");
  const response=await fetch("https://api.telegram.org/bot"+process.env.TELEGRAM_BOT_TOKEN+"/deleteMessage",{
    method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({chat_id:chat,message_id:"23"}),signal:AbortSignal.timeout(8000)
  });
  const data=await response.json();
  if(!response.ok||!data.ok) throw new Error("Telegram deleteMessage: "+String(data.description||response.status));
  return data.result===true;
}
module.exports={deleteRoadDuplicate};
