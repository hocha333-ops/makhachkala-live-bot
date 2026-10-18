const {sendTelegramMessage}=require("../lib/telegram.cjs");
const {fetchMchsFeed,filterMchsLocal,fetchMakhachkalaAdminTelegram,fetchMintransTelegram,fetchDagenergoTelegram,fetchPoliceTelegram}=require("../lib/sources.cjs");
const {previousHourBoundary,inWindow,uniqueBy,isUrgentImpact}=require("../lib/common.cjs");
const {isOutsideCity}=require("../lib/editorial.cjs");
const {formatUrgent}=require("../lib/format.cjs");
const {claimPublication,markPublication}=require("../lib/journal.cjs");
const {isSchedulerAuthorized}=require("../lib/auth.cjs");
const {deleteRoadDuplicate}=require("../lib/one-time-delete-road-dupe.cjs");


module.exports=async function handler(req,res){
  try{
    if(req.method!=="GET") return res.status(405).json({ok:false,error:"GET only"});
    if(!(await isSchedulerAuthorized(req,{allowedRefs:["refs/heads/main"]}))){
      return res.status(401).json({ok:false,error:"Unauthorized"});
    }
    const duplicateCleanup=await deleteRoadDuplicate();
    const now=new Date(),start=new Date(Date.now()-6*60*60*1000);
    const warnings=[];
    const [ops,cityAdmin,mintrans,energy,police]=await Promise.all([
      fetchMchsFeed("/deyatelnost/press-centr/operativnaya-informaciya/rss","МЧС Дагестана").then(filterMchsLocal).catch(e=>{warnings.push(`MCHS: ${e.message}`);return [];}),
      fetchMakhachkalaAdminTelegram().catch(e=>{warnings.push(`CITY_ADMIN_TG: ${e.message}`);return [];}),
      fetchMintransTelegram().catch(e=>{warnings.push(`MINTRANS_TG: ${e.message}`);return [];}),
      fetchDagenergoTelegram().catch(e=>{warnings.push(`ENERGY_TG: ${e.message}`);return [];}),
      fetchPoliceTelegram().catch(e=>{warnings.push(`POLICE_TG: ${e.message}`);return [];})
    ]);
    const candidates=uniqueBy([...ops,...cityAdmin,...mintrans,...energy,...police],x=>x.link)
      .filter(x=>!isOutsideCity(x))
      .filter(x=>isUrgentImpact(x))
      .filter(x=>inWindow(x.pubDate,start,now))
      .sort((a,b)=>b.pubDate-a.pubDate)
      .slice(0,5)
      .map(x=>Object.assign({},x,{priority:"P1",score:100,priorityReason:"Срочная оперативная информация"}));
    const auto=process.env.AUTO_PUBLISH==="true";
    const published=[],skipped=[];
    if(auto){
      for(const item of candidates){
        let claim;
        try{claim=await claimPublication(item);}
        catch(e){skipped.push({title:item.title,link:item.link,reason:"journal_error",error:e.message});continue;}
        if(!claim?.claimed){skipped.push({title:item.title,link:item.link,reason:"duplicate_or_pending",status:claim?.status||null});continue;}
        try{
          const msg=await sendTelegramMessage(formatUrgent(item),{parseMode:"HTML"});
          await markPublication(item.link,"published",msg.message_id,null);
          published.push({message_id:msg.message_id,title:item.title,link:item.link});
        }catch(e){
          try{await markPublication(item.link,"failed",null,e.message);}catch{}
          skipped.push({title:item.title,link:item.link,reason:"publish_failed",error:e.message});
        }
      }
    }
    const hasErrors=skipped.some(x=>x.reason==='journal_error'||x.reason==='publish_failed');
    return res.status(hasErrors?503:200).json({
      ok:!hasErrors,version:"2.11.3",mode:auto?"publish":"dry-run",
      window:{from:start.toISOString(),to:now.toISOString()},duplicateCleanup,
      found:candidates.length,warnings,
      candidates:candidates.map(x=>({title:x.title,source:x.source,date:x.pubDate.toISOString(),priority:"P1",link:x.link})),
      published,skipped
    });
  }catch(e){ return res.status(500).json({ok:false,error:e.message}); }
};
