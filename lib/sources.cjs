const {decodeEntities, stripHtml, isMakhachkalaText, isPolitical, parseRuDateText, uniqueBy, cleanSourceDateline} = require("./common.cjs");

function pickTag(block, tag) {
  const m = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return m ? stripHtml(m[1]) : "";
}
function parseRssDate(s) {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}
async function fetchText(url) {
  const r = await fetch(url, {
    headers:{"User-Agent":"MakhachkalaLIVE/2.10.0 (+telegram @mkala_live05)"},
    redirect:"follow",
    signal: AbortSignal.timeout(6000)
  });
  if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}`);
  return r.text();
}
async function fetchMchsFeed(path, sourceName) {
  const url = `https://05.mchs.gov.ru${path}`;
  const xml = await fetchText(url);
  const blocks = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map(x => x[0]);
  return blocks.map(block => ({
    title:pickTag(block,"title"),
    link:pickTag(block,"link"),
    description:pickTag(block,"description"),
    pubDate:parseRssDate(pickTag(block,"pubDate")),
    source:sourceName
  })).filter(x => x.title && x.link && x.pubDate);
}
function normalizeRiaUrl(href) {
  const url = new URL(href, "https://riadagestan.ru");
  if (url.hostname !== "riadagestan.ru" && url.hostname !== "www.riadagestan.ru") throw new Error("Unexpected RIA host");
  url.protocol = "https:";
  url.hostname = "riadagestan.ru";
  url.hash = "";
  url.search = "";
  url.pathname = url.pathname.replace(/\/{2,}/g,"/").replace(/\/$/,"");
  return url.toString();
}
function extractRiaArticleUrls(html) {
  const out = [];
  for (const m of html.matchAll(/href=["']([^"']*\/news\/[^\/?#"']+\/[^\/?#"']+)(?:\/?(?:[?#][^"']*)?)?["']/gi)) {
    let url;
    try { url = normalizeRiaUrl(m[1]); } catch { continue; }
    if (!out.includes(url)) out.push(url);
  }
  return out;
}
function extractDateFromArticle(html) {
  const isoPatterns = [
    /"datePublished"\s*:\s*"([^"]+)"/i,
    /<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']article:published_time["']/i,
    /<time[^>]+datetime=["']([^"']+)["']/i
  ];
  for (const p of isoPatterns) {
    const m = html.match(p);
    if (m) {
      const d = new Date(m[1]);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  return parseRuDateText(stripHtml(html).slice(0,6000));
}
function extractTitleFromArticle(html) {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
  if (og) return decodeEntities(og[1]).trim();
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return h1 ? stripHtml(h1[1]) : "";
}
function extractMetaDescription(html) {
  const patterns = [
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return cleanSourceDateline(stripHtml(m[1]));
  }
  return "";
}
function extractArticleBodyText(html) {
  const h1 = html.match(/<h1[^>]*>[\s\S]*?<\/h1>/i);
  if (!h1 || h1.index == null) return "";

  let segment = html.slice(h1.index + h1[0].length);
  const cutMarkers = [
    /Похожие\s+новости/i,
    /Источники\s*:/i,
    /Понравилась\s+статья/i
  ];
  let cut = segment.length;
  for (const marker of cutMarkers) {
    const m = marker.exec(segment);
    if (m && m.index < cut) cut = m.index;
  }
  segment = segment.slice(0, cut);

  const text = stripHtml(segment);
  const dateline = /МАХАЧКАЛА,\s*\d{1,2}\s+[А-Яа-яЁё]+\s*[–—-]\s*РИА\s*«?Дагестан»?\.?/iu.exec(text);
  if (!dateline || dateline.index == null) return "";

  return cleanSourceDateline(text.slice(dateline.index)).slice(0,5000);
}
function extractDescriptionFromArticle(html) {
  const body = extractArticleBodyText(html);
  if (body) return body;
  return extractMetaDescription(html);
}
function isStrongRiaLocalTitle(title="") {
  return /махачкал|столиц(?:е|а|ы)\s+дагестан|дагестанск(?:ой|ая)\s+столиц|новый хушет|тарки|ленинкент|семендер/i.test(title);
}
function isRiaPolitical(link="", title="") {
  try {
    if (new URL(link).pathname.toLowerCase().startsWith("/news/politics/")) return true;
  } catch {}
  return isPolitical(title);
}
function isRiaLocalArticle(link="", title="") {
  try {
    if (new URL(link).pathname.toLowerCase().startsWith("/news/makhachkala/")) return true;
  } catch {}
  return isStrongRiaLocalTitle(title);
}
async function fetchRiaMakhachkala() {
  const [municipalHtml, generalHtml] = await Promise.all([
    fetchText("https://riadagestan.ru/news/makhachkala").catch(()=>""),
    fetchText("https://riadagestan.ru/news").catch(()=>"")
  ]);
  if (!municipalHtml && !generalHtml) throw new Error("RIA listings unavailable");

  const links = uniqueBy([
    ...extractRiaArticleUrls(municipalHtml),
    ...extractRiaArticleUrls(generalHtml)
  ], x=>x).slice(0,18);

  const articles = await Promise.all(links.map(async link => {
    try {
      const articleHtml = await fetchText(link);
      const title = extractTitleFromArticle(articleHtml);
      const pubDate = extractDateFromArticle(articleHtml);
      const description = extractDescriptionFromArticle(articleHtml);
      if (!title || !pubDate || isRiaPolitical(link,title) || !isRiaLocalArticle(link,title)) return null;
      return {title,link,description,pubDate,source:'РИА «Дагестан»'};
    } catch {
      return null;
    }
  }));
  return articles.filter(Boolean);
}
function filterMchsLocal(items) {
  return items.filter(x => !isPolitical(`${x.title} ${x.description}`) && isMakhachkalaText(`${x.title} ${x.description}`));
}
module.exports = {
  fetchMchsFeed,fetchRiaMakhachkala,filterMchsLocal,
  extractRiaArticleUrls,extractDateFromArticle,extractTitleFromArticle,
  extractMetaDescription,extractArticleBodyText,extractDescriptionFromArticle,
  normalizeRiaUrl,isStrongRiaLocalTitle,isRiaPolitical,isRiaLocalArticle
};
