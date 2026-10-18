const STOP=new Set("махачкала махачкале махачкалы махачкалинские городе города столицы дагестана улице улица улицы специалисты сотрудники управление администрации администрация работы сегодня сообщил сообщает рассказал также плановые".split(" "));

function titleTokens(s=""){
  const words=String(s).toLowerCase().replace(/ё/g,"е").match(/[а-яa-z0-9]+/g)||[];
  return new Set(words.filter(w=>w.length>=5&&!STOP.has(w)).map(w=>w.slice(0,7)));
}
function sameStoryTitle(a="",b=""){
  const x=titleTokens(a),y=titleTokens(b);
  if(x.size<3||y.size<3) return false;
  let common=0;
  for(const w of x) if(y.has(w)) common++;
  return common>=3 && common/Math.min(x.size,y.size)>=0.45 && common/Math.max(x.size,y.size)>=0.2;
}
function uniqueNearDuplicateStories(items=[]){
  const out=[];
  for(const item of items){
    if(out.some(x=>sameStory(x,item))) continue;
    out.push(item);
  }
  return out;
}

function weeklyRoadSurface(title=""){
  const t=String(title).toLowerCase().replace(/\s+/g," ");
  const road=/дорожн|асфальт|покрыти|дорог/.test(t)||(/уложил/.test(t)&&/кв|1[\s\u00a0]?900/.test(t));
  const progress=/уложил|отремонтировал|обновил|бригады обнов|обновили/.test(t);
  const week=/за неделю|прошедш[а-я]* неделю|1[\s\u00a0]?900|24 объект/.test(t);
  return road&&progress&&week;
}
function utilityScheduleKey(title=""){
  const t=String(title).toLowerCase().replace(/ё/g,"е");
  if(!/махачкал/.test(t)||!/электр|электроснаб|энергоснаб|обесточ/.test(t))return "";
  if(!/отключ|огранич|график|запланир/.test(t))return "";
  // Revised, cancelled and restored service updates must remain publishable.
  if(/изменил|перенес|отмен|восстанов|продл|уточнен|скорректир/.test(t))return "";
  const re=/\b(\d{1,2})(?:\s*(?:[-–—]|и|,)\s*(\d{1,2}))?\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)(?=\s|$)/g;
  const matches=[...t.matchAll(re)];
  if(!matches.length)return "";
  const m=matches[matches.length-1];
  return "power-makhachkala-"+m[3]+"-"+[m[1],m[2]].filter(Boolean).map(Number).sort((a,b)=>a-b).join("-");
}
function sameStory(a={},b={}){
  const x=typeof a==="string"?{title:a}:a;
  const y=typeof b==="string"?{title:b}:b;
  if(sameStoryTitle(x.title,y.title))return true;
  const ux=utilityScheduleKey(x.title),uy=utilityScheduleKey(y.title);
  if(ux&&ux===uy)return true;
  // Different newsrooms use different units: asphalt area vs completed street count.
  // Limit this synonym rule to *weekly* road-surface progress, not every road repair.
  if(weeklyRoadSurface(x.title)&&weeklyRoadSurface(y.title)){
    const at=x.published_at?Date.parse(x.published_at):NaN;
    const bt=y.published_at?Date.parse(y.published_at):NaN;
    return !Number.isFinite(at)||!Number.isFinite(bt)||Math.abs(at-bt)<3*86400000;
  }
  return false;
}
module.exports={titleTokens,sameStoryTitle,sameStory,utilityScheduleKey,uniqueNearDuplicateStories};
