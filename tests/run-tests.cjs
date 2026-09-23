const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname,'..');
const common = require('../lib/common.cjs');
const sources = require('../lib/sources.cjs');
const format = require('../lib/format.cjs');

function test(name, fn){ try{ fn(); console.log(`PASS ${name}`); } catch(e){ console.error(`FAIL ${name}: ${e.message}`); process.exitCode=1; }}


async function asyncTest(name, fn){ try{ await fn(); console.log(`PASS ${name}`); } catch(e){ console.error(`FAIL ${name}: ${e.stack||e.message}`); process.exitCode=1; }}

// Manifest / syntax
test('package.json valid and version 2.5.0', ()=>{
  const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
  assert.equal(pkg.version,'2.5.0');
  assert.equal(pkg.scripts.test,'node tests/run-tests.cjs');
});

test('all JS/CJS syntax valid', ()=>{
  const files=[];
  function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name); if(e.isDirectory()) walk(p); else if(/\.(js|cjs)$/.test(e.name)) files.push(p);}}
  walk(root);
  for(const f of files) execFileSync(process.execPath,['--check',f],{stdio:'pipe'});
});

// Time windows
test('08:00 Moscow run starts at previous 18:00 Moscow slot', ()=>{
  assert.equal(common.editorialWindowStart(new Date('2026-09-23T05:00:05Z')).toISOString(),'2026-09-22T15:00:00.000Z');
});
test('13:00 Moscow run starts at 08:00 Moscow slot', ()=>{
  assert.equal(common.editorialWindowStart(new Date('2026-09-23T10:00:05Z')).toISOString(),'2026-09-23T05:00:00.000Z');
});
test('18:00 Moscow run starts at 13:00 Moscow slot', ()=>{
  assert.equal(common.editorialWindowStart(new Date('2026-09-23T15:00:05Z')).toISOString(),'2026-09-23T10:00:00.000Z');
});

// URL parsing
test('RIA URL normalization strips tracking and trailing slash', ()=>{
  assert.equal(sources.normalizeRiaUrl('/news/economy/test_slug/?utm_source=x#z'),'https://riadagestan.ru/news/economy/test_slug');
});
test('RIA extractor keeps real article routes only', ()=>{
  const html='<a href="/news/makhachkala/local_story/?utm=x">A</a><a href="/news">N</a><a href="/news/economy/other_story">B</a>';
  assert.deepEqual(sources.extractRiaArticleUrls(html),[
    'https://riadagestan.ru/news/makhachkala/local_story',
    'https://riadagestan.ru/news/economy/other_story'
  ]);
});

// Locality / politics precision
test('municipal RIA category is local even without city in title', ()=>{
  assert.equal(sources.isRiaLocalArticle('https://riadagestan.ru/news/makhachkala/remont_ulitsy','На улице Московской изменили схему движения'),true);
});
test('general Dagestan article with Makhachkala dateline does not become local', ()=>{
  assert.equal(sources.isRiaLocalArticle('https://riadagestan.ru/news/economy/dagestan_it','Дагестан вошел в число регионов-лидеров по результатам ИТ-диктанта'),false);
});
test('general category article with Makhachkala in title is local', ()=>{
  assert.equal(sources.isRiaLocalArticle('https://riadagestan.ru/news/economy/electricity','Более 70 улиц Махачкалы обесточат из-за ремонта'),true);
});
test('capital-of-Dagestan wording is local', ()=>{
  assert.equal(sources.isStrongRiaLocalTitle('В столице Дагестана открылся новый центр'),true);
});
test('politics category is excluded', ()=>{
  assert.equal(sources.isRiaPolitical('https://riadagestan.ru/news/politics/test','В Махачкале прошло заседание'),true);
});
test('election title is excluded outside politics category', ()=>{
  assert.equal(sources.isRiaPolitical('https://riadagestan.ru/news/society/test','В Махачкале стартовало голосование на выборах'),true);
});

// Formatting / injection safety
test('Telegram HTML escaping protects title and URL attribute', ()=>{
  const out=format.formatEditorial({title:'A < B & C',source:'X & Y',link:'https://x.test/?a=1&b="2"'});
  assert.match(out,/A &lt; B &amp; C/);
  assert.match(out,/X &amp; Y/);
  assert.match(out,/&amp;b=&quot;2&quot;/);
});

// Endpoint safety defaults
test('AUTO_PUBLISH is not hardcoded true', ()=>{
  for(const f of ['api/cron-editorial.js','api/cron-urgent.js']){
    const s=fs.readFileSync(path.join(root,f),'utf8');
    assert.match(s,/process\.env\.AUTO_PUBLISH==="true"/);
    assert.doesNotMatch(s,/AUTO_PUBLISH\s*=\s*["']true["']/);
  }
});

test('no obvious secret literals in package', ()=>{
  const text=[]; (function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else text.push(fs.readFileSync(p,'utf8'));}})(root);
  const all=text.join('\n');
  assert.doesNotMatch(all,/\b\d{8,12}:[A-Za-z0-9_-]{30,}\b/);
});


(async()=>{
  await asyncTest('RIA end-to-end fixture keeps only local nonpolitical stories', async()=>{
    const oldFetch=global.fetch;
    const pages = new Map([
      ['https://riadagestan.ru/news/makhachkala', '<a href="/news/makhachkala/street_repair">M</a><a href="/news/economy/generic_dagestan">G</a>'],
      ['https://riadagestan.ru/news', '<a href="/news/economy/power_makhachkala">L</a><a href="/news/politics/election_makhachkala">P</a>'],
      ['https://riadagestan.ru/news/makhachkala/street_repair', '<meta property="og:title" content="На улице Московской изменили схему движения"><meta property="article:published_time" content="2026-09-23T12:00:00+03:00">'],
      ['https://riadagestan.ru/news/economy/generic_dagestan', '<meta property="og:title" content="Дагестан увеличил производство зерна"><meta property="article:published_time" content="2026-09-23T12:01:00+03:00"><p>МАХАЧКАЛА, 23 сентября — РИА Дагестан.</p>'],
      ['https://riadagestan.ru/news/economy/power_makhachkala', '<meta property="og:title" content="Более 70 улиц Махачкалы обесточат из-за ремонта"><meta property="article:published_time" content="2026-09-23T12:02:00+03:00">'],
      ['https://riadagestan.ru/news/politics/election_makhachkala', '<meta property="og:title" content="В Махачкале подвели итоги выборов"><meta property="article:published_time" content="2026-09-23T12:03:00+03:00">']
    ]);
    global.fetch=async url=>{
      const key=String(url);
      if(!pages.has(key)) return {ok:false,status:404,text:async()=>''};
      return {ok:true,status:200,text:async()=>pages.get(key)};
    };
    try{
      const items=await sources.fetchRiaMakhachkala();
      assert.deepEqual(items.map(x=>x.title).sort(),[
        'Более 70 улиц Махачкалы обесточат из-за ремонта',
        'На улице Московской изменили схему движения'
      ].sort());
    } finally { global.fetch=oldFetch; }
  });

  await asyncTest('MCHS RSS fixture parses and local filter rejects non-Makhachkala item', async()=>{
    const oldFetch=global.fetch;
    const xml=`<rss><channel>
      <item><title>Отключение воды в Махачкале</title><link>https://05.mchs.gov.ru/a</link><description>Махачкала</description><pubDate>Wed, 23 Sep 2026 12:00:00 +0300</pubDate></item>
      <item><title>Предупреждение для Дербента</title><link>https://05.mchs.gov.ru/b</link><description>Дербент</description><pubDate>Wed, 23 Sep 2026 12:00:00 +0300</pubDate></item>
    </channel></rss>`;
    global.fetch=async()=>({ok:true,status:200,text:async()=>xml});
    try{
      const items=await sources.fetchMchsFeed('/x','МЧС Дагестана');
      assert.equal(items.length,2);
      const local=sources.filterMchsLocal(items);
      assert.equal(local.length,1);
      assert.match(local[0].title,/Махачкале/);
    } finally { global.fetch=oldFetch; }
  });

  if(process.exitCode) process.exit(process.exitCode);
  console.log('ALL TESTS PASSED');
})();
