const {publicationHealth}=require("../lib/journal.cjs");

module.exports=async function handler(req,res){
  try{
    if(req.method!=="GET") return res.status(405).json({ok:false,error:"GET only"});
    if(!process.env.PUBLISH_SECRET||req.headers["x-publish-secret"]!==process.env.PUBLISH_SECRET){
      return res.status(401).json({ok:false,error:"Unauthorized"});
    }
    const staleMinutes=Math.max(1,Math.min(Number(req.query?.stale_minutes)||15,1440));
    const health=await publicationHealth(staleMinutes);
    return res.status(200).json({ok:true,version:"2.10.1",health});
  }catch(e){
    return res.status(500).json({ok:false,error:e.message});
  }
};
