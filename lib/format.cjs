const {escapeTelegramHtml,escapeTelegramAttr,utilityLine} = require("./common.cjs");
function formatEditorial(item) {
  const title=escapeTelegramHtml(item.title), source=escapeTelegramHtml(item.source), link=escapeTelegramAttr(item.link);
  return [`🏙 <b>${title}</b>`,"",escapeTelegramHtml(utilityLine(item.title)),"",`Источник: <a href="${link}">${source}</a>`,"","#МахачкалаLIVE"].join("\n");
}
function formatUrgent(item) {
  const title=escapeTelegramHtml(item.title), source=escapeTelegramHtml(item.source), link=escapeTelegramAttr(item.link);
  return [`⚠️ <b>${title}</b>`,"",escapeTelegramHtml(utilityLine(item.title)),"",`Официальный источник: <a href="${link}">${source}</a>`,"","#Важно #МахачкалаLIVE"].join("\n");
}
module.exports={formatEditorial,formatUrgent};
