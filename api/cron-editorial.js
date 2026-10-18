const {collectEditorialCandidates}=require("../lib/editorial.cjs");
const {formatEditorial}=require("../lib/format.cjs");
const {buildEditorialSummary}=require("../lib/common.cjs");
const {publishItems}=require("../lib/publish-engine.cjs");
const {isSchedulerAuthorized}=require("../lib/auth.cjs");

module.exports=async function handler(req,res){
  try{
    if(req.method!=="GET")return res.status(405).json({ok:false,error:"GET only"});
    if(!(await isSchedulerAuthorized(req,{allowedRefs:["refs/heads/main"]})))
      return res.status(401).json({ok:false,error:"Unauthorized"});

    const now=new Date();
    const result=await collectEditorialCandidates(now,20);
    const auto=process.env.AUTO_PUBLISH==="true";
    const issues={published:[],skipped:[],errors:[]};
    if(auto){
      try{
        Object.assign(issues,await publishItems(result.candidates,{
          now,format:formatEditorial,limit:3,priorityLimit:2
        }));
      }catch(e){issues.errors.push({reason:"journal_unavailable",error:e.message});}
    }
    // Missing a majority of feeds is not a successful scan even if HTTP itself worked.
    const degraded=result.warnings.length>=4;
    const ok=issues.errors.length===0&&!degraded;
    return res.status(ok?200:503).json({
      ok,version:"2.11.3",mode:auto?"publish":"dry-run",
      window:{from:result.start.toISOString(),to:result.now.toISOString()},
      found:result.candidates.length,warnings:result.warnings,degraded,
      candidates:result.candidates.map(x=>({
        title:x.title,source:x.source,date:x.pubDate.toISOString(),
        priority:x.priority,score:x.score,priorityReason:x.priorityReason,
        summary:buildEditorialSummary(x),postPreview:formatEditorial(x),link:x.link
      })),
      ...issues
    });
  }catch(e){return res.status(500).json({ok:false,error:e.message});}
};
