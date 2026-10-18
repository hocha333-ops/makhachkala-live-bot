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
  try {
    report.edited18=!!(await request("editMessageText",{
      message_id:"18",
      parse_mode:"HTML",
      disable_web_page_preview:"true",
      text:'🛣 <b>В Махачкале за неделю уложили более 1 900 кв. м асфальта</b>\n\nДорожные бригады обновили покрытие на трёх крупных проспектах и 21 улице города. Общая площадь — более 1 900 кв. м.\n\nИсточник: <a href="https://t.me/makhachkalaofficial/30187">Администрация Махачкалы</a>'
    }));
  }catch(e){report.editError=e.message;}
  for(const id of [19,20]){
    try {report["deleted"+id]=await request("deleteMessage",{message_id:String(id)});}
    catch(e){report["deleteError"+id]=e.message;}
  }
  return report;
}
module.exports={cleanupInitialChannelPosts};
