import {requireThat} from './domain.js';
import {serviceSettings} from './providers.js';
export function usageSummary(p,raw,platform={},now=new Date()){
 const month=now.toISOString().slice(0,7),day=now.toISOString().slice(0,10);
 const cfg=serviceSettings(p.role==='admin'?raw:platform);
 const dailyLimit=Math.min(cfg.dailyAiLimit,p.data.aiDailyLimit??cfg.dailyAiLimit);
 const monthlyLimit=p.data.aiMonthlyLimit??null;
 const entries=(raw.aiUsage||[]).filter(x=>x.accountId===p.id&&x.month===month);
 const dailyUsed=raw.integrationUsage?.day===day?raw.integrationUsage.counts?.[p.id+':AI']||0:0;
 const features={};for(const r of entries){const f=features[r.tool]??={requests:0,tokens:0,unknownTokens:0};f.requests++;if(Number.isInteger(r.tokens))f.tokens+=r.tokens;else f.unknownTokens++;}
 const monthlyUsed=entries.length;
 const ratio=Math.max(dailyLimit?dailyUsed/dailyLimit:1,monthlyLimit===null?0:monthlyLimit?monthlyUsed/monthlyLimit:1);
 return {id:p.id,name:p.data.name||p.email,dailyLimit,dailyUsed,dailyRemaining:Math.max(0,dailyLimit-dailyUsed),monthlyLimit,monthlyUsed,monthlyRemaining:monthlyLimit===null?null:Math.max(0,monthlyLimit-monthlyUsed),tokens:entries.reduce((n,r)=>n+(r.tokens??0),0),unknownTokens:entries.filter(r=>!Number.isInteger(r.tokens)).length,features,resetAt:new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+1,1)).toISOString(),dailyResetAt:new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()+1)).toISOString(),trackingSince:raw.aiTrackingSince||null,alert:ratio>=.9?90:ratio>=.8?80:null};
}
export function checkMonthlyQuota(summary){requireThat(summary.monthlyLimit===null||summary.monthlyUsed<summary.monthlyLimit,'Monthly AI request limit reached. Contact the Super Admin.',429);}
export function assertViewAction(role,target,action){if(!target)return;requireThat(role==='admin','Only the Super Admin can view a teacher.');requireThat(['session','ai-usage','file'].includes(action),'Teacher preview is read-only. Exit preview to make changes.');}
