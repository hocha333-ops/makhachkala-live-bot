const {escapeTelegramHtml,escapeTelegramAttr,buildEditorialSummary,utilityLine} = require("./common.cjs");
function priorityEmoji(priority="") {
  return priority === "P1" ? "⚡" : priority === "P2" ? "🚧" : priority === "P3" ? "📍" : priority === "P4" ? "🏙" : "ℹ️";
}
function formatEditorial(item) {
  const title=escapeTelegramHtml(item.title), source=escapeTelegramHtml(item.source), link=escapeTelegramAttr(item.link);
  const summary = buildEditorialSummary(item);
  const p = item.priority || "P5";
  const lines=[`${priorityEmoji(p)} <b>${title}</b>`,""];
  if(summary) lines.push(escapeTelegramHtml(summary),"");
  lines.push(escapeTelegramHtml(utilityLine(item.title)),"",`Источник: <a href="${link}">${source}</a>`,"",`#${p} #МахачкалаLIVE`);
  return lines.join("\n");
}
function formatUrgent(item) {
  const title=escapeTelegramHtml(item.title), source=escapeTelegramHtml(item.source), link=escapeTelegramAttr(item.link);
  const summary = buildEditorialSummary({...item,priority:"P1"});
  const lines=[`⚠️ <b>${title}</b>`,""];
  if(summary) lines.push(escapeTelegramHtml(summary),"");
  lines.push(escapeTelegramHtml(utilityLine(item.title)),"",`Официальный источник: <a href="${link}">${source}</a>`,"","#Важно #МахачкалаLIVE");
  return lines.join("\n");
}
module.exports={formatEditorial,formatUrgent,priorityEmoji};
