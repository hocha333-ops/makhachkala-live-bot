const {sendTelegramMessage}=require("../lib/telegram.cjs");
const {fetchMchsFeed,filterMchsLocal,fetchMakhachkalaAdminTelegram,fetchMintransTelegram}=require("../lib/sources.cjs");
const {previousHourBoundary,inWindow,uniqueBy}=require("../lib/common.cjs");
const {formatUrgent}=require("../lib/format.cjs");
const {claimPublication,markPublication}=require("../lib/journal.cjs");
const {isSchedulerAuthorized}=require("../lib/auth.cjs");

const urgentWords=/авар|чс|пожар|взрыв|отключ|предупреж|шторм|опасност|эвакуац|перекры|электроснаб|водоснаб|газоснаб|обесточ|непогод|ливн|ветер|движение\s+(?:закрыт|огранич)|дорог[аи]\s+(?:закрыт|перекрыт)/i;

module.exports=async function handler(req,res){
  try{
    if(req.method!=="GET") return res.status(405).json({ok:false,error:"GET only"});
    if(!(await isSchedulerAuthorized(req,{allowedRefs:["refs/heads/main"]}))){
      return res.status(401).json({ok:false,error:"Unauthorized"});
    }
    const now=new Date(),start=previousHourBoundary(now);
    const warnings=[];
    const [ops,cityAdmin,mintrans]=await Promise.all([
      fetchMchsFeed("/deyatelnost/press-centr/operativnaya-informaciya/rss","МЧС Дагестана").then(filterMchsLocal).catch(e=>{warnings.push(`MCHS: ${e.message}`);return [];}),
      fetchMakhachkalaAdminTelegram().catch(e=>{warnings.push(`CITY_ADMIN_TG: ${e.message}`);return [];}),
      fetchMintransTelegram().catch(e=>{warnings.push(`MINTRANS_TG: ${e.message}`);return [];})
    ]);
    const candidates=uniqueBy([...ops,...cityAdmin,...mintrans],x=>x.link)
      .filter(x=>urgentWords.test(`${x.title} ${x.description}`))
      .filter(x=>inWindow(x.pubDate,start,now))
      .sort((a,b)=>b.pubDate-a.pubDate)
      .slice(0,1)
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
    return res.status(200).json({
      ok:true,version:"2.11.0",mode:auto?"publish":"dry-run",
      window:{from:start.toISOString(),to:now.toISOString()},
      found:candidates.length,warnings,
      candidates:candidates.map(x=>({title:x.title,source:x.source,date:x.pubDate.toISOString(),priority:"P1",link:x.link})),
      published,skipped
    });
  }catch(e){ return res.status(500).json({ok:false,error:e.message}); }
};
