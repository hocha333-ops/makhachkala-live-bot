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
  return /махачкал|махачкале|махачкалин|новый хушет|тарки|ленинкент|семендер/i.test(text);
}
function isPolitical(text = "") {
  return /выбор|голосова|кандидат|избирател|предвыбор|агитац|парт(ия|ии)|парламентск/i.test(text);
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
  if (/авар|чс|пожар|взрыв|отключ|обесточ|водоснаб|электроснаб|газоснаб|перекры|эвакуац|шторм|опасност/.test(text)) {
    return {priority:"P1", score:100, priorityReason:"Срочно или напрямую влияет на безопасность, коммунальные услуги или движение"};
  }
  if (/дорог|движен|транспорт|маршрут|ремонт|строй|благоустр|коммун|светофор|водопровод|теплосет|подстанц|трансформатор/.test(text)) {
    return {priority:"P2", score:80, priorityReason:"Важное городское изменение или инфраструктура"};
  }
  if (/мероприят|афиш|концерт|выстав|фестив|забег|образован|школ|детск|центр|библиотек|музе|мастер-класс|сервис|услуг/.test(text)) {
    return {priority:"P3", score:60, priorityReason:"Полезная городская информация, событие или сервис"};
  }
  if (/открыл|открыт|заведен|кафе|ресторан|бизнес|рынок|парк|сквер|культур|ремесл/.test(text)) {
    return {priority:"P4", score:45, priorityReason:"Интересная городская новость"};
  }
  return {priority:"P5", score:30, priorityReason:"Низкоприоритетный или фоновый городской материал"};
}
function compactText(s = "", max = 360) {
  const text = String(s).replace(/\s+/g, " ").trim();
  if (!text || text.length <= max) return text;
  const cut = text.slice(0, max + 1);
  const idx = cut.lastIndexOf(" ");
  return `${cut.slice(0, idx > max * 0.7 ? idx : max).trim()}…`;
}
function extractOperationalFacts(item = {}) {
  const title = String(item.title || "").replace(/\s+/g," ").trim();
  const description = String(item.description || "").replace(/\s+/g," ").trim();
  const text = `${title}. ${description}`.trim();
  const date = text.match(/(\d{1,2}\s+(?:января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря))/i)?.[1] || "";
  const range = text.match(/(?:с\s*)?(\d{1,2}:\d{2})\s*(?:до|[-–—])\s*(\d{1,2}:\d{2})/i);
  const affectedRe=/((?:более\s+)?\d+)\s+(улиц(?:а|ы)?|дом(?:а|ов)?|район(?:а|ов)?|объект(?:а|ов)?)/i;
  const count = description.match(affectedRe) || title.match(affectedRe);
  const causeRe=/(?:из-за|в связи с)\s+([^.!?]{8,120})/i;
  const cause = (description.match(causeRe) || title.match(causeRe))?.[1]?.trim() || "";
  return {
    date,
    timeFrom: range?.[1] || "",
    timeTo: range?.[2] || "",
    affected: count ? `${count[1]} ${count[2]}` : "",
    cause
  };
}
function buildEditorialSummary(item = {}) {
  const {priority} = item.priority ? item : classifyEditorial(item);
  const facts = extractOperationalFacts(item);
  const title = String(item.title || "");
  const text = `${title} ${item.description || ""}`.toLowerCase();
  if (priority === "P1") {
    const parts = [];
    if (facts.date && facts.timeFrom && facts.timeTo) parts.push(`${facts.date} с ${facts.timeFrom} до ${facts.timeTo}`);
    else if (facts.date) parts.push(facts.date);
    else if (facts.timeFrom && facts.timeTo) parts.push(`С ${facts.timeFrom} до ${facts.timeTo}`);

    if (/электр|обесточ|свет/.test(text)) parts.push("ожидается ограничение электроснабжения");
    else if (/вод/.test(text)) parts.push("ожидается ограничение водоснабжения");
    else if (/газ/.test(text)) parts.push("ожидается ограничение газоснабжения");
    else if (/перекры|движен/.test(text)) parts.push("будут ограничения движения");

    let summary = parts.length ? `${parts.join(" — ")}.` : "";
    if (facts.affected) summary += `${summary ? " " : ""}Затронет ${facts.affected}.`;
    if (facts.cause) summary += `${summary ? " " : ""}Причина — ${facts.cause.replace(/[,:;]+$/,'')}.`;
    if (summary) return compactText(summary, 320);
  }
  return compactText(item.description || "", 300);
}
function utilityLine(title = "") {
  const t = title.toLowerCase();
  if (/дорог|движен|перекры|транспорт|маршрут|пробк/.test(t)) return "Учитывайте информацию при планировании поездок по городу.";
  if (/вод|электр|газ|тепл|отоп|жкх|коммун|обесточ/.test(t)) return "Информация может быть важна для жителей затронутых районов.";
  if (/афиш|концерт|выстав|фестив|забег|мероприят/.test(t)) return "Сохраняйте, если планируете городские мероприятия.";
  if (/пожар|чс|авари|шторм|предупреж|опасност|взрыв/.test(t)) return "Следите за официальными сообщениями и соблюдайте рекомендации экстренных служб.";
  return "Коротко фиксируем важное для жителей Махачкалы.";
}
module.exports = {decodeEntities,stripHtml,escapeTelegramHtml,escapeTelegramAttr,isMakhachkalaText,isPolitical,parseRuDateText,editorialWindowStart,previousHourBoundary,inWindow,uniqueBy,classifyEditorial,compactText,extractOperationalFacts,buildEditorialSummary,utilityLine};
