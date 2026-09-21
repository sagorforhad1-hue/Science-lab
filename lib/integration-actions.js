import {randomUUID} from 'node:crypto';
import {saveProfile} from './profile-save.js';
import {aiAttachments} from './ai-input.js';
import {usageSummary,checkMonthlyQuota} from './usage.js';
import {requireThat,project} from './domain.js';
import {resolveAITool,AI_TOOLS,SERVICE_DEFAULTS,providerStatus,permitted,serviceSettings,generateAI,sendEmail,sendPush,sendWhatsApp,firebaseConfig,firebaseValue,meetingURL,verifyConnections} from './providers.js';
export const integrationActions=new Set(['provider-check','ai-usage','ai-limits','push-config','integration-status','service-settings','ai-run','notify','push-register','meeting-save','meeting-delete','student-access']);
export function aggregateContext(c){
 const d=project(c.p,c.db,c.profiles,c.platform);
 return c.p.role==='admin'?{teachers:d.teachers.length,activeTeachers:d.teachers.filter(t=>t.status==='Active').length,students:d.students.length,plans:d.plans.map(p=>({name:p.name,price:p.price})),billing:d.billing.map(b=>({amount:b.amount,status:b.status,month:b.month})).slice(-100)}:
 {students:d.students.length,batches:d.batches.length,attendance:{total:d.attendance.length,present:d.attendance.filter(a=>a.status==='Present').length,absent:d.attendance.filter(a=>a.status==='Absent').length},assignments:d.assignments.length,submissions:d.submissions.length,marks:d.marks.map(m=>({marks:m.marks})).slice(-100)};
}
async function reserve(c,key,limit,commit){
 const day=new Date().toISOString().slice(0,10),current=c.db.integrationUsage?.day===day?c.db.integrationUsage:{day,counts:{}};
 const id=c.p.id+':'+key,count=current.counts[id]||0;
 requireThat(count<limit,'Daily '+key+' limit reached. Contact the Super Admin.',429);
 current.counts[id]=count+1;c.db.integrationUsage=current;await commit(c);
}
export async function integrationAction(c,action,b,{check,commit}){
 if(action==='provider-check'){requireThat(c.p.role==='admin','Only the Super Admin can check providers.');return verifyConnections();}
 if(action==='ai-usage'){
  if(c.p.role!=='admin'){const owner=c.profiles.find(p=>p.id===c.owner);return {accounts:[usageSummary({...c.p,data:{...c.p.data,aiDailyLimit:owner?.data.aiDailyLimit,aiMonthlyLimit:owner?.data.aiMonthlyLimit}},c.db,c.platform)]};}
  const rows=check(await c.admin.from('sl_workspaces').select('owner_id,data'));
  return {accounts:[c.p,...c.profiles.filter(p=>p.role==='teacher')].map(p=>usageSummary(p,rows.find(w=>w.owner_id===p.id)?.data||{},c.db))};
 }
 if(action==='ai-limits'){
  requireThat(c.p.role==='admin','Only the Super Admin can set limits.');
  const p=c.profiles.find(p=>p.id===b.id&&p.role==='teacher');requireThat(p,'Teacher not found.',404);
  requireThat(Number.isInteger(b.daily)&&b.daily>=0&&b.daily<=500,'Daily limit must be 0–500.',400);
  requireThat(b.monthly===null||Number.isInteger(b.monthly)&&b.monthly>=0&&b.monthly<=15000,'Monthly limit must be 0–15,000, or blank.',400);
  const rows=check(await saveProfile(c.admin,p,{...p.data,aiDailyLimit:b.daily,aiMonthlyLimit:b.monthly}));
  requireThat(rows.length===1,'Account changed. Refresh and retry.',409);return {ok:true};
 }
 if(action==='push-config'){
  requireThat(permitted(c,'push'),'Push notifications are disabled.');
  return {firebase:providerStatus().push.configured?{config:firebaseConfig(),vapidKey:firebaseValue('FIREBASE_VAPID_KEY')}:null};
 }
 if(action==='integration-status'){
  requireThat(c.p.role==='admin','Only the Super Admin can view API connections.');
  const status=providerStatus(),config=serviceSettings(c.p.role==='admin'?c.db:c.platform);
  for(const key of Object.keys(status)){status[key].enabled=permitted(c,key,key==='ai'&&c.p.role==='student'?'tutor':undefined);if(c.p.role!=='admin')delete status[key].missing;}
  return {status,settings:c.p.role==='admin'?config:undefined,tools:Object.entries(AI_TOOLS).filter(([k,v])=>v.roles.includes(c.p.role)&&permitted(c,'ai',k)).map(([id,v])=>({id,label:v.label})),firebase:status.push.configured&&status.push.enabled?{config:firebaseConfig(),vapidKey:firebaseValue('FIREBASE_VAPID_KEY')}:null,history:c.p.role==='student'?[]:(c.db.deliveryLog||[]).slice(0,30)};
 }
 if(action==='student-access'){
  requireThat(c.p.role==='admin','Only the Super Admin can change student AI access.');
  const student=c.profiles.find(p=>p.id===b.id&&p.role==='student');requireThat(student&&typeof b.enabled==='boolean','Invalid student.',400);
  const changed=check(await saveProfile(c.admin,student,{...student.data,aiEnabled:b.enabled}));requireThat(changed.length===1,'Account changed. Refresh and retry.',409);return {ok:true};
 }
 if(action==='service-settings'){
  requireThat(c.p.role==='admin','Only the Super Admin can manage services.');
  const next={};for(const k of Object.keys(SERVICE_DEFAULTS)){if(k.startsWith('daily')){requireThat(Number.isInteger(b[k])&&b[k]>=1&&b[k]<=500,'Daily limits must be 1–500.',400);}else requireThat(typeof b[k]==='boolean','Invalid service setting.',400);next[k]=b[k];}
  c.db.services=next;await commit(c);return {ok:true};
 }
 if(action==='ai-run'){
  if(typeof b.tool==='string'&&b.tool.startsWith('agent-')&&c.p.role!=='admin')requireThat(c.profiles.find(p=>p.id===c.owner)?.data.features?.['ai_agent_'+b.tool.slice(6)]!==false,'This AI agent is disabled for your account.');
  const agent=resolveAITool(b.tool,c.p.role);
  b={...b,tool:agent.tool};
  requireThat(AI_TOOLS[b.tool]?.roles.includes(c.p.role)&&permitted(c,'ai',b.tool),'This AI tool is disabled for your account.');
  requireThat(typeof b.prompt==='string'&&b.prompt.trim().length>=3&&b.prompt.length<=12000,'Enter 3–12,000 characters.',400);
  const files=aiAttachments(b.attachments);
  requireThat(providerStatus().ai.configured,'GROQ_API_KEY is missing on Vercel.',503);
  const cfg=serviceSettings(c.p.role==='admin'?c.db:c.platform),teacher=c.profiles.find(p=>p.id===c.owner);
  const limit=Math.min(cfg.dailyAiLimit,teacher?.data.aiDailyLimit??cfg.dailyAiLimit);
  const quotaProfile={...c.p,data:{...c.p.data,aiDailyLimit:teacher?.data.aiDailyLimit,aiMonthlyLimit:teacher?.data.aiMonthlyLimit}};
  checkMonthlyQuota(usageSummary(quotaProfile,c.db,c.platform));
  const entry={id:randomUUID(),accountId:c.p.id,tool:b.tool,month:new Date().toISOString().slice(0,7),created:new Date().toISOString(),status:'Processing',tokens:null};
  c.db.aiTrackingSince||=entry.created;
  c.db.aiUsage=[...(c.db.aiUsage||[]).filter(r=>r.month>=new Date(Date.now()-93*86400000).toISOString().slice(0,7)),entry];
  await reserve(c,'AI',limit,commit);
  let result,error;try{result=await generateAI(b.tool,b.prompt,b.language,aggregateContext(c),agent.instruction,files);entry.status='Completed';entry.tokens=Number.isInteger(result.usage)?result.usage:null;}catch(e){error=e;entry.status='Failed or unknown';}
  let saved=false;for(let i=0;i<4&&!saved;i++){
   const latest=check(await c.admin.from('sl_workspaces').select('*').eq('owner_id',c.owner).single());
   const data={...latest.data,aiUsage:(latest.data.aiUsage||[]).map(r=>r.id===entry.id?entry:r)};
   saved=check(await c.admin.from('sl_workspaces').update({data,version:latest.version+1}).eq('owner_id',c.owner).eq('version',latest.version).select('version')).length===1;
  }
  if(error)throw error;return {...result,usageSaved:saved};
 }
 if(action==='push-register'){
  requireThat(permitted(c,'push')&&providerStatus().push.configured,'Push notifications are disabled or unconfigured.');
  requireThat(typeof b.token==='string'&&b.token.length>=20&&b.token.length<=4096,'Invalid device token.',400);
  // One current browser subscription per account; never exposed in session responses.
  check(await c.admin.from('sl_profiles').update({preferences:{...c.p.preferences,pushToken:b.token}}).eq('id',c.p.id));return {ok:true};
 }
 if(action==='notify'){
  requireThat(c.p.role!=='student'&&['email','push','whatsapp'].includes(b.channel)&&permitted(c,b.channel),'This delivery channel is disabled.');
  const recipient=c.profiles.find(p=>p.id===b.recipientId&&(c.p.role==='admin'?p.role==='teacher':p.role==='student'&&p.teacher_id===c.p.id));
  requireThat(recipient?.active,'Choose an active account you manage.',400);
  requireThat(typeof b.subject==='string'&&b.subject.trim().length>0&&b.subject.length<=150&&typeof b.text==='string'&&b.text.trim().length>0&&b.text.length<=4000,'Enter a subject and message (maximum 4,000 characters).',400);
  requireThat(typeof b.requestId==='string'&&/^[0-9a-f-]{36}$/i.test(b.requestId),'Invalid request ID.',400);
  requireThat(!(c.db.deliveryLog||[]).some(r=>r.id===b.requestId),'This request has already been submitted. Check delivery history before retrying.',409);
  requireThat(providerStatus()[b.channel].configured,'This provider is not configured. Check API connections.',503);
  if(b.channel==='push')requireThat(recipient.preferences?.pushToken,'This person must enable push notifications on their device first.',400);
  if(b.channel==='whatsapp')requireThat(b.consent===true&&recipient.data.guardianPhone,'Confirm guardian consent and save an international guardian number first.',400);
  const entry={id:b.requestId,channel:b.channel,recipientId:recipient.id,created:new Date().toISOString(),status:'Processing'};
  c.db.deliveryLog=[entry,...(c.db.deliveryLog||[])].slice(0,100);
  await reserve(c,'messages',serviceSettings(c.p.role==='admin'?c.db:c.platform).dailySendLimit,commit);
  try{
   const providerId=b.channel==='email'?await sendEmail(recipient.email,b.subject,b.text,b.requestId):b.channel==='push'?await sendPush(recipient.preferences.pushToken,b.subject,b.text):await sendWhatsApp(recipient.data.guardianPhone.replace(/^\+/,'').replace(/[ ()-]/g,''),b.text);
   entry.status='Accepted by provider';entry.providerId=providerId;
  }catch(error){entry.status='Failed or delivery unknown';entry.error=error.message;}
  // Merge delivery result into the latest document so concurrent classroom edits are preserved.
  let saved=false;for(let i=0;i<3&&!saved;i++){
   const latest=check(await c.admin.from('sl_workspaces').select('*').eq('owner_id',c.owner).single());
   const data={...latest.data,deliveryLog:(latest.data.deliveryLog||[]).map(r=>r.id===entry.id?entry:r)};
   const updated=check(await c.admin.from('sl_workspaces').update({data,version:latest.version+1}).eq('owner_id',c.owner).eq('version',latest.version).select('version'));saved=updated.length===1;
  }
  return {ok:entry.status==='Accepted by provider',status:entry.status,error:entry.error,historySaved:saved};
 }
 if(action==='meeting-save'||action==='meeting-delete'){
  requireThat(c.p.role==='teacher'&&permitted(c,'online'),'Only an enabled teacher can manage online classes.');
  const old=c.db.events.find(e=>e.id===b.id&&e.type==='Online class');
  if(action==='meeting-delete'){requireThat(old,'Class not found.',404);c.db.events=c.db.events.filter(e=>e.id!==b.id);}
  else {
   requireThat(typeof b.title==='string'&&b.title.trim().length>0&&b.title.length<=150,'Enter a class title.',400);
   requireThat(c.db.batches.some(x=>x.id===b.batchId&&x.status==='Active'),'Select an active batch.',400);
   requireThat(typeof b.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(b.date)&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(b.time),'Set a class date and time.',400);
   const row={id:old?.id||randomUUID(),teacherId:c.p.id,type:'Online class',title:b.title,batchId:b.batchId,date:b.date,time:b.time,meetingUrl:meetingURL(b.url),created:new Date().toISOString()};
   c.db.events=old?c.db.events.map(e=>e.id===old.id?row:e):[row,...c.db.events];
  }
  await commit(c);return {ok:true};
 }
}
