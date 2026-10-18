async function cleanupInitialChannelPosts(){
  const chat=process.env.TELEGRAM_CHANNEL||"@mkala_live05";
  if(!["@mkala_live05","-1004499154803"].includes(chat)) throw new Error("Channel ID mismatch; cleanup halted");
  const token=process.env.TELEGRAM_BOT_TOKEN;
  if(!token) throw new Error("TELEGRAM_BOT_TOKEN missing");
  async function request(method,data){
    const result=await fetch("https://api.telegram.org/bot"+token+"/"+method,{
      method:"POST",
      headers:{"Content-Type":"application/x-www-form-urlencoded"},
      body:new URLSearchParams({chat_id:chat,...data}),
      signal:AbortSignal.timeout(8000)
    });
    const body=await result.json();
    if(!result.ok||!body.ok) throw new Error(method+": "+String(body.description||result.status));
    return body.result;
  }
  const report={};
  try{report.deleted21=await request("deleteMessage",{message_id:"21"});}
  catch(e){report.deleteError21=e.message;}
  return report;
}
module.exports={cleanupInitialChannelPosts};
