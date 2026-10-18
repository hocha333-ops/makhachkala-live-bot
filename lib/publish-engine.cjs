const journal=require("./journal.cjs");
const telegram=require("./telegram.cjs");
const {sameStory}=require("./story-quality.cjs");

function recentlyCovered(row,now){
  if(row.status!=="published")return false;
  const date=Date.parse(row.published_at||row.updated_at||"");
  return !Number.isFinite(date)||now.getTime()-date<72*3600000;
}

async function publishItems(candidates,options={}){
  const now=options.now||new Date();
  const recent=options.recent||journal.recentPublications;
  const claim=options.claim||journal.claimPublication;
  const mark=options.mark||journal.markPublication;
  const send=options.send||telegram.sendTelegramMessage;
  const format=options.format;
  const limit=options.limit??3,priorityLimit=options.priorityLimit??2;
  if(typeof format!=="function")throw new Error("post formatter required");
  const rows=await recent(200); // hard fail before posting if the journal is unreachable
  if(!Array.isArray(rows))throw new Error("journal_recent_invalid");
  const previously=rows.filter(x=>recentlyCovered(x,now));
  const seen=previously.map(x=>({...x}));
  const published=[],skipped=[],errors=[];
  const perPriority=new Map();

  for(const item of candidates){
    if(published.length>=limit)break;
    if((perPriority.get(item.priority)||0)>=priorityLimit){
      skipped.push({title:item.title,link:item.link,reason:"priority_cap"});
      continue;
    }
    if(seen.some(other=>sameStory(item,other))){
      skipped.push({title:item.title,link:item.link,reason:"already_covered"});
      continue;
    }
    let claimed;
    try{claimed=await claim(item);}
    catch(e){errors.push({title:item.title,reason:"journal_claim_error",error:e.message});continue;}
    if(!claimed||claimed.claimed!==true){
      skipped.push({title:item.title,link:item.link,reason:"duplicate_or_pending",status:claimed?.status||null});
      continue;
    }

    let message;
    try{message=await send(format(item),{parseMode:"HTML"});}
    catch(e){
      // Ambiguous network errors can happen AFTER Telegram accepted the message.
      // Never mark such claims failed: a blind retry could publish twice.
      if(e.telegramRejected===true){
        try{await mark(item.link,"failed",null,e.message);}
        catch(markError){errors.push({title:item.title,reason:"journal_after_rejection",error:markError.message});}
      }
      errors.push({title:item.title,reason:e.telegramRejected?"telegram_rejected":"telegram_delivery_uncertain",error:e.message});
      continue;
    }
    if(!Number.isInteger(message?.message_id)||message.message_id<=0){
      errors.push({title:item.title,reason:"telegram_message_id_missing"});
      continue;
    }
    try{
      let receipt=await mark(item.link,"published",message.message_id,null);
      if(receipt?.status!=="published"||Number(receipt.telegram_message_id)!==message.message_id){
        throw new Error("journal did not confirm Telegram message_id");
      }
    }catch(e){
      // The post IS already in Telegram; keep the row pending for reconciliation.
      errors.push({title:item.title,reason:"telegram_sent_journal_unconfirmed",message_id:message.message_id,error:e.message});
      continue;
    }
    const row={message_id:message.message_id,title:item.title,link:item.link,priority:item.priority};
    published.push(row);
    seen.push({title:item.title,published_at:now.toISOString(),status:"published"});
    perPriority.set(item.priority,(perPriority.get(item.priority)||0)+1);
  }
  return {published,skipped,errors};
}

module.exports={publishItems,recentlyCovered};
