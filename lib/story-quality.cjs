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
    if(out.some(x=>sameStoryTitle(x.title,item.title))) continue;
    out.push(item);
  }
  return out;
}
module.exports={titleTokens,sameStoryTitle,uniqueNearDuplicateStories};
