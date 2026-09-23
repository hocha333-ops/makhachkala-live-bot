const {fetchMchsFeed,fetchRiaMakhachkala,filterMchsLocal} = require("../lib/sources.cjs");
module.exports = async function handler(req,res){
  if(req.method!=="GET") return res.status(405).json({ok:false,error:"GET only"});
  res.setHeader("Cache-Control","s-maxage=300, stale-while-revalidate=600");
  const started=Date.now();
  const [ria,mNews,mOps] = await Promise.all([
    fetchRiaMakhachkala().catch(e=>({error:e.message})),
    fetchMchsFeed("/deyatelnost/press-centr/novosti/rss","МЧС Дагестана").then(filterMchsLocal).catch(e=>({error:e.message})),
    fetchMchsFeed("/deyatelnost/press-centr/operativnaya-informaciya/rss","МЧС Дагестана").then(filterMchsLocal).catch(e=>({error:e.message}))
  ]);
  const pack = x => Array.isArray(x) ? {ok:true,count:x.length,latest:x.slice(0,3).map(i=>({title:i.title,date:i.pubDate?.toISOString(),link:i.link}))} : {ok:false,error:x.error};
  const sources={ria:pack(ria),mchsNews:pack(mNews),mchsOperational:pack(mOps)};
  const allOk=Object.values(sources).every(x=>x.ok);
  res.status(allOk?200:207).json({ok:allOk,version:"2.8.0",elapsedMs:Date.now()-started,sources});
};
