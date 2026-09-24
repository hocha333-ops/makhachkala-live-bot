const {fetchMchsFeed,fetchRiaMakhachkala,filterMchsLocal,fetchMakhachkalaAdminTelegram,fetchMintransTelegram,fetchMinobrnaukiTelegram}=require("./sources.cjs");
const {editorialWindowStart,inWindow,uniqueBy,classifyEditorial}=require("./common.cjs");

function isBackgroundCrime(item = {}) {
  const text=`${item.title||""} ${item.description||""}`.toLowerCase();
  const background=/уголовн(?:ое|ого|ому|ым)?\s+дел|завершил[аи]?\s+расследован|обвиняем|осужд[её]н|приговор|реабилитац[^.]{0,40}нацизм|суд\s+рассмотрел|направлен[оа]?\s+в\s+суд/.test(text);
  const immediateSafety=/розыск|разыскива|пропал|угроз|эвакуац|пожар|взрыв|стрельб|нападен|чс|перекры|отключ/.test(text);
  return background && !immediateSafety;
}
function storyTitleKey(item = {}) {
  return String(item.title || "")
    .toLowerCase()
    .replace(/ё/g,"е")
    .replace(/[^\p{L}\p{N}]+/gu," ")
    .replace(/\s+/g," ")
    .trim();
}

async function collectEditorialCandidates(now = new Date(), limit = 5) {
  const start=editorialWindowStart(now);
  const warnings=[];
  const [ria,mchs,cityAdmin,mintrans,minobr]=await Promise.all([
    fetchRiaMakhachkala().catch(e=>{warnings.push(`RIA: ${e.message}`);return [];}),
    fetchMchsFeed("/deyatelnost/press-centr/novosti/rss","МЧС Дагестана").then(filterMchsLocal).catch(e=>{warnings.push(`MCHS: ${e.message}`);return [];}),
    fetchMakhachkalaAdminTelegram().catch(e=>{warnings.push(`CITY_ADMIN_TG: ${e.message}`);return [];}),
    fetchMintransTelegram().catch(e=>{warnings.push(`MINTRANS_TG: ${e.message}`);return [];}),
    fetchMinobrnaukiTelegram().catch(e=>{warnings.push(`MINOBR_TG: ${e.message}`);return [];})
  ]);
  const byUrl=uniqueBy([...ria,...cityAdmin,...mintrans,...minobr,...mchs],x=>x.link);
  const candidates=uniqueBy(byUrl,x=>storyTitleKey(x))
    .filter(x=>inWindow(x.pubDate,start,now))
    .filter(x=>!isBackgroundCrime(x))
    .map(x=>Object.assign({},x,classifyEditorial(x)))
    .sort((a,b)=>b.score-a.score || b.pubDate-a.pubDate)
    .slice(0,limit);
  return {start,now,warnings,candidates};
}
module.exports={collectEditorialCandidates,isBackgroundCrime,storyTitleKey};
