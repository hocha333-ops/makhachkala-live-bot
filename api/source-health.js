const {fetchMchsFeed,fetchRiaMakhachkala,filterMchsLocal,fetchMakhachkalaAdminTelegram,fetchMintransTelegram,fetchMinobrnaukiTelegram,fetchDagenergoTelegram,fetchCityNewsTelegram,fetchPoliceTelegram}=require("../lib/sources.cjs");

module.exports=async function handler(req,res){
  if(req.method!=="GET")return res.status(405).json({ok:false,error:"GET only"});
  res.setHeader("Cache-Control","no-store");
  const started=Date.now();
  const names=["ria","cityAdminTelegram","mintransTelegram","minobrnaukiTelegram","dagenergoTelegram","cityNewsTelegram","policeTelegram","mchsNews","mchsOperational"];
  const tasks=[
    fetchRiaMakhachkala(),
    fetchMakhachkalaAdminTelegram(),
    fetchMintransTelegram(),
    fetchMinobrnaukiTelegram(),
    fetchDagenergoTelegram(),
    fetchCityNewsTelegram(),
    fetchPoliceTelegram(),
    fetchMchsFeed("/deyatelnost/press-centr/novosti/rss","МЧС Дагестана").then(filterMchsLocal),
    fetchMchsFeed("/deyatelnost/press-centr/operativnaya-informaciya/rss","МЧС Дагестана").then(filterMchsLocal)
  ];
  const responses=await Promise.all(tasks.map(p=>p.then(v=>({value:v})).catch(e=>({error:e.message}))));
  const sources={};
  for(let i=0;i<names.length;i++){
    const x=responses[i],items=x.value;
    sources[names[i]]=Array.isArray(items)?{
      ok:true,count:items.length,
      latest:items.slice(0,3).map(v=>({title:v.title,date:v.pubDate?.toISOString(),link:v.link}))
    }:{ok:false,error:x.error||"invalid data"};
  }
  const failed=Object.values(sources).filter(x=>!x.ok).length;
  return res.status(failed?207:200).json({
    ok:failed===0,degraded:failed>0,failedSources:failed,
    version:"2.11.3",elapsedMs:Date.now()-started,sources
  });
};
