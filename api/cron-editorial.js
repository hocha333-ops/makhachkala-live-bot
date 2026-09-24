const {sendTelegramMessage}=require("../lib/telegram.cjs");
const {collectEditorialCandidates}=require("../lib/editorial.cjs");
const {formatEditorial}=require("../lib/format.cjs");
const {buildEditorialSummary}=require("../lib/common.cjs");
const {claimPublication,markPublication}=require("../lib/journal.cjs");
const {isPublishOrCronAuthorized}=require("../lib/auth.cjs");

module.exports=async function handler(req,res){
  try{
    if(req.method!=="GET") return res.status(405).json({ok:false,error:"GET only"});
    if(!isPublishOrCronAuthorized(req)){
      return res.status(401).json({ok:false,error:"Unauthorized"});
    }
    const result=await collectEditorialCandidates(new Date(),2);
    const auto=process.env.AUTO_PUBLISH==="true";
    const published=[],skipped=[];
    if(auto){
      for(const item of result.candidates){
        let claim;
        try{ claim=await claimPublication(item); }
        catch(e){ skipped.push({title:item.title,link:item.link,reason:"journal_error",error:e.message}); continue; }
        if(!claim?.claimed){
          skipped.push({title:item.title,link:item.link,reason:"duplicate_or_pending",status:claim?.status||null});
          continue;
        }
        try{
          const msg=await sendTelegramMessage(formatEditorial(item),{parseMode:"HTML"});
          await markPublication(item.link,"published",msg.message_id,null);
          published.push({message_id:msg.message_id,title:item.title,link:item.link,priority:item.priority});
        }catch(e){
          try{await markPublication(item.link,"failed",null,e.message);}catch{}
          skipped.push({title:item.title,link:item.link,reason:"publish_failed",error:e.message});
        }
      }
    }
    return res.status(200).json({
      ok:true,version:"2.9.1",mode:auto?"publish":"dry-run",
      window:{from:result.start.toISOString(),to:result.now.toISOString()},
      found:result.candidates.length,warnings:result.warnings,
      candidates:result.candidates.map(x=>({
        title:x.title,source:x.source,date:x.pubDate.toISOString(),
        priority:x.priority,score:x.score,priorityReason:x.priorityReason,
        summary:buildEditorialSummary(x),postPreview:formatEditorial(x),link:x.link
      })),
      published,skipped
    });
  }catch(e){ return res.status(500).json({ok:false,error:e.message}); }
};
