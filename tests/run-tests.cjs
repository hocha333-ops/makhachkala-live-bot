const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {execFileSync}=require("node:child_process");
const root=path.resolve(__dirname,"..");
const common=require("../lib/common.cjs");
const sources=require("../lib/sources.cjs");
const format=require("../lib/format.cjs");
const journal=require("../lib/journal.cjs");
const reconcileHandler=require("../api/publication-reconcile.js");
const auth=require("../lib/auth.cjs");
const oidc=require("../lib/github-oidc.cjs");
const {generateKeyPairSync,sign}=require("node:crypto");

function test(name,fn){try{fn();console.log("PASS",name);}catch(e){console.error("FAIL",name,e.stack||e.message);process.exitCode=1;}}
async function asyncTest(name,fn){try{await fn();console.log("PASS",name);}catch(e){console.error("FAIL",name,e.stack||e.message);process.exitCode=1;}}

test("manifest version 2.10.0 and Vercel release gate",()=>{
  const pkg=JSON.parse(fs.readFileSync(path.join(root,"package.json"),"utf8"));
  assert.equal(pkg.version,"2.10.0");
  assert.equal(pkg.scripts.test,"node tests/run-tests.cjs");
  assert.equal(pkg.scripts["vercel-build"],"npm test");
});

test("all JS/CJS syntax valid",()=>{
  const files=[];
  (function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.(js|cjs)$/.test(e.name))files.push(p);}})(root);
  for(const f of files) execFileSync(process.execPath,["--check",f],{stdio:"pipe"});
});

test("Moscow editorial windows",()=>{
  assert.equal(common.editorialWindowStart(new Date("2026-09-23T05:00:05Z")).toISOString(),"2026-09-22T15:00:00.000Z");
  assert.equal(common.editorialWindowStart(new Date("2026-09-23T10:00:05Z")).toISOString(),"2026-09-23T05:00:00.000Z");
  assert.equal(common.editorialWindowStart(new Date("2026-09-23T15:00:05Z")).toISOString(),"2026-09-23T10:00:00.000Z");
});

test("HTML entities are normalized before summaries",()=>{
  const input="&nbsp;Текст&nbsp;&laquo;Устар&raquo;&nbsp;&#160;и&#xA0;ещё &mdash; тест";
  const out=common.stripHtml(input);
  assert.equal(out,"Текст «Устар» и ещё — тест");
  assert.doesNotMatch(out,/&nbsp;|&#160;|&#xA0;/i);
});

test("RIA dateline cleanup removes leftover leading punctuation",()=>{
  const text='МАХАЧКАЛА, 24 сентября – РИА «Дагестан».. Блицтурнир прошёл в городе.';
  assert.equal(common.cleanSourceDateline(text),"Блицтурнир прошёл в городе.");
  assert.equal(common.cleanSourceDateline(". Блицтурнир прошёл в городе."),"Блицтурнир прошёл в городе.");
});

test("outage P1 outranks culture P3",()=>{
  const outage=common.classifyEditorial({title:"Более 70 улиц Махачкалы обесточат из-за ремонта трансформатора"});
  const culture=common.classifyEditorial({title:"В столице Дагестана начал работу детский центр ремесленных традиций «Устар»",description:"В Махачкале открылся детский культурно-просветительский центр. Новая площадка позволит детям изучать традиционные ремесла."});
  assert.equal(outage.priority,"P1");
  assert.equal(culture.priority,"P3");
  assert.ok(outage.score>culture.score);
});

test("RIA body extractor stops before related news",()=>{
  const html='<h1>Более 70 улиц Махачкалы обесточат</h1><div>23.09.2026 17:50</div><p>МАХАЧКАЛА, 23 сентября – РИА «Дагестан». Специалисты проведут 24 сентября ремонтные работы на силовом трансформаторе.</p><p>В связи с этим с 09:00 до 20:00 часов будет временно ограничено электроснабжение на 76 улицах города.</p><div>Источники:</div><h2>Похожие новости</h2><p>В другом материале произошел пожар.</p>';
  const d=sources.extractDescriptionFromArticle(html);
  assert.match(d,/24 сентября/);
  assert.match(d,/09:00/);
  assert.match(d,/20:00/);
  assert.match(d,/76 улицах/);
  assert.doesNotMatch(d,/Похожие новости|другом материале|пожар/i);
  assert.doesNotMatch(d,/^МАХАЧКАЛА/);
});

test("related outage cannot contaminate culture story",()=>{
  const html='<h1>В столице Дагестана начал работу детский центр ремесленных традиций «Устар»</h1><p>МАХАЧКАЛА, 23 сентября – РИА «Дагестан». В Махачкале открылся детский культурно-просветительский центр ремесленных традиций «Устар».</p><p>Новая площадка позволит детям знакомиться с наследием и изучать ремесла.</p><div>Похожие новости</div><p>Более 70 улиц Махачкалы обесточат из-за ремонта трансформатора.</p>';
  const d=sources.extractDescriptionFromArticle(html);
  assert.doesNotMatch(d,/обесточ|трансформатор/i);
  assert.equal(common.classifyEditorial({title:"В столице Дагестана начал работу детский центр ремесленных традиций «Устар»",description:d}).priority,"P3");
});

test("outage summary uses event date/time/exact count and clean cause",()=>{
  const item={
    title:"Более 70 улиц Махачкалы обесточат из-за ремонта силового трансформатора",
    description:"Для повышения надежности электроснабжения специалисты филиала Дагэнерго проведут 24 сентября ремонтные работы на силовом трансформаторе подстанции в Махачкале. В связи с этим с 09:00 до 20:00 часов будет временно ограничено электроснабжение на 76 улицах города.",
    priority:"P1"
  };
  const summary=common.buildEditorialSummary(item);
  assert.match(summary,/24 сентября/);
  assert.match(summary,/09:00/);
  assert.match(summary,/20:00/);
  assert.match(summary,/76 улиц/);
  assert.match(summary,/Причина — ремонт силового трансформатора/i);
  assert.doesNotMatch(summary,/23 сентября/);
});

test("Telegram HTML formatting is escaped",()=>{
  const out=format.formatEditorial({title:"A < B & C",source:"X & Y",link:'https://x.test/?a=1&b="2"',priority:"P3",description:"Описание"});
  assert.match(out,/A &lt; B &amp; C/);
  assert.match(out,/X &amp; Y/);
  assert.match(out,/&amp;b=&quot;2&quot;/);
});

test("RIA locality and politics filters",()=>{
  assert.equal(sources.isRiaLocalArticle("https://riadagestan.ru/news/makhachkala/test","На улице изменили движение"),true);
  assert.equal(sources.isRiaLocalArticle("https://riadagestan.ru/news/economy/test","Дагестан увеличил производство зерна"),false);
  assert.equal(sources.isRiaLocalArticle("https://riadagestan.ru/news/economy/test","Более 70 улиц Махачкалы обесточат"),true);
  assert.equal(sources.isRiaPolitical("https://riadagestan.ru/news/politics/test","В Махачкале прошло заседание"),true);
  assert.equal(sources.isRiaPolitical("https://riadagestan.ru/news/society/test","В Махачкале стартовало голосование на выборах"),true);
});

test("GitHub scheduler workflow requests OIDC and does not depend on shared repository secret",()=>{
  const s=fs.readFileSync(path.join(root,".github/workflows/scheduler.yml"),"utf8");
  assert.match(s,/id-token:\s*write/);
  assert.match(s,/audience=makhachkala-live-vercel/);
  assert.match(s,/ACTIONS_ID_TOKEN_REQUEST_TOKEN/);
  assert.match(s,/ACTIONS_ID_TOKEN_REQUEST_URL/);
  assert.doesNotMatch(s,/secrets\.CRON_SECRET/);
  assert.match(s,/\/api\/cron-urgent/);
  assert.match(s,/\/api\/cron-editorial/);
});

test("cron endpoints support separate CRON_SECRET without weakening publish auth",()=>{
  const oldPublish=process.env.PUBLISH_SECRET,oldCron=process.env.CRON_SECRET;
  process.env.PUBLISH_SECRET="publish-test-secret";
  process.env.CRON_SECRET="cron-test-secret";
  try{
    assert.equal(auth.isPublishOrCronAuthorized({headers:{"x-publish-secret":"publish-test-secret"}}),true);
    assert.equal(auth.isPublishOrCronAuthorized({headers:{authorization:"Bearer cron-test-secret"}}),true);
    assert.equal(auth.isPublishOrCronAuthorized({headers:{authorization:"Bearer wrong"}}),false);
    assert.equal(auth.isPublishOrCronAuthorized({headers:{}}),false);
    assert.equal(auth.isPublishAuthorized({headers:{authorization:"Bearer cron-test-secret"}}),false);
  }finally{
    if(oldPublish===undefined)delete process.env.PUBLISH_SECRET;else process.env.PUBLISH_SECRET=oldPublish;
    if(oldCron===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=oldCron;
  }
});

test("AUTO_PUBLISH remains opt-in",()=>{
  for(const f of ["api/cron-editorial.js","api/cron-urgent.js"]){
    const s=fs.readFileSync(path.join(root,f),"utf8");
    assert.match(s,/process\.env\.AUTO_PUBLISH==="true"/);
    assert.doesNotMatch(s,/AUTO_PUBLISH\s*=\s*["']true["']/);
  }
});

test("no Telegram bot token literal",()=>{
  const chunks=[];
  (function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory()&&!p.includes(".git"))walk(p);else if(e.isFile())chunks.push(fs.readFileSync(p,"utf8"));}})(root);
  assert.doesNotMatch(chunks.join("\n"),/\b\d{8,12}:[A-Za-z0-9_-]{30,}\b/);
});

(async()=>{
  await asyncTest("GitHub OIDC verification checks signature and trusted claims",async()=>{
    oidc.resetJwksCache();
    const {privateKey,publicKey}=generateKeyPairSync("rsa",{modulusLength:2048});
    const jwk=publicKey.export({format:"jwk"});
    jwk.kid="test-kid"; jwk.alg="RS256"; jwk.use="sig";

    const makeToken=(overrides={})=>{
      const now=Math.floor(Date.now()/1000);
      const header={alg:"RS256",kid:"test-kid",typ:"JWT"};
      const payload={
        iss:oidc.ISSUER,
        aud:oidc.AUDIENCE,
        exp:now+300,
        nbf:now-10,
        iat:now-10,
        repository:oidc.REPOSITORY,
        repository_id:oidc.REPOSITORY_ID,
        repository_owner:oidc.REPOSITORY_OWNER,
        repository_owner_id:oidc.REPOSITORY_OWNER_ID,
        ref:"refs/heads/main",
        workflow:oidc.WORKFLOW_NAME,
        workflow_ref:`${oidc.REPOSITORY}/${oidc.WORKFLOW_PATH}@refs/heads/main`,
        event_name:"schedule",
        ...overrides
      };
      const enc=x=>Buffer.from(JSON.stringify(x)).toString("base64url");
      const input=`${enc(header)}.${enc(payload)}`;
      const signature=sign("RSA-SHA256",Buffer.from(input),privateKey).toString("base64url");
      return `${input}.${signature}`;
    };

    const fetchFn=async()=>({ok:true,status:200,json:async()=>({keys:[jwk]})});
    assert.equal(await oidc.verifyGitHubOidcToken(makeToken(),{allowedRefs:["refs/heads/main"],fetchFn}),true);
    assert.equal(await oidc.verifyGitHubOidcToken(makeToken({repository:"other/repo"}),{allowedRefs:["refs/heads/main"],fetchFn}),false);
    assert.equal(await oidc.verifyGitHubOidcToken(makeToken({ref:"refs/heads/evil",workflow_ref:`${oidc.REPOSITORY}/${oidc.WORKFLOW_PATH}@refs/heads/evil`}),{allowedRefs:["refs/heads/main"],fetchFn}),false);
  });

  await asyncTest("journal hashes secret before protected RPC",async()=>{
    const oldFetch=global.fetch,oldSecret=process.env.PUBLISH_SECRET;
    process.env.PUBLISH_SECRET="test-secret";
    let req;
    global.fetch=async(url,opts)=>{req={url:String(url),opts};return{ok:true,status:200,text:async()=>JSON.stringify({claimed:true,status:"pending",attempt_count:1})};};
    try{
      const out=await journal.claimPublication({link:"https://example.test/1",title:"Тест",source:"Источник",priority:"P1"});
      assert.equal(out.claimed,true);
      assert.match(req.url,/\/rpc\/mkl_claim_publication$/);
      assert.equal(req.opts.headers["x-publish-secret-sha256"],"9caf06bb4436cdbfa20af9121a626bc1093c4f54b31c0fa937957856135345b6");
      assert.match(req.opts.headers.apikey,/^sb_publishable_/);
    }finally{global.fetch=oldFetch;if(oldSecret===undefined)delete process.env.PUBLISH_SECRET;else process.env.PUBLISH_SECRET=oldSecret;}
  });

  await asyncTest("publication health uses protected RPC",async()=>{
    const oldFetch=global.fetch,oldSecret=process.env.PUBLISH_SECRET;
    process.env.PUBLISH_SECRET="test-secret";
    let req;
    global.fetch=async(url,opts)=>{
      req={url:String(url),opts};
      return{ok:true,status:200,text:async()=>JSON.stringify({total:2,pending:1,published:1,failed:0,stale_pending:0,stale_minutes:15})};
    };
    try{
      const out=await journal.publicationHealth(15);
      assert.equal(out.total,2);
      assert.match(req.url,/\/rpc\/mkl_publication_health$/);
      assert.equal(JSON.parse(req.opts.body).p_stale_minutes,15);
      assert.match(req.opts.headers["x-publish-secret-sha256"],/^[a-f0-9]{64}$/);
    }finally{
      global.fetch=oldFetch;
      if(oldSecret===undefined)delete process.env.PUBLISH_SECRET;else process.env.PUBLISH_SECRET=oldSecret;
    }
  });

  await asyncTest("manual reconcile endpoint marks pending publication without sending Telegram",async()=>{
    const oldFetch=global.fetch,oldSecret=process.env.PUBLISH_SECRET;
    process.env.PUBLISH_SECRET="test-secret";
    let rpcReq;
    global.fetch=async(url,opts)=>{
      rpcReq={url:String(url),opts};
      return{ok:true,status:200,text:async()=>JSON.stringify({ok:true,status:"published",telegram_message_id:77,attempt_count:1})};
    };
    const req={method:"POST",headers:{"x-publish-secret":"test-secret"},body:{source_url:"https://example.test/news/77",status:"published",telegram_message_id:77}};
    const state={statusCode:200,body:null,headers:{}};
    const res={
      setHeader:(k,v)=>{state.headers[k]=v;},
      status:(code)=>{state.statusCode=code;return res;},
      json:(body)=>{state.body=body;return body;}
    };
    try{
      await reconcileHandler(req,res);
      assert.equal(state.statusCode,200);
      assert.equal(state.body.ok,true);
      assert.match(rpcReq.url,/\/rpc\/mkl_mark_publication$/);
      const body=JSON.parse(rpcReq.opts.body);
      assert.equal(body.p_status,"published");
      assert.equal(body.p_telegram_message_id,77);
    }finally{
      global.fetch=oldFetch;
      if(oldSecret===undefined)delete process.env.PUBLISH_SECRET;else process.env.PUBLISH_SECRET=oldSecret;
    }
  });

  await asyncTest("RIA end-to-end keeps local nonpolitical stories",async()=>{
    const oldFetch=global.fetch;
    const pages=new Map([
      ["https://riadagestan.ru/news/makhachkala",'<a href="/news/makhachkala/street_repair">M</a>'],
      ["https://riadagestan.ru/news",'<a href="/news/economy/power_makhachkala">L</a><a href="/news/politics/election_makhachkala">P</a>'],
      ["https://riadagestan.ru/news/makhachkala/street_repair",'<meta property="og:title" content="На улице Московской изменили схему движения"><meta property="article:published_time" content="2026-09-23T12:00:00+03:00"><h1>На улице Московской изменили схему движения</h1><p>МАХАЧКАЛА, 23 сентября – РИА «Дагестан». В городе изменили схему движения.</p><div>Источники:</div>'],
      ["https://riadagestan.ru/news/economy/power_makhachkala",'<meta property="og:title" content="Более 70 улиц Махачкалы обесточат из-за ремонта"><meta property="article:published_time" content="2026-09-23T12:02:00+03:00"><h1>Более 70 улиц Махачкалы обесточат</h1><p>МАХАЧКАЛА, 23 сентября – РИА «Дагестан». 24 сентября пройдут работы.</p><div>Источники:</div>'],
      ["https://riadagestan.ru/news/politics/election_makhachkala",'<meta property="og:title" content="В Махачкале подвели итоги выборов"><meta property="article:published_time" content="2026-09-23T12:03:00+03:00"><h1>В Махачкале подвели итоги выборов</h1>']
    ]);
    global.fetch=async url=>pages.has(String(url))?{ok:true,status:200,text:async()=>pages.get(String(url))}:{ok:false,status:404,text:async()=>""};
    try{
      const items=await sources.fetchRiaMakhachkala();
      assert.deepEqual(items.map(x=>x.title).sort(),["Более 70 улиц Махачкалы обесточат из-за ремонта","На улице Московской изменили схему движения"].sort());
    }finally{global.fetch=oldFetch;}
  });

  await asyncTest("MCHS RSS local filter",async()=>{
    const oldFetch=global.fetch;
    const xml='<rss><channel><item><title>Отключение воды в Махачкале</title><link>https://05.mchs.gov.ru/a</link><description>Махачкала</description><pubDate>Wed, 23 Sep 2026 12:00:00 +0300</pubDate></item><item><title>Предупреждение для Дербента</title><link>https://05.mchs.gov.ru/b</link><description>Дербент</description><pubDate>Wed, 23 Sep 2026 12:00:00 +0300</pubDate></item></channel></rss>';
    global.fetch=async()=>({ok:true,status:200,text:async()=>xml});
    try{
      const items=await sources.fetchMchsFeed("/x","МЧС Дагестана");
      assert.equal(sources.filterMchsLocal(items).length,1);
    }finally{global.fetch=oldFetch;}
  });

  if(process.exitCode) process.exit(process.exitCode);
  console.log("ALL TESTS PASSED");
})();
