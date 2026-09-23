const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname,'..');
const common = require('../lib/common.cjs');
const sources = require('../lib/sources.cjs');
const format = require('../lib/format.cjs');
const journal = require('../lib/journal.cjs');

function test(name, fn){ try{ fn(); console.log(`PASS ${name}`); } catch(e){ console.error(`FAIL ${name}: ${e.message}`); process.exitCode=1; }}


async function asyncTest(name, fn){ try{ await fn(); console.log(`PASS ${name}`); } catch(e){ console.error(`FAIL ${name}: ${e.stack||e.message}`); process.exitCode=1; }}

// Manifest / syntax
test('package.json valid and version 2.7.1', ()=>{
  const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
  assert.equal(pkg.version,'2.7.1');
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



test('editorial scoring prioritizes major outage over culture opening', ()=>{
  const outage=common.classifyEditorial({title:'Более 70 улиц Махачкалы обесточат из-за ремонта трансформатора'});
  const culture=common.classifyEditorial({title:'В Махачкале открылся детский центр ремесел'});
  assert.equal(outage.priority,'P1');
  assert.ok(outage.score > culture.score);
});

test('RIA description parser reads og description', ()=>{
  const html='<meta property="og:description" content="Короткое описание новости о Махачкале">';
  assert.equal(sources.extractDescriptionFromArticle(html),'Короткое описание новости о Махачкале');
});

test('RIA description parser keeps operational article paragraphs and removes dateline', ()=>{
  const html='<meta property="og:description" content="МАХАЧКАЛА, 23 сентября – РИА «Дагестан». Специалисты проведут 24 сентября ремонтные работы на силовом трансформаторе."><p>МАХАЧКАЛА, 23 сентября – РИА «Дагестан». Специалисты проведут 24 сентября ремонтные работы на силовом трансформаторе.</p><p>В связи с этим с 09:00 до 20:00 будет временно ограничено электроснабжение на 76 улицах города.</p>';
  const d=sources.extractDescriptionFromArticle(html);
  assert.doesNotMatch(d,/^МАХАЧКАЛА/);
  assert.match(d,/24 сентября/);
  assert.match(d,/09:00/);
  assert.match(d,/20:00/);
  assert.match(d,/76 улицах/);
});

test('compactText limits long summaries', ()=>{
  const s='слово '.repeat(100);
  assert.ok(common.compactText(s,120).length <= 121);
  assert.ok(common.compactText(s,120).endsWith('…'));
});



test('operational summary ignores source dateline and extracts actual outage facts', ()=>{
  const item={
    title:'Более 70 улиц Махачкалы обесточат из-за ремонта силового трансформатора',
    description:'МАХАЧКАЛА, 23 сентября – РИА «Дагестан». Для повышения надежности электроснабжения специалисты проведут 24 сентября ремонтные работы на силовом трансформаторе. В связи с этим с 09:00 до 20:00 будет временно ограничено электроснабжение на 76 улицах города.',
    priority:'P1'
  };
  const summary=common.buildEditorialSummary(item);
  assert.match(summary,/24 сентября/);
  assert.doesNotMatch(summary,/23 сентября/);
  assert.match(summary,/09:00/);
  assert.match(summary,/20:00/);
  assert.match(summary,/76 улиц/);
  assert.match(summary,/Причина — ремонт силового трансформатора/i);
});

test('formatted P1 preview includes priority and compact factual summary', ()=>{
  const out=format.formatEditorial({
    title:'Более 70 улиц Махачкалы обесточат из-за ремонта силового трансформатора',
    description:'24 сентября с 09:00 до 20:00 будет ограничено электроснабжение 76 улиц Махачкалы в связи с ремонтом силового трансформатора.',
    source:'РИА «Дагестан»',
    link:'https://riadagestan.ru/news/economy/test',
    priority:'P1'
  });
  assert.match(out,/⚡/);
  assert.match(out,/#P1/);
  assert.match(out,/76 улиц/);
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

  await asyncTest('journal claim sends protected Supabase RPC request', async()=>{
    const oldFetch=global.fetch;
    const oldSecret=process.env.PUBLISH_SECRET;
    process.env.PUBLISH_SECRET='test-secret';
    let captured=null;
    global.fetch=async (url,opts)=>{
      captured={url:String(url),opts};
      return {ok:true,status:200,text:async()=>JSON.stringify({claimed:true,status:'pending',attempt_count:1})};
    };
    try{
      const out=await journal.claimPublication({link:'https://example.test/news/1',title:'Тест',source:'Источник',priority:'P1'});
      assert.equal(out.claimed,true);
      assert.match(captured.url,/\/rest\/v1\/rpc\/mkl_claim_publication$/);
      assert.match(captured.opts.headers['x-publish-secret-sha256'],/^[a-f0-9]{64}$/);
      assert.equal(captured.opts.headers['x-publish-secret-sha256'],'9caf06bb4436cdbfa20af9121a626bc1093c4f54b31c0fa937957856135345b6');
      assert.match(captured.opts.headers.apikey,/^sb_publishable_/);
      const body=JSON.parse(captured.opts.body);
      assert.equal(body.p_source_url,'https://example.test/news/1');
      assert.equal(body.p_priority,'P1');
    } finally {
      global.fetch=oldFetch;
      if(oldSecret===undefined) delete process.env.PUBLISH_SECRET; else process.env.PUBLISH_SECRET=oldSecret;
    }
  });

  await asyncTest('journal marks publication status via RPC', async()=>{
    const oldFetch=global.fetch;
    const oldSecret=process.env.PUBLISH_SECRET;
    process.env.PUBLISH_SECRET='test-secret';
    let captured=null;
    global.fetch=async (url,opts)=>{
      captured={url:String(url),opts};
      return {ok:true,status:200,text:async()=>JSON.stringify({ok:true,status:'published',telegram_message_id:42})};
    };
    try{
      const out=await journal.markPublication('https://example.test/news/1','published',42,null);
      assert.equal(out.status,'published');
      assert.match(captured.url,/\/rest\/v1\/rpc\/mkl_mark_publication$/);
      const body=JSON.parse(captured.opts.body);
      assert.equal(body.p_telegram_message_id,42);
      assert.equal(body.p_status,'published');
    } finally {
      global.fetch=oldFetch;
      if(oldSecret===undefined) delete process.env.PUBLISH_SECRET; else process.env.PUBLISH_SECRET=oldSecret;
    }
  });

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
