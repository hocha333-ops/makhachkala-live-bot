const assert=require("node:assert/strict");
const sources=require("../lib/sources.cjs");
const editorial=require("../lib/editorial.cjs");
const common=require("../lib/common.cjs");
const quality=require("../lib/story-quality.cjs");
const {getPowerNotice}=require("../lib/one-time-power-notice.cjs");

const recoveredNotice=getPowerNotice(new Date("2026-10-18T12:00:00Z"));
assert(recoveredNotice,"Missed power outage must be recoverable before scheduled work");
assert.equal(recoveredNotice.link,"https://t.me/makhachkalaofficial/30147");
assert.match(recoveredNotice.postHtml,/19 и 20 октября/);
assert.match(recoveredNotice.postHtml,/08:00 до 17:00/);
assert.match(recoveredNotice.postHtml,/Ленинкент/);
assert.equal(getPowerNotice(new Date("2026-10-20T14:00:00Z")),null,"Must never publish a stale notice after work window");
assert.equal(getPowerNotice(new Date("2026-10-17T11:00:00Z")),null,"Recovery is only for explicitly checked live period");


const html='<div data-post="makhachkalaofficial/555"><div class="tgme_widget_message_text">За неделю в Махачкале уложили более 1 900 кв. м асфальта.<br/>⚡️ В Махачкале продолжается ремонт дорог и улиц города.</div><time datetime="2026-10-18T10:00:00Z"></time></div>';
const [post]=sources.extractTelegramPosts(html,"makhachkalaofficial","Администрация Махачкалы");
assert(post,"Telegram post must parse");
assert.match(post.title,/кв\. м асфальта/);
assert.doesNotMatch(post.description,/^м асфальта/);

const a="В Махачкале демонтируют капитальные ограждения на улице Штормовой";
const b="На улице Штормовой специалисты Управления координации капитального строительства демонтируют капитальные ограждения";
assert.equal(quality.sameStoryTitle(a,b),true);
assert.equal(quality.uniqueNearDuplicateStories([{title:a},{title:b}]).length,1);
assert.equal(quality.sameStoryTitle(a+". Цель – расширить проезжую часть и улучшить условия движения",b),true);
assert.equal(quality.sameStoryTitle(a,"В Махачкале открыли выставку живописи"),false);
assert.equal(editorial.isLowValuePR({title:"Начальник управления принимает участие в образовательном семинаре"}),true);
assert.equal(editorial.isLowValuePR({title:"Глава города поздравил работников дорожной отрасли с праздником"}),true);
assert.equal(editorial.isLowValuePR({title:"Уважаемые работники и ветераны дорожного хозяйства",description:"Дорогие махачкалинцы! Сердечно поздравляю вас с профессиональным праздником."}),true);
assert.equal(common.isUrgentImpact({title:"На улице Штормовой ведут ремонт",description:"Расширяют дорогу"}),false);
assert.equal(common.isUrgentImpact({title:"В Махачкале объявлено штормовое предупреждение",description:"Сильный ветер"}),true);
for(const name of ["fetchDagenergoTelegram","fetchCityNewsTelegram","fetchPoliceTelegram"])assert.equal(typeof sources[name],"function");
console.log("PASS city news quality and source expansion");

async function checkMintransCityOnly(){
  const sample='<div data-post="mintransRD/810"><div class="tgme_widget_message_text">Оперативная сводка о состоянии дорожной инфраструктуры.<br>В Гергебильском районе движение закрыто. Объезд через Махачкалу.</div><time datetime="2026-10-18T10:00:00Z"></time></div><div data-post="mintransRD/811"><div class="tgme_widget_message_text">В Махачкале изменили маршрут городского автобуса.<br>Изменение вступит в силу сегодня.</div><time datetime="2026-10-18T10:30:00Z"></time></div>';
  const oldFetch=global.fetch;
  global.fetch=async()=>({ok:true,status:200,text:async()=>sample});
  try{
    const result=await sources.fetchMintransTelegram();
    assert.deepEqual(result.map(x=>x.link),["https://t.me/mintransRD/811"]);
  }finally{global.fetch=oldFetch;}
}
async function checkHourlyEditorialWindow(){
  const now=new Date("2026-10-18T12:00:00Z");
  const fake='<div data-post="makhachkalaofficial/1001"><div class="tgme_widget_message_text">В Махачкале изменили маршрут городского автобуса №5.<br>Изменения действуют с сегодняшнего дня.</div><time datetime="2026-10-18T09:30:00Z"></time></div><div data-post="makhachkalaofficial/1002"><div class="tgme_widget_message_text">В Махачкале отремонтировали старый водопровод.<br>Работы завершились на прошлой неделе.</div><time datetime="2026-10-18T03:00:00Z"></time></div>';
  const oldFetch=global.fetch;
  global.fetch=async url=>({ok:true,status:200,text:async()=>String(url).includes("t.me/s/makhachkalaofficial")?fake:"<rss/>"});
  try{
    const result=await editorial.collectEditorialCandidates(now,15);
    assert.equal(result.start.toISOString(),"2026-10-18T06:00:00.000Z");
    assert.deepEqual(result.candidates.map(x=>x.link),["https://t.me/makhachkalaofficial/1001"]);
  }finally{global.fetch=oldFetch;}
}
checkMintransCityOnly().then(checkHourlyEditorialWindow).then(()=>console.log("PASS hourly editorial window")).catch(e=>{console.error(e);process.exitCode=1;});
