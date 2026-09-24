const {recentPublications}=require("../lib/journal.cjs");

module.exports=async function handler(req,res){
  try{
    if(req.method!=="GET") return res.status(405).json({ok:false,error:"GET only"});
    if(!process.env.PUBLISH_SECRET||req.headers["x-publish-secret"]!==process.env.PUBLISH_SECRET){
      return res.status(401).json({ok:false,error:"Unauthorized"});
    }
    const limit=Math.max(1,Math.min(Number(req.query?.limit)||50,200));
    const rows=await recentPublications(limit);
    return res.status(200).json({ok:true,version:"2.10.1",count:Array.isArray(rows)?rows.length:0,rows});
  }catch(e){
    return res.status(500).json({ok:false,error:e.message});
  }
};
