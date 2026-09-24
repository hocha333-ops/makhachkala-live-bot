const {createPublicKey,verify}=require("node:crypto");

const ISSUER="https://token.actions.githubusercontent.com";
const JWKS_URL="https://token.actions.githubusercontent.com/.well-known/jwks";
const AUDIENCE="makhachkala-live-vercel";
const REPOSITORY="hocha333-ops/makhachkala-live-bot";
const REPOSITORY_ID="1383906861";
const REPOSITORY_OWNER="hocha333-ops";
const REPOSITORY_OWNER_ID="318683842";
const WORKFLOW_NAME="Makhachkala LIVE scheduler";
const WORKFLOW_PATH=".github/workflows/scheduler.yml";

let jwksCache={expiresAt:0,keys:[]};

function decodeJsonPart(part){
  try{
    return JSON.parse(Buffer.from(part,"base64url").toString("utf8"));
  }catch{
    return null;
  }
}

async function getJwks(fetchFn=global.fetch){
  const now=Date.now();
  if(jwksCache.keys.length&&jwksCache.expiresAt>now) return jwksCache.keys;
  const r=await fetchFn(JWKS_URL,{headers:{"User-Agent":"MakhachkalaLIVE/2.10 OIDC"},signal:AbortSignal.timeout(6000)});
  if(!r.ok) throw new Error(`GitHub JWKS HTTP ${r.status}`);
  const data=await r.json();
  if(!data||!Array.isArray(data.keys)||!data.keys.length) throw new Error("GitHub JWKS empty");
  jwksCache={keys:data.keys,expiresAt:now+5*60*1000};
  return data.keys;
}

function audienceMatches(aud){
  if(typeof aud==="string") return aud===AUDIENCE;
  return Array.isArray(aud)&&aud.includes(AUDIENCE);
}

function claimsValid(payload,allowedRefs){
  const now=Math.floor(Date.now()/1000);
  if(!payload||payload.iss!==ISSUER||!audienceMatches(payload.aud)) return false;
  if(typeof payload.exp!=="number"||payload.exp<now-30) return false;
  if(typeof payload.nbf==="number"&&payload.nbf>now+60) return false;
  if(typeof payload.iat==="number"&&payload.iat>now+60) return false;

  if(payload.repository!==REPOSITORY) return false;
  if(String(payload.repository_id||"")!==REPOSITORY_ID) return false;
  if(payload.repository_owner!==REPOSITORY_OWNER) return false;
  if(String(payload.repository_owner_id||"")!==REPOSITORY_OWNER_ID) return false;

  const refs=Array.isArray(allowedRefs)&&allowedRefs.length?allowedRefs:["refs/heads/main"];
  if(!refs.includes(payload.ref)) return false;

  if(payload.workflow!==WORKFLOW_NAME) return false;
  if(payload.workflow_ref!==`${REPOSITORY}/${WORKFLOW_PATH}@${payload.ref}`) return false;
  if(!["schedule","workflow_dispatch","push"].includes(payload.event_name)) return false;
  return true;
}

async function verifyGitHubOidcToken(token,{allowedRefs,fetchFn=global.fetch}={}){
  if(typeof token!=="string"||token.length<100||token.length>12000) return false;
  const parts=token.split(".");
  if(parts.length!==3) return false;
  const header=decodeJsonPart(parts[0]);
  const payload=decodeJsonPart(parts[1]);
  if(!header||header.alg!=="RS256"||typeof header.kid!=="string"||!claimsValid(payload,allowedRefs)) return false;

  const keys=await getJwks(fetchFn);
  const jwk=keys.find(k=>k.kid===header.kid&&k.kty==="RSA");
  if(!jwk) return false;

  const key=createPublicKey({key:jwk,format:"jwk"});
  const signingInput=Buffer.from(`${parts[0]}.${parts[1]}`,"utf8");
  const signature=Buffer.from(parts[2],"base64url");
  return verify("RSA-SHA256",signingInput,key,signature);
}

function resetJwksCache(){jwksCache={expiresAt:0,keys:[]};}

module.exports={
  verifyGitHubOidcToken,claimsValid,resetJwksCache,
  ISSUER,JWKS_URL,AUDIENCE,REPOSITORY,REPOSITORY_ID,REPOSITORY_OWNER,REPOSITORY_OWNER_ID,WORKFLOW_NAME,WORKFLOW_PATH
};
