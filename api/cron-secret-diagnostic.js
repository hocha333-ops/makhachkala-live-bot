const {createHash}=require("node:crypto");

module.exports=function handler(req,res){
  if(req.method!=="GET") return res.status(405).json({ok:false,error:"GET only"});
  const secret=process.env.CRON_SECRET||"";
  const fingerprint=secret?createHash("sha256").update(secret,"utf8").digest("hex").slice(0,12):null;
  res.setHeader("Cache-Control","no-store");
  return res.status(200).json({
    ok:true,
    configured:Boolean(secret),
    length:secret.length,
    fingerprint
  });
};
