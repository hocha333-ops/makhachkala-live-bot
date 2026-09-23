const {collectEditorialCandidates}=require("../lib/editorial.cjs");
const {formatEditorial}=require("../lib/format.cjs");
const {buildEditorialSummary}=require("../lib/common.cjs");

module.exports=async function handler(req,res){
  try{
    if(req.method!=="GET") return res.status(405).json({ok:false,error:"GET only"});
    res.setHeader("Cache-Control","s-maxage=120, stale-while-revalidate=300");
    const result=await collectEditorialCandidates(new Date(),5);
    return res.status(200).json({
      ok:true,version:"2.8.0",mode:"preview-only",
      window:{from:result.start.toISOString(),to:result.now.toISOString()},
      warnings:result.warnings,
      candidates:result.candidates.map(x=>({
        title:x.title,source:x.source,date:x.pubDate.toISOString(),
        priority:x.priority,score:x.score,summary:buildEditorialSummary(x),
        postPreview:formatEditorial(x),link:x.link
      }))
    });
  }catch(e){return res.status(500).json({ok:false,error:e.message});}
};
