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
  const causeRe=/(>�.4-�t-�,4,�4`t,�c�-�.4`JW��׋�O�^�L�JK�N�ۜ��]\�HH
\�ܚ\[ۋ�X]�
�]\�T�JH]K�X]�
�]\�T�JJO˖�WO˝�[J
H���]\��]K�[YQ���N��[��O˖�WH���[YUΈ�[��O˖̗H���Y��X�Y���[��	���[��W_H	���[�̗_X�����]\�B�NB��[��[ۈ�Z[Y]ܚX[�[[X\�J][HH�JH�ۜ���[ܚ]_HH][K��[ܚ]H�][H��\��Y�QY]ܚX[
][JN�ۜ��X��H^�X��\�][ۘ[�X��][JN�ۜ�]HH��[��][K�]H��N�ۜ�^H	�]_H	�][K�\�ܚ\[ۈ��X����\��\�J
NY�
�[ܚ]HOOH�H�H�ۜ�\��H�NY�
�X�˙]H	���X�˝[YQ���H	���X�˝[YU�H\�˜\�
	٘X�˙]_H4`H	٘X�˝[YQ���_H4-4/�	٘X�˝[YU�X
N[�HY�
�X�˙]JH\�˜\�
�X�˙]JN[�HY�
�X�˝[YQ���H	���X�˝[YU�H\�˜\�
4(H	٘X�˝[YQ���_H4-4/�	٘X�˝[YU�X
N�Y�
�ct.�-t.�`�`4/�,t-t`t`�/�a�4`t,�-t`�˝\�
^
JH\�˜\�
�/�-�.4-4,4-t`�`tc�4/�,�`4,4/t.4a�-t/t.4-H4ct.�-t.�`�`4/�`t/t,4,4,t-�-t/t.4cȊN[�HY�
�,�/�-4ct.�-t.�`�`4,�,4-�˝\�
^
JH\�˜\�
�/�-�.4-4,4-t`�`tc�4/�,�`4,4/t.4a�-t/t.4-H4,�/�-4/�`t/t,4,t-�-t/t.4cȊN[�HY�
�,�,4-�˝\�
^
JH\�˜\�
�/�-�.4-4,4-t`�`tc�4/�,�`4,4/t.4a�-t/t.4-H4,�,4-�/�`t/t,4,t-�-t/t.4cȊN[�HY�
�/�-t`4-t.�`4b�/4-4,�.4-�-t/K˝\�
^
JH\�˜\�
�,t`�-4`�`�4/�,�`4,4/t.4a�-t/t.4c�4-4,�.4-�-t/t.4cȊN�]�[[X\�HH\�˛[���	�\�˚��[��8�%�_K����Y�
�X�˘Y��X�Y
H�[[X\�H
�H	��[[X\�H������t%�,4`�`4/�/t-t`�	٘X�˘Y��X�YK�Y�
�X�˘�]\�JH�[[X\�H
�H	��[[X\�H������t'�`4.4a�.4/t,8�%	٘X�˘�]\�K��\X�J���N�J��	��_K�Y�
�[[X\�JH�]\����\X�^
�[[X\�K̌
NB��]\����\X�^
][K�\�ܚ\[ۈ���
NB��[��[ۈ][]S[�J]HH��H�ۜ�H]K����\��\�J
NY�
�-4/�`4/�,�4-4,�.4-�-t/_4/�-t`4-t.�`4b�4`�`4,4/t`t/�/�`4`�4/4,4`4b4`4`�`�4/�`4/�,t.�˝\�

JH�]\���(�a�.4`�b�,�,4.t`�-H4.4/ta4/�`4/4,4a�.4c�4/�`4.4/�.�,4/t.4`4/�,�,4/t.4.4/�/�-t-�-4/�.�4/�/�4,�/�`4/�-4`ˈ�Y�
�,�/�-4ct.�-t.�`�`4,�,4-�4`�-t/�.�4/�`�/�/�4-�.�a_4.�/�/4/4`�/_4/�,t-t`t`�/�a�˝\�

JH�]\���&4/ta4/�`4/4,4a�.4c�4/4/�-�-t`�4,tb�`�c4,�,4-�/t,4-4.�c�4-�.4`�-t.�-t.H4-�,4`�`4/�/t`�`�b�aH4`4,4.t/�/t/�,���Y�
�,4a4.4b4.�/�/ta�-t`4`�4,�b�`t`�,4,�4a4-t`t`�.4,�4-�,4,t-t,�4/4-t`4/�/�`4.4c�`�˝\�

JH�]\���(t/�at`4,4/tc�.t`�-K4-t`t.�.4/�.�,4/t.4`4`�-t`�-H4,�/�`4/�-4`t.�.4-H4/4-t`4/�/�`4.4c�`�.4cˈ�Y�
�/�/�-�,4`4a�`_4,4,�,4`4.4b4`�/�`4/4/�`4-t-4`�/�`4-t-�4/�/�,4`t/t/�`t`�4,�-�`4b�,�˝\�

JH�]\���(t.�-t-4.4`�-H4-�,4/�a4.4a�.4,4.�c4/tb�/4.4`t/�/�,tbt-t/t.4c�/4.4.4`t/�,t.�c�-4,4.t`�-H4`4-t.�/�/4-t/t-4,4a�.4.4ct.�`t`�`4-t/t/tb�aH4`t.�`�-�,K���]\���&�/�`4/�`�.�/�4a4.4.�`t.4`4`�-t/4,�,4-�/t/�-H4-4.�c�4-�.4`�-t.�-t.H4'4,4at,4a�.�,4.�bˈ�B�[�[K�^ܝ�H�X��Q[�]Y\���\[\��\U[Yܘ[R[\��\U[Yܘ[P]�\�XZ�X��[U^\��]X�[\��T�Q]U^Y]ܚX[�[����\��]�[�\��\���[�\�K[��[���[�\]YP�K�\��Y�QY]ܚX[��\X�^^�X��\�][ۘ[�X���Z[Y]ܚX[�[[X\�K][]S[�_N�