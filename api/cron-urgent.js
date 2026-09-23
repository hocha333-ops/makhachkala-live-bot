const {sendTelegramMessage}=require("../lib/telegram.cjs");
const {fetchMchsFeed,filterMchsLocal}=require("../lib/sources.cjs");
const {previousHourBoundary,inWindow,uniqueBy}=require("../lib/common.cjs");
const {formatUrgent}=require("../lib/format.cjs");
const urgentWords=/авар|чс|пожар|взрыв|отключ|предупреж|шторм|опасност|эвакуац|перекры|электроснаб|водоснаб|газоснаб|обесточ|непогод|ливн|ветер/i;
module.exports=async function handler(req,res){
  try{
    if(req.method!=="GET") return res.status(405).json({ok:false,error:"GET only"});
    if(!process.env.PUBLISH_SECRET||req.headers["x-publish-secret"]!==process.env.PUBLISH_SECRET)return res.status(401).json({ok:false,error:"Unauthorized"});
    const now=new Date(),start=previousHourBoundary(now);
    let sourceError=null;
    const ops=await fetchMchsFeed("/deyatelnost/press-centr/operativnaya-informaciya/rss","МЧС Дагестана").then(filterMchsLocal).catch(e=>{sourceError=e.message;return [];});
    const candidates=uniqueBy(ops,x=>x.link).filter(x=>urgentWords.test(`${x.title} ${x.description}`)).filter(x=>inWindow(x.pubDate,start,now)).sort((a,b)=>a.pubDate-b.pubDate).slice(0,1);
    const auto=process.env.AUTO_PUBLISH==="true";
    const published=[];
    if(auto){for(const item of candidates){const msg=await sendTelegramMessage(formatUrgent(item),{parseMode:"HTML"});published.push({message_id:msg.message_id,title:item.title,link:item.link});}}
    return res.status(200).json({ok:true,version:"2.6.0",mode:auto?"publish":"dry-run",window:{from:start.toISOString(),to:now.toISOString()},found:candidates.length,warning:sourceError,candidates:candidates.map(x=>({title:x.title,source:x.source,date:x.pubDate.toISOString(),link:x.link})),published});
  }catch(e){return res.status(500).json({ok:false,error:e.message});}
};
