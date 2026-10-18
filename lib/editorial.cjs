const {fetchMchsFeed,fetchRiaMakhachkala,filterMchsLocal,fetchMakhachkalaAdminTelegram,fetchMintransTelegram,fetchMinobrnaukiTelegram,fetchDagenergoTelegram,fetchCityNewsTelegram,fetchPoliceTelegram}=require("./sources.cjs");
const {editorialWindowStart,inWindow,uniqueBy,classifyEditorial}=require("./common.cjs");
const {uniqueNearDuplicateStories}=require("./story-quality.cjs");

function isBackgroundCrime(item = {}) {
  const text=`${item.title||""} ${item.description||""}`.toLowerCase();
  const background=/уголовн(?:ое|ого|ому|ым)?\s+дел|завершил[аи]?\s+расследован|обвиняем|осужд[её]н|приговор|реабилитац[^.]{0,40}нацизм|суд\s+рассмотрел|направлен[оа]?\s+в\s+суд/.test(text);
  const immediateSafety=/розыск|разыскива|пропал|угроз|эвакуац|пожар|взрыв|стрельб|нападен|чс|перекры|отключ/.test(text);
  return background && !immediateSafety;
}
function isOutsideCity(item = {}) {
  const title = String(item.title || "").toLowerCase();
  const district = /сергокалинском районе|дербентском районе|хасавюртовском районе|карабудахкентском районе|кизлярском районе|кайтагском районе|ботлихском районе|гунибском районе|ахтынском районе|табасаранском районе/;
  const otherCity=/сергокал|дербент|хасавюрт|каспийск|избербаш|кизляр|кизилюрт|буйнакск|южно-сухокумск|грозном|черкесск/;
  return (district.test(title)||otherCity.test(title)) && !/махачкал|семендер|тарки|ленинкент|новый хушет/.test(title);
}
function isLowValuePR(item = {}) {
  const title=String(item.title||"").toLowerCase();
  const body=String(item.description||"").toLowerCase();
  return /планов(?:ый|ые|ую)\s+(?:утренний\s+)?(?:обход|уборк)|поддержани(?:ю|я)\s+порядка\s+в\s+(?:парках|скверах|общественных)/.test(body)
    || /(?:поздравил|поздравление|поздравляю|профессиональным праздником|плановый утренний обход|ежедневной уборк|поддержанию порядка в парках)/.test(title)
    || /(?:начальник|руководитель|заместитель|представитель|делегация|министр)[^.]{0,120}(?:участву|принял участие|семинар|форум|конференц|обучени)/.test(title)
    || /(?:принял участие|принимает участие|посетил семинар|участие в семинаре)[^.]{0,90}(?:форум|семинар|совещани|конференц|обучени)/.test(title);
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
  const [ria,mchs,cityAdmin,mintrans,minobr,energy,cityNews,police]=await Promise.all([
    fetchRiaMakhachkala().catch(e=>{warnings.push(`RIA: ${e.message}`);return [];}),
    fetchMchsFeed("/deyatelnost/press-centr/novosti/rss","МЧС Дагестана").then(filterMchsLocal).catch(e=>{warnings.push(`MCHS: ${e.message}`);return [];}),
    fetchMakhachkalaAdminTelegram().catch(e=>{warnings.push(`CITY_ADMIN_TG: ${e.message}`);return [];}),
    fetchMintransTelegram().catch(e=>{warnings.push(`MINTRANS_TG: ${e.message}`);return [];}),
    fetchMinobrnaukiTelegram().catch(e=>{warnings.push(`MINOBR_TG: ${e.message}`);return [];}),
    fetchDagenergoTelegram().catch(e=>{warnings.push(`ENERGY_TG: ${e.message}`);return [];}),
    fetchCityNewsTelegram().catch(e=>{warnings.push(`CITY_NEWS_TG: ${e.message}`);return [];}),
    fetchPoliceTelegram().catch(e=>{warnings.push(`POLICE_TG: ${e.message}`);return [];})
  ]);
  const byUrl=uniqueBy([...ria,...cityAdmin,...mintrans,...minobr,...energy,...cityNews,...police,...mchs],x=>x.link);
  const ranked=uniqueBy(byUrl,x=>storyTitleKey(x))
    .filter(x=>inWindow(x.pubDate,start,now))
    .filter(x=>!isBackgroundCrime(x))
    .filter(x=>!isOutsideCity(x))
    .filter(x=>!isLowValuePR(x))
    .map(x=>Object.assign({},x,classifyEditorial(x)))
    .filter(x=>x.priority!=='P5')
    .sort((a,b)=>b.score-a.score || b.pubDate-a.pubDate);
  const candidates=uniqueNearDuplicateStories(ranked).slice(0,limit);
  return {start,now,warnings,candidates};
}
module.exports={collectEditorialCandidates,isBackgroundCrime,isOutsideCity,isLowValuePR,storyTitleKey};
