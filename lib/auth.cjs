const {timingSafeEqual}=require("node:crypto");
const {verifyGitHubOidcToken}=require("./github-oidc.cjs");

function safeEqual(a,b){
  if(typeof a!=="string"||typeof b!=="string"||!a||!b) return false;
  const aa=Buffer.from(a,"utf8"),bb=Buffer.from(b,"utf8");
  if(aa.length!==bb.length) return false;
  return timingSafeEqual(aa,bb);
}

function isPublishAuthorized(req){
  const header=typeof req?.headers?.["x-publish-secret"]==="string"?req.headers["x-publish-secret"]:"";
  return safeEqual(header,process.env.PUBLISH_SECRET||"");
}

function isCronAuthorized(req){
  const auth=typeof req?.headers?.authorization==="string"?req.headers.authorization:"";
  const secret=process.env.CRON_SECRET||"";
  return Boolean(secret)&&safeEqual(auth,`Bearer ${secret}`);
}

function isPublishOrCronAuthorized(req){
  return isPublishAuthorized(req)||isCronAuthorized(req);
}

async function isSchedulerAuthorized(req,{allowedRefs}={}){
  if(isPublishOrCronAuthorized(req)) return true;
  const auth=typeof req?.headers?.authorization==="string"?req.headers.authorization:"";
  if(!auth.startsWith("Bearer ")) return false;
  const token=auth.slice(7).trim();
  try{
    return await verifyGitHubOidcToken(token,{allowedRefs});
  }catch{
    return false;
  }
}

module.exports={safeEqual,isPublishAuthorized,isCronAuthorized,isPublishOrCronAuthorized,isSchedulerAuthorized};
