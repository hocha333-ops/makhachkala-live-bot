const {sendTelegramMessage}=require("../lib/telegram.cjs");
const {collectEditorialCandidates}=require("../lib/editorial.cjs");
const {formatEditorial}=require("../lib/format.cjs");
module.exports=async function handler(req,res){
  try{
    if(req.method!=="GET") return res.status(405).json({ok:false,error:"GET only"});
    if(!process.env.PUBLISH_SECRET||req.headers["x-publish-secret"]!==process.env.PUBLISH_SECRET)return res.status(401).json({ok:false,error:"Unauthorized"});
    const result=await collectEditorialCandidates(new Date(),2);
    const auto=process.env.AUTO_PUBLISH==="true";
    const published=[];
    if(auto){for(const item of result.candidates){const msg=await sendTelegramMessage(formatEditorial(item),{parseMode:"HTML"});published.push({message_id:msg.message_id,title:item.title,link:item.link});}}
    return res.status(200).json({
      ok:true,version:"2.6.0",mode:auto?"publish":"dry-run",
      window:{from:result.start.toISOString(),to:result.now.toISOString()},
      found:result.candidates.length,warnings:result.warnings,
      candidates:result.candidates.map(x=>({
        title:x.title,source:x.source,date:x.pubDate.toISOString(),priority:x.priority,score:x.score,
        priorityReason:x.priorityReason,summary:x.description||"",postPreview:formatEditorial(x),link:x.link
      })),
      published
    });
  }catch(e){return res.status(500).json({ok:false,error:e.message});}
};
