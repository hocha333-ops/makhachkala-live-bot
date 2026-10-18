// Pure, conservative editorial guards. Do not infer a verified event from keywords alone.
const CITY=/(?:махачкал|ленинкент|семендер|новый хушет|тарки|альбурикент|кяхулай|турандал)/i;
const OTHER=/(?:сергокал|дербент|хасавюрт|каспийск|избербаш|кизляр|кизилюрт|буйнакск|южно-сухокумск|грозн|черкесск|гергебил|ботлих|гуніб|гуниб|кара[бб]удахкент)/i;
const GENERIC=/(?:^оперативная сводка|^обзор новостей|^итоги недели|^ситуация на дорогах республики|^дорожная обстановка в республике|^уважаемые жители)/i;
const NOT_NEWS=/(?:поздрав|профессиональн.{0,20}праздник|семинар|круглый стол|сессия городского|совещание по показателям|ежедневная уборка|плановый утренний обход|сотрудники проводят рейд по должникам)/i;
const SERVICE=/(?:электроэнерг|электроснаб|электрич|отключ|обесточ|водоснаб|подач[а-я]* вод|без воды|газоснаб|без газа|газопровод|теплоснаб|перекры|ограничен.{0,40}движен)/i;
const ANNOUNCEMENT=/(?:запланир|планов|предсто|будет|произойдут|ожидаются|приостанов|ограничен|отключ|обесточ|перекры)/i;
const MONTHS={января:0,февраля:1,марта:2,апреля:3,мая:4,июня:5,июля:6,августа:7,сентября:8,октября:9,ноября:10,декабря:11};
const DATE_RE=/\b(\d{1,2})(?:\s*(?:,|и|[-–—])\s*(\d{1,2}))?\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)(?:\s+(\d{4}))?/giu;

function isCityScoped(item={}){
  const title=String(item.title||"").toLowerCase().trim();
  const desc=String(item.description||"").toLowerCase().slice(0,750);
  const source=String(item.source||"");
  if(!title||GENERIC.test(title))return false;
  // District-wide and other-city stories must not be rescued by a detour "via Makhachkala".
  if(OTHER.test(title)&&!CITY.test(title))return false;
  if(CITY.test(title))return true;
  if(source==="Администрация Махачкалы" && !OTHER.test(title))return true;
  // Regional service advisories may have a generic title but precise Makhachkala impact.
  if(/Дагэнерго|МЧС Дагестана/.test(source)&&SERVICE.test(title+" "+desc)&&CITY.test(desc)&&!OTHER.test(title))return true;
  return false;
}

function isNewsworthy(item={}){
  const title=String(item.title||"").toLowerCase().trim();
  const text=(title+" "+String(item.description||"").toLowerCase()).slice(0,950);
  if(title.length<22||title.length>185) return false;
  if(GENERIC.test(title)||NOT_NEWS.test(title))return false;
  if(/(?:^подписывайтесь|^чистота городских пространств|провели работы по уходу за зелеными насаждениями)/.test(text))return false;
  return isCityScoped(item);
}

function isCredibleUrgent(item={}){
  if(!isNewsworthy(item))return false;
  const title=String(item.title||"").toLowerCase();
  const body=String(item.description||"").toLowerCase().slice(0,900);
  if(/(?:учения|учебн|тренировк|пожарно-тактич|напомнили о правилах)/i.test(title))return false;
  // Emergency in the body of a routine infrastructure article does not prove a live incident.
  const strong=/(?:авари|взрыв|пожар|эвакуац|обесточ|отключ|без воды|без газа|перекры|закрыли движение|ограничено движение|штормовое предупреждение|разискива|разыскива|дтп|столкновени)/i;
  const explicitUtility=SERVICE.test(title)&&/(?:огранич|отключ|приостанов|без\s+(?:воды|газа)|обесточ|перекры)/i.test(body);
  return strong.test(title)||explicitUtility;
}

function maxNoticeEnd(item={},now=new Date()){
  const text=(String(item.title||"")+" "+String(item.description||"").slice(0,500)).toLowerCase();
  let max=0;
  for(const m of text.matchAll(DATE_RE)){
    const month=MONTHS[m[3]];
    if(month===undefined)continue;
    const year=Number(m[4]||item.pubDate?.getUTCFullYear()||now.getUTCFullYear());
    for(const day of [Number(m[1]),m[2]?Number(m[2]):null]){
      if(!day||day<1||day>31)continue;
      // Moscow 21:00 = 18:00 UTC; never extend an obsolete warning beyond the last stated day.
      const ts=Date.UTC(year,month,day,18);
      if(new Date(ts).getUTCDate()===day)max=Math.max(max,ts);
    }
  }
  return max;
}

function isUpcomingServiceNotice(item={},now=new Date()){
  const source=String(item.source||"");
  if(!/Администрация Махачкалы|Дагэнерго|Минтранс Дагестана/.test(source))return false;
  if(!isNewsworthy(item))return false;
  const text=String(item.title||"")+" "+String(item.description||"").slice(0,600);
  if(!SERVICE.test(text)||!ANNOUNCEMENT.test(text))return false;
  if(!(item.pubDate instanceof Date)||now-item.pubDate>7*86400000||item.pubDate>now)return false;
  const end=maxNoticeEnd(item,now);
  return end>now.getTime()&&end-now.getTime()<=72*3600000;
}

module.exports={isCityScoped,isNewsworthy,isCredibleUrgent,isUpcomingServiceNotice,maxNoticeEnd};
