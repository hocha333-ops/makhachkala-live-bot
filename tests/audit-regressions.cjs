const assert=require("node:assert/strict");
const policy=require("../lib/news-policy.cjs");
const quality=require("../lib/story-quality.cjs");
const publisher=require("../lib/publish-engine.cjs");

function news(title,description="",source="Администрация Махачкалы",date="2026-10-17T08:00:33Z"){
  return {title,description,source,pubDate:new Date(date),priority:"P1",link:"https://t.me/source/3001"};
}
const now=new Date("2026-10-18T12:00:00Z");

async function main(){
  const outage=news(
    "19 и 20 октября 2026 года запланированы работы на ВЛ-35кВ №26",
    "В Махачкале с 8:00 до 17:00 планируется ограничение электроснабжения на некоторых улицах"
  );
  assert(policy.isNewsworthy(outage));
  assert(policy.isUpcomingServiceNotice(outage,now),"A future verified power cutoff must remain eligible after first six hours");
  assert(!policy.isUpcomingServiceNotice(outage,new Date("2026-10-20T20:00:00Z")),"Expired electricity outage must never reappear");
  assert(!policy.isUpcomingServiceNotice(outage,new Date("2026-10-15T12:00:00Z")),"Future notice beyond 72h window should wait");

  assert.equal(policy.isCityScoped(news(
    "Оперативная сводка о состоянии дорожной инфраструктуры",
    "Перекрыт Красный мост в Гергебильском районе. Объезд через Махачкалу.",
    "Минтранс Дагестана"
  )),false);
  assert.equal(policy.isCityScoped(news("В Дербенте закрыли движение", "В Махачкале работает транспорт","Администрация Махачкалы")),false);
  assert.equal(policy.isNewsworthy(news("Уважаемые работники и ветераны дорожного хозяйства","Поздравляю вас с праздником")),false);
  assert.equal(policy.isCredibleUrgent(news("На улице Штормовой отремонтировали дорогу","Работы прошли без происшествий")),false);
  assert.equal(policy.isCredibleUrgent(news("В Махачкале объявлено штормовое предупреждение","Из-за сильного ветра ожидается опасная погода")),true);
  assert.equal(policy.isCredibleUrgent(news("В Махачкале пожарные провели учения","Тренировка на объекте")),false);
  assert.equal(policy.isCredibleUrgent(news("В Махачкале произошло аварийное отключение света","На линиях проводят восстановительные работы")),true);

  const publishedRoad={title:"За неделю в Махачкале уложили более 1 900 кв",status:"published",published_at:"2026-10-18T10:37:36Z"};
  const otherRoad=news("Дорожные бригады обновили покрытие на 24 объектах в Махачкале");
  otherRoad.priority="P2";
  assert.equal(quality.sameStory(publishedRoad,otherRoad),true,"Different-source weekly asphalt duplicate must be caught");
  assert.equal(quality.sameStory(publishedRoad,news("В Махачкале открыли новый спортивный зал")),false);

  const skip=await publisher.publishItems([otherRoad],{
    now,
    recent:async()=>[publishedRoad],
    claim:async()=>{throw Error("duplicate should not be claimed")},
    send:async()=>{throw Error("duplicate should not be sent")},
    mark:async()=>{throw Error("duplicate should not be marked")},
    format:x=>x.title
  });
  assert.deepEqual(skip.published,[]);
  assert.equal(skip.skipped[0].reason,"already_covered");

  let markStatuses=[],sends=0;
  const success=await publisher.publishItems([outage],{
    now,recent:async()=>[],claim:async()=>({claimed:true,status:"pending"}),
    send:async()=>{sends++;return{message_id:444}},
    mark:async(url,status,messageId)=>{markStatuses.push(status);return{ok:true,status,telegram_message_id:messageId}},
    format:x=>x.title
  });
  assert.equal(sends,1);assert.equal(success.published[0].message_id,444);
  assert.deepEqual(markStatuses,["published"]);

  markStatuses=[];
  const sentButUnconfirmed=await publisher.publishItems([outage],{
    now,recent:async()=>[],claim:async()=>({claimed:true}),
    send:async()=>({message_id:445}),
    mark:async(url,status)=>{markStatuses.push(status);throw Error("DB temporarily unreachable")},
    format:x=>x.title
  });
  assert.equal(sentButUnconfirmed.published.length,0);
  assert.equal(sentButUnconfirmed.errors[0].reason,"telegram_sent_journal_unconfirmed");
  assert.deepEqual(markStatuses,["published"],"NEVER mark sent item failed and trigger duplicate retry");

  markStatuses=[];
  const ambiguousDelivery=await publisher.publishItems([outage],{
    now,recent:async()=>[],claim:async()=>({claimed:true}),
    send:async()=>{throw Error("ECONNRESET after Telegram request")},
    mark:async(url,status)=>{markStatuses.push(status)},
    format:x=>x.title
  });
  assert.equal(ambiguousDelivery.errors[0].reason,"telegram_delivery_uncertain");
  assert.deepEqual(markStatuses,[],"Ambiguous network delivery must stay pending");

  let calls=0;
  const journalOut=await publisher.publishItems([outage],{
    now,recent:async()=>{throw Error("DB unauthorized")},
    claim:async()=>{calls++;return{claimed:true}},
    send:async()=>{calls++;return{message_id:1}},
    format:x=>x.title
  }).then(()=>false,()=>true);
  assert(journalOut);assert.equal(calls,0,"Fail closed if journal is offline");

  console.log("PASS audit regressions: geography, outage horizon, cross-source duplicates, failure safety");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
