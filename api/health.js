module.exports=function handler(req,res){
  if(req.method!=="GET")return res.status(405).json({ok:false,error:"GET only"});
  res.setHeader("Cache-Control","no-store");
  // Public health should not disclose deployment secrets or operator configuration.
  return res.status(200).json({ok:true,service:"makhachkala-live-bot",version:"2.11.3"});
};
