const {fetchMchsFeed,filterMchsLocal,fetchMakhachkalaAdminTelegram,fetchMintransTelegram,fetchDagenergoTelegram,fetchPoliceTelegram}=require("../lib/sources.cjs");
const {inWindow,uniqueBy,isUrgentImpact}=require("../lib/common.cjs");
const {isCredibleUrgent}=require("../lib/news-policy.cjs");
const {formatUrgent}=require("../lib/format.cjs");
const {publishItems}=require("../lib/publish-engine.cjs");
const {isSchedulerAuthorized}=require("../lib/auth.cjs");

module.exports=async function handler(req,res){
  try{
    if(req.method!=="GET")return res.status(405).json({ok:false,error:"GET only"});
    if(!(await isSchedulerAuthorized(req,{allowedRefs:["refs/heads/main"]})))
      return res.status(401).json({ok:false,error:"Unauthorized"});

    const now=new Date(),start=new Date(now.getTime()-6*3600000),warnings=[];
    const [ops,cityAdmin,mintrans,energy,police]=await Promise.all([
      fetchMchsFeed("/deyatelnost/press-centr/operativnaya-informaciya/rss","МЧС Дагестана").then(filterMchsLocal).catch(e=>{warnings.push("MCHS: "+e.message);return [];}),
      fetchMakhachkalaAdminTelegram().catch(e=>{warnings.push("CITY_ADMIN_TG: "+e.message);return [];}),
      fetchMintransTelegram().catch(e=>{warnings.push("MINTRANS_TG: "+e.message);return [];}),
      fetchDagenergoTelegram().catch(e=>{warnings.push("ENERGY_TG: "+e.message);return [];}),
      fetchPoliceTelegram().catch(e=>{warnings.push("POLICE_TG: "+e.message);return [];})
    ]);
    const candidates=uniqueBy([...ops,...cityAdmin,...mintrans,...energy,...police],x=>x.link)
      .filter(x=>inWindow(x.pubDate,start,now))
      .filter(x=>isCredibleUrgent(x)&&isUrgentImpact(x))
      .sort((a,b)=>b.pubDate-a.pubDate)
      .slice(0,12)
      .map(x=>({...x,priority:"P1",score:100,priorityReason:"Подтверждённое срочное сообщение для жителей города"}));

    const auto=process.env.AUTO_PUBLISH==="true";
    let issues={published:[],skipped:[],errors:[]};
    if(auto){
      try{
        issues=await publishItems(candidates,{now,format:formatUrgent,limit:5,priorityLimit:5});
      }catch(e){issues.errors.push({reason:"journal_unavailable",error:e.message});}
    }
    const degraded=warnings.length>=3;
    const ok=issues.errors.length===0&&!degraded;
    return res.status(ok?200:503).json({
      ok,version:"2.11.3",mode:auto?"publish":"dry-run",
      window:{from:start.toISOString(),to:now.toISOString()},
      found:candidates.length,warnings,degraded,
      candidates:candidates.map(x=>({title:x.title,source:x.source,date:x.pubDate.toISOString(),priority:"P1",link:x.link})),
      ...issues
    });
  }catch(e){return res.status(500).json({ok:false,error:e.message});}
};
