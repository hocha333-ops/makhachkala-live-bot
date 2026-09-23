const {sendTelegramMessage}=require("../lib/telegram.cjs");
const {fetchMchsFeed,fetchRiaMakhachkala,filterMchsLocal}=require("../lib/sources.cjs");
const {editorialWindowStart,inWindow,uniqueBy}=require("../lib/common.cjs");
const {formatEditorial}=require("../lib/format.cjs");
module.exports=async function handler(req,res){
  try{
    if(req.method!=="GET") return res.status(405).json({ok:false,error:"GET only"});
    if(!process.env.PUBLISH_SECRET||req.headers["x-publish-secret"]!==process.env.PUBLISH_SECRET)return res.status(401).json({ok:false,error:"Unauthorized"});
    const now=new Date(),start=editorialWindowStart(now);
    const warnings=[];
    const [ria,mchs]=await Promise.all([
      fetchRiaMakhachkala().catch(e=>{warnings.push(`RIA: ${e.message}`);return [];}),
      fetchMchsFeed("/deyatelnost/press-centr/novosti/rss","МЧС Дагестана").then(filterMchsLocal).catch(e=>{warnings.push(`MCHS: ${e.message}`);return [];})
    ]);
    const candidates=uniqueBy([...ria,...mchs],x=>x.link).filter(x=>inWindow(x.pubDate,start,now)).sort((a,b)=>a.pubDate-b.pubDate).slice(0,2);
    const auto=process.env.AUTO_PUBLISH==="true";
    const published=[];
    if(auto){for(const item of candidates){const msg=await sendTelegramMessage(formatEditorial(item),{parseMode:"HTML"});published.push({message_id:msg.message_id,title:item.title,link:item.link});}}
    return res.status(200).json({ok:true,version:"2.5.0",mode:auto?"publish":"dry-run",window:{from:start.toISOString(),to:now.toISOString()},found:candidates.length,warnings,candidates:candidates.map(x=>({title:x.title,source:x.source,date:x.pubDate.toISOString(),link:x.link})),published});
  }catch(e){return res.status(500).json({ok:false,error:e.message});}
};
