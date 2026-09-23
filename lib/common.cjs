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
    s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
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
  return /махачкал|махачкале|махачкалин|новый хушет|тарки|ленинкент|семендер/i.test(text);
}
function isPolitical(text = "") {
  return /выбор|голосова|кандидат|избирател|предвыбор|агитац|парт(ия|ии)|парламентск/i.test(text);
}
function parseRuDateText(s = "") {
  const m = s.match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/);
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
function utilityLine(title = "") {
  const t = title.toLowerCase();
  if (/дорог|движен|перекры|транспорт|маршрут|пробк/.test(t)) return "Учитывайте информацию при планировании поездок по городу.";
  if (/вод|электр|газ|тепл|отоп|жкх|коммун|обесточ/.test(t)) return "Информация может быть важна для жителей затронутых районов.";
  if (/афиш|концерт|выстав|фестив|забег|мероприят/.test(t)) return "Сохраняйте, если планируете городские мероприятия.";
  if (/пожар|чс|авари|шторм|предупреж|опасност|взрыв/.test(t)) return "Следите за официальными сообщениями и соблюдайте рекомендации экстренных служб.";
  return "Коротко фиксируем важное для жителей Махачкалы.";
}
module.exports = {decodeEntities,stripHtml,escapeTelegramHtml,escapeTelegramAttr,isMakhachkalaText,isPolitical,parseRuDateText,editorialWindowStart,previousHourBoundary,inWindow,uniqueBy,utilityLine};
