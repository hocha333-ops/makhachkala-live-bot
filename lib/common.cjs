function decodeEntities(s = "") {
  return s
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}
function stripHtml(s = "") {
  return decodeEntities(
    String(s).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
     .replace(/<script[\s\S]*?<\/script>/gi, " ")
     .replace(/<style[\s\S]*?<\/style>/gi, " ")
     .replace(/<[^>]+>/g, " ")
     .replace(/\s+/g, " ")
     .trim()
  );
}
function escapeTelegramHtml(s = "") {
  return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
function escapeTelegramAttr(s = "") {
  return escapeTelegramHtml(s).replaceAll('"', "&quot;");
}
function isMakhachkalaText(text = "") {
  return /п╪п╟я┘п╟я┤п╨п╟п╩|п╪п╟я┘п╟я┤п╨п╟п╩п╣|п╪п╟я┘п╟я┤п╨п╟п╩п╦п╫|п╫п╬п╡я▀п╧ я┘я┐я┬п╣я┌|я┌п╟я─п╨п╦|п╩п╣п╫п╦п╫п╨п╣п╫я┌|я│п╣п╪п╣п╫п╢п╣я─/i.test(text);
}
function isPolitical(text = "") {
  return /п╡я▀п╠п╬я─|пЁп╬п╩п╬я│п╬п╡п╟|п╨п╟п╫п╢п╦п╢п╟я┌|п╦п╥п╠п╦я─п╟я┌п╣п╩|п©я─п╣п╢п╡я▀п╠п╬я─|п╟пЁп╦я┌п╟я├|п©п╟я─я┌(п╦я▐|п╦п╦)|п©п╟я─п╩п╟п╪п╣п╫я┌я│п╨/i.test(text);
}
function parseRuDateText(s = "") {
  const m = String(s).match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, dd, mm, yyyy, hh, min] = m;
  return new Date(Date.UTC(Number(yyyy), Number(mm)-1, Number(dd), Number(hh)-3, Number(min), 0));
}
function editorialWindowStart(now = new Date()) {
  const y = now.getUTCFullYear(), m = now.getUTCMonth(), d = now.getUTCDate();
  const slots = [];
  for (const dayOffset of [-2, -1, 0]) {
    for (const h of [5, 10, 15]) slots.push(new Date(Date.UTC(y, m, d + dayOffset, h, 0, 0)));
  }
  slots.sort((a,b)=>a-b);
  const currentIndex = slots.map(x=>x.getTime()).findLastIndex(t => t <= now.getTime());
  if (currentIndex <= 0) return new Date(now.getTime() - 18 * 60 * 60 * 1000);
  return slots[currentIndex - 1];
}
function previousHourBoundary(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours()-1, 0, 0));
}
function inWindow(date, start, end) {
  return date instanceof Date && !Number.isNaN(date.getTime()) && date > start && date <= end;
}
function uniqueBy(items, keyFn) {
  const seen = new Set();
  return items.filter(x => {
    const k = keyFn(x);
    if (!k || seen.has(k)) return false;
    seen.add(k); return true;
  });
}
function classifyEditorial(item = {}) {
  const text = `${item.title || ""} ${item.description || ""}`.toLowerCase();
  if (/п╟п╡п╟я─|я┤я│|п©п╬п╤п╟я─|п╡п╥я─я▀п╡|п╬я┌п╨п╩я▌я┤|п╬п╠п╣я│я┌п╬я┤|п╡п╬п╢п╬я│п╫п╟п╠|я█п╩п╣п╨я┌я─п╬я│п╫п╟п╠|пЁп╟п╥п╬я│п╫п╟п╠|п©п╣я─п╣п╨я─я▀|я█п╡п╟п╨я┐п╟я├|я┬я┌п╬я─п╪|п╬п©п╟я│п╫п╬я│я┌/.test(text)) {
    return {priority:"P1", score:100, priorityReason:"п║я─п╬я┤п╫п╬ п╦п╩п╦ п╫п╟п©я─я▐п╪я┐я▌ п╡п╩п╦я▐п╣я┌ п╫п╟ п╠п╣п╥п╬п©п╟я│п╫п╬я│я┌я▄, п╨п╬п╪п╪я┐п╫п╟п╩я▄п╫я▀п╣ я┐я│п╩я┐пЁп╦ п╦п╩п╦ п╢п╡п╦п╤п╣п╫п╦п╣"};
  }
  if (/п╢п╬я─п╬пЁ|п╢п╡п╦п╤п╣п╫|я┌я─п╟п╫я│п©п╬я─я┌|п╪п╟я─я┬я─я┐я┌|я─п╣п╪п╬п╫я┌|я│я┌я─п╬п╧|п╠п╩п╟пЁп╬я┐я│я┌я─|п╨п╬п╪п╪я┐п╫|я│п╡п╣я┌п╬я└п╬я─|п╡п╬п╢п╬п©я─п╬п╡п╬п╢|я┌п╣п©п╩п╬я│п╣я┌|п©п╬п╢я│я┌п╟п╫я├|я┌я─п╟п╫я│я└п╬я─п╪п╟я┌п╬я─/.test(text)) {
    return {priority:"P2", score:80, priorityReason:"п▓п╟п╤п╫п╬п╣ пЁп╬я─п╬п╢я│п╨п╬п╣ п╦п╥п╪п╣п╫п╣п╫п╦п╣ п╦п╩п╦ п╦п╫я└я─п╟я│я┌я─я┐п╨я┌я┐я─п╟"};
  }
  if (/п╪п╣я─п╬п©я─п╦я▐я┌|п╟я└п╦я┬|п╨п╬п╫я├п╣я─я┌|п╡я▀я│я┌п╟п╡|я└п╣я│я┌п╦п╡|п╥п╟п╠п╣пЁ|п╬п╠я─п╟п╥п╬п╡п╟п╫|я┬п╨п╬п╩|п╢п╣я┌я│п╨|я├п╣п╫я┌я─|п╠п╦п╠п╩п╦п╬я┌п╣п╨|п╪я┐п╥п╣|п╪п╟я│я┌п╣я─-п╨п╩п╟я│я│|я│п╣я─п╡п╦я│|я┐я│п╩я┐пЁ/.test(text)) {
    return {priority:"P3", score:60, priorityReason:"п÷п╬п╩п╣п╥п╫п╟я▐ пЁп╬я─п╬п╢я│п╨п╟я▐ п╦п╫я└п╬я─п╪п╟я├п╦я▐, я│п╬п╠я▀я┌п╦п╣ п╦п╩п╦ я│п╣я─п╡п╦я│"};
  }
  if (/п╬я┌п╨я─я▀п╩|п╬я┌п╨я─я▀я┌|п╥п╟п╡п╣п╢п╣п╫|п╨п╟я└п╣|я─п╣я│я┌п╬я─п╟п╫|п╠п╦п╥п╫п╣я│|я─я▀п╫п╬п╨|п©п╟я─п╨|я│п╨п╡п╣я─|п╨я┐п╩я▄я┌я┐я─|я─п╣п╪п╣я│п╩/.test(text)) {
    return {priority:"P4", score:45, priorityReason:"п≤п╫я┌п╣я─п╣я│п╫п╟я▐ пЁп╬я─п╬п╢я│п╨п╟я▐ п╫п╬п╡п╬я│я┌я▄"};
  }
  return {priority:"P5", score:30, priorityReason:"п²п╦п╥п╨п╬п©я─п╦п╬я─п╦я┌п╣я┌п╫я▀п╧ п╦п╩п╦ я└п╬п╫п╬п╡я▀п╧ пЁп╬я─п╬п╢я│п╨п╬п╧ п╪п╟я┌п╣я─п╦п╟п╩"};
}
function compactText(s = "", max = 360) {
  const text = String(s).replace(/\s+/g, " ").trim();
  if (!text || text.length <= max) return text;
  const cut = text.slice(0, max + 1);
  const idx = cut.lastIndexOf(" ");
  return `${cut.slice(0, idx > max * 0.7 ? idx : max).trim()}Б─╕`;
}
function extractOperationalFacts(item = {}) {
  const title = String(item.title || "").replace(/\s+/g," ").trim();
  const description = String(item.description || "").replace(/\s+/g," ").trim();
  const text = `${title}. ${description}`.trim();
  const date = text.match(/(\d{1,2}\s+(?:я▐п╫п╡п╟я─я▐|я└п╣п╡я─п╟п╩я▐|п╪п╟я─я┌п╟|п╟п©я─п╣п╩я▐|п╪п╟я▐|п╦я▌п╫я▐|п╦я▌п╩я▐|п╟п╡пЁя┐я│я┌п╟|я│п╣п╫я┌я▐п╠я─я▐|п╬п╨я┌я▐п╠я─я▐|п╫п╬я▐п╠я─я▐|п╢п╣п╨п╟п╠я─я▐))/i)?.[1] || "";
  const range = text.match(/(?:я│\s*)?(\d{1,2}:\d{2})\s*(?:п╢п╬|[-Б─⌠Б─■])\s*(\d{1,2}:\d{2})/i);
  const affectedRe=/((>╢,t/╢.Т-t-WййOв
йWйй4`Т.Т.4a┼н╢,4bйOъ4-4/╢/
╜мМ"⌠Вм²Мр┐С╚BСBп╡оъ4/╢,tb╢-t.╢`┼╜мМ"⌠Р▓Ж⌠╟╒6ЖГ7B6ВVГBрFW67&≈F√ЖБФжF6┌├ffV7FVE&R▓гбF≈FфRФжF6┌├ffV7FVE&R⌠╟╒6ЖГ7B6W6U&SрР┐КBЦBэ╥BъBаСBх┐FBкF?BъBЮ┐F╔qл╛║mx╦└ЩuЛЮ╟дхаТ╓╫╓Л(─│█╫╧мп│█┘ум■─Т─║▒∙м█и╔ая╔╫╦╧╣┘я█═║█┘ум∙I■╓│ЯП│я╔я╠■╧╣┘я█═║█┘ум∙I■╓╓Э╧lеtЭ╧яи╔╢═╓│ЯП─┬┬Л(─│и∙яуи╦│Л(───│▒┘я■╟(───│я╔╣∙и╫╢Х│и┘╧²■Э╧lеt│ЯП─┬┬╟(───│я╔╣∙Q╪Х│и┘╧²■Э╧lиt│ЯП─┬┬╟(───│┘≥≥∙█я∙░Х│█╫у╧п─Э│─▒М█╫у╧яlеuТ─▒М█╫у╧яlиuУ──Х─┬┬╟(───│█┘ум■(─│ТЛ)Т)≥у╧█я╔╫╦│┴у╔╠▒▒╔я╫и╔┘╠Mу╣╣┘иД║╔я∙╢─Т│МТ╓│Л(─│█╫╧мп│Маи╔╫и╔яЕТ─Т│╔я∙╢╧аи╔╫и╔яД─Э│╔я∙╢─Х│█╠┘мм╔≥Е▒╔я╫и╔┘╟║╔я∙╢╓Л(─│█╫╧мп│≥┘█ял─Т│∙Аяи┘█я=а∙и┘я╔╫╧┘╠┘█ял║╔я∙╢╓Л(─│█╫╧мп│я╔я╠■─Т│Mяи╔╧°║╔я∙╢╧я╔я╠■│ЯП─┬┬╓Л(─│█╫╧мп│я∙Ап─Т│─▒Мя╔я╠∙Т─▒М╔я∙╢╧▒∙м█и╔ая╔╫╦│ЯП─┬┴У─╧я╫1╫щ∙и┘м■═╓Л(─│╔≤─║аи╔╫и╔яД─ТТТ─┴@д┬╓│Л(───│█╫╧мп│а┘иял─Т│mtЛ(───│╔≤─║≥┘█ял╧▒┘я■─≤≤│≥┘█ял╧я╔╣∙и╫╢─≤≤│≥┘█ял╧я╔╣∙Q╪╓│а┘иял╧аум═║─▒М≥┘█ял╧▒┘я∙Т┐F─▒М≥┘█ял╧я╔╣∙и╫╣Т┐BсBЬ─▒М≥┘█ял╧я╔╣∙Q╫У─╓Л(───│∙╠м■│╔≤─║≥┘█ял╧▒┘я■╓│а┘иял╧аум═║≥┘█ял╧▒┘я■╓Л(───│∙╠м■│╔≤─║≥┘█ял╧я╔╣∙и╫╢─≤≤│≥┘█ял╧я╔╣∙Q╪╓│а┘иял╧аум═║┐B└─▒М≥┘█ял╧я╔╣∙и╫╣Т┐BсBЬ─▒М≥┘█ял╧я╔╣∙Q╫У─╓Л((───│╔≤─═©F7BОBвBКFFСBШBгBвFFBШFСFBкBвF╪╧я∙мп║я∙Ап╓╓│а┘иял╧аум══▀BШBшBЦBсBцBвFFF<┐BШBоFBцBВBЦFBвBВBЦBт┐F7BОBвBКFFBШFBВBцBгBшBвBВBЦF<┬╓Л(───│∙╠м■│╔≤─═©BкBШBп╪╧я∙мп║я∙Ап╓╓│а┘иял╧аум══▀BШBшBЦBсBцBвFFF<┐BШBоFBцBВBЦFBвBВBЦBт┐BкBШBсBШFBВBцBгBшBвBВBЦF<┬╓Л(───│∙╠м■│╔≤─═©BоBцBэ╪╧я∙мп║я∙Ап╓╓│а┘иял╧аум══▀BШBшBЦBсBцBвFFF<┐BШBоFBцBВBЦFBвBВBЦBт┐BоBцBъBШFBВBцBгBшBвBВBЦF<┬╓Л(───│∙╠м■│╔≤─═©BЪBвFBвBКFF-СBсBкBЦBшBвBТ╪╧я∙мп║я∙Ап╓╓│а┘иял╧аум══▀BгFBсFF┐BШBоFBцBВBЦFBвBВBЦF<┐BсBкBЦBшBвBВBЦF<┬╓Л((───│╠∙п│му╣╣┘иД─Т│а┘иял╧╠∙╧²я═─Э│─▒Ма┘иял╧╘╫╔╦═┬┐┼P─┬╔Т╧──Х─┬┬Л(───│╔≤─║≥┘█ял╧┘≥≥∙█я∙░╓│му╣╣┘иД─╛Т│─▒Мму╣╣┘иД─Э─┬─┬─Х─┬┴ВB_BцFFBШBВBвF─▒М≥┘█ял╧┘≥≥∙█я∙▒Т╧─Л(───│╔≤─║≥┘█ял╧█┘ум■╓│му╣╣┘иД─╛Т│─▒Мму╣╣┘иД─Э─┬─┬─Х─┬┴ВBFBЦFBЦBВBю┐┼P─▒М≥┘█ял╧█┘ум■╧и∙а╠┘█■═╫l╟ХМt╛░╪╟°°╔Т╧─Л(───│╔≤─║му╣╣┘иД╓│и∙яуи╦│█╫╣а┘█яQ∙Ап║му╣╣┘иД╟─лхю╓Л(─│Т(─│и∙яуи╦│█╫╣а┘█яQ∙Ап║╔я∙╢╧▒∙м█и╔ая╔╫╦│ЯП─┬┬╟─люю╓Л)Т)≥у╧█я╔╫╦│уя╔╠╔яЕ1╔╧■║я╔я╠■─Т─┬┬╓│Л(─│█╫╧мп│п─Т│я╔я╠■╧я╫1╫щ∙и┘м■═╓Л(─│╔≤─═©BсBШFBШBмСBсBкBЦBшBвBУСBЪBвFBвBКFF-СFFBцBВFBЪBШFF	СBСBцFF#FFF	СBЪFBШBгBХ╪╧я∙мп║п╓╓│и∙яуи╦─▀B▐FBЦFF/BкBцBГFBт┐BЦBВFBШFBСBцFBЦF8┐BЪFBЮ┐BЪBОBцBВBЦFBШBкBцBВBЦBЮ┐BЪBШBвBъBсBШBХ┐BЪBЬ┐BоBШFBШBсF╦┬Л(─│╔≤─═©BкBШBяСF7BОBвBКFFСBоBцBщСFBвBЪBМСBШFBШBЩСBшBКFСBКBШBСBСFBУСBШBгBвFFBШF╪╧я∙мп║п╓╓│и∙яуи╦─▀BcBВFBШFBСBцFBЦF<┐BСBШBшBвF┐BгF/FF0┐BкBцBшBВBю┐BсBОF<┐BшBЦFBвBОBвBД┐BъBцFFBШBВFFF/F┐FBцBГBШBВBШBх╦┬Л(─│╔≤─═©BцFBЦF!СBКBШBВFBвFF	СBкF/FFBцBиСFBвFFBЦBиСBъBцBгBвBмСBСBвFBШBЪFBЦF?F╪╧я∙мп║п╓╓│и∙яуи╦─▀B┤BШFFBцBВF?BГFBт╟┐BвFBОBЮ┐BЪBОBцBВBЦFFBвFBт┐BоBШFBШBсFBКBЦBт┐BСBвFBШBЪFBЦF?FBЦF<╦┬Л(─│╔≤─═©BЪBШBшBцFСFFСBцBкBцFBАСF#FBШFBЯСBЪFBвBсFBЪFBвBыСBШBЪBцFBВBШFF	СBкBъFF/Bх╪╧я∙мп║п╓╓│и∙яуи╦─▀B┤BОBвBсBЦFBт┐BъBю┐BШFBЦFBЦBцBОF3BВF/BСBЮ┐FBШBШBгF'BвBВBЦF?BСBЮ┐BЮ┐FBШBгBОF;BсBцBГFBт┐FBвBКBШBСBвBВBсBцFBЦBЮ┐F7BКFFFBвBВBВF/F┐FBОFBшBд╦┬Л(─│и∙яуи╦─▀BkBШFBШFBКBЬ┐FBЦBКFBЦFFBвBП┐BкBцBшBВBШBт┐BсBОF<┐BшBЦFBвBОBвBД┐BsBцFBцFBКBцBОF,╦┬Л)Т)╣╫▒у╠■╧∙Аа╫иял─Т│М▒∙█╫▒∙╧я╔я╔∙л╠мяи╔а!я╣╟╠∙м█┘а∙Q∙╠∙²и┘╣!я╣╟╠∙м█┘а∙Q∙╠∙²и┘╣яях╠╔м5┘╜║┘█║╜┘╠┘Q∙Ап╠╔мA╫╠╔я╔█┘╟╠а┘им∙Iу┘я∙Q∙Ап╠∙▒╔я╫и╔┘╠]╔╧▒╫щMя┘ип╠аи∙ы╔╫ум!╫уи	╫у╧▒┘иД╠╔╧]╔╧▒╫э╠у╧╔еу∙	Д╠█╠┘мм╔≥Е▒╔я╫и╔┘╟╠█╫╣а┘█яQ∙Ап╠∙Аяи┘█я=а∙и┘я╔╫╧┘╠┘█ял╠┴у╔╠▒▒╔я╫и╔┘╠Mу╣╣┘иД╠уя╔╠╔яЕ1╔╧∙ТЛ