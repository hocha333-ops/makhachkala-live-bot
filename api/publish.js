const {sendTelegramMessage}=require("../lib/telegram.cjs");
module.exports=async function handler(req,res){
  try{
    if(req.method!=="POST"){res.setHeader("Allow","POST");return res.status(405).json({ok:false,error:"POST only"});}
    if(!process.env.PUBLISH_SECRET||req.headers["x-publish-secret"]!==process.env.PUBLISH_SECRET)return res.status(401).json({ok:false,error:"Unauthorized"});
    const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):req.body||{};
    const text=typeof body.text==="string"?body.text.trim():"";
    if(!text)return res.status(400).json({ok:false,error:"text is required"});
    if(text.length>4096)return res.status(400).json({ok:false,error:"Telegram text limit exceeded"});
    const result=await sendTelegramMessage(text,{disablePreview:Boolean(body.disable_web_page_preview)});
    return res.status(200).json({ok:true,message_id:result.message_id,chat_id:result.chat?.id,channel:result.chat?.username});
  }catch(e){return res.status(500).json({ok:false,error:e.message});}
};
