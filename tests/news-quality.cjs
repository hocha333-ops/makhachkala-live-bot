const assert=require("node:assert/strict");
const sources=require("../lib/sources.cjs");
const editorial=require("../lib/editorial.cjs");
const common=require("../lib/common.cjs");
const quality=require("../lib/story-quality.cjs");

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
checkMintransCityOnly().catch(e=>{console.error(e);process.exitCode=1;});
