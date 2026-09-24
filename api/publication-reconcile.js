const {markPublication}=require("../lib/journal.cjs");

function parseBody(req){
  if(typeof req.body==="string") return JSON.parse(req.body||"{}");
  return req.body||{};
}

module.exports=async function handler(req,res){
  try{
    if(req.method!=="POST"){
      res.setHeader("Allow","POST");
      return res.status(405).json({ok:false,error:"POST only"});
    }
    if(!process.env.PUBLISH_SECRET||req.headers["x-publish-secret"]!==process.env.PUBLISH_SECRET){
      return res.status(401).json({ok:false,error:"Unauthorized"});
    }

    const body=parseBody(req);
    const sourceUrl=typeof body.source_url==="string"?body.source_url.trim():"";
    const status=typeof body.status==="string"?body.status.trim():"";
    const messageId=body.telegram_message_id==null?null:Number(body.telegram_message_id);
    const error=typeof body.error==="string"?body.error.trim():null;

    if(!/^https?:\/\//i.test(sourceUrl)){
      return res.status(400).json({ok:false,error:"valid source_url is required"});
    }
    if(!["published","failed"].includes(status)){
      return res.status(400).json({ok:false,error:"status must be published or failed"});
    }
    if(status==="published"&&(!Number.isInteger(messageId)||messageId<=0)){
      return res.status(400).json({ok:false,error:"positive telegram_message_id is required for published"});
    }

    const result=await markPublication(sourceUrl,status,status==="published"?messageId:null,status==="failed"?(error||"manual reconciliation"):null);
    if(result?.ok===false&&result?.reason==="not_found"){
      return res.status(404).json({ok:false,error:"publication not found"});
    }
    return res.status(200).json({ok:true,version:"2.11.2",result});
  }catch(e){
    return res.status(500).json({ok:false,error:e.message});
  }
};
