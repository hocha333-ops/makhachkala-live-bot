const {fetchMchsFeed,fetchRiaMakhachkala,filterMchsLocal}=require("./sources.cjs");
const {editorialWindowStart,inWindow,uniqueBy,classifyEditorial}=require("./common.cjs");

async function collectEditorialCandidates(now = new Date(), limit = 5) {
  const start=editorialWindowStart(now);
  const warnings=[];
  const [ria,mchs]=await Promise.all([
    fetchRiaMakhachkala().catch(e=>{warnings.push(`RIA: ${e.message}`);return [];}),
    fetchMchsFeed("/deyatelnost/press-centr/novosti/rss","МЧС Дагестана").then(filterMchsLocal).catch(e=>{warnings.push(`MCHS: ${e.message}`);return [];})
  ]);
  const candidates=uniqueBy([...ria,...mchs],x=>x.link)
    .filter(x=>inWindow(x.pubDate,start,now))
    .map(x=>Object.assign({},x,classifyEditorial(x)))
    .sort((a,b)=>b.score-a.score || b.pubDate-a.pubDate)
    .slice(0,limit);
  return {start,now,warnings,candidates};
}
module.exports={collectEditorialCandidates};
