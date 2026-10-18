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
assert.equal(quality.sameStoryTitle(a,"В Махачкале открыли выставку живописи"),false);
assert.equal(editorial.isLowValuePR({title:"Начальник управления принимает участие в образовательном семинаре"}),true);
assert.equal(editorial.isLowValuePR({title:"Глава города поздравил работников дорожной отрасли с праздником"}),true);
assert.equal(common.isUrgentImpact({title:"На улице Штормовой ведут ремонт",description:"Расширяют дорогу"}),false);
assert.equal(common.isUrgentImpact({title:"В Махачкале объявлено штормовое предупреждение",description:"Сильный ветер"}),true);
for(const name of ["fetchDagenergoTelegram","fetchCityNewsTelegram","fetchPoliceTelegram"])assert.equal(typeof sources[name],"function");
console.log("PASS city news quality and source expansion");
