import test from 'node:test';
import assert from 'node:assert/strict';
import {blank,project,applyOperation} from '../lib/domain.js';
import {resolveAITool,permitted,providerStatus,meetingURL,generateAI,sendEmail,sendWhatsApp} from '../lib/providers.js';
import {integrationAction,aggregateContext} from '../lib/integration-actions.js';
const owner={id:'t1',role:'teacher',active:true,data:{name:'Teacher',features:{ai:true,email:true,push:true,online:true,ai_grading:false},studentLimit:10}};
function ctx(role='teacher'){const p=role==='teacher'?structuredClone(owner):{id:role==='admin'?'a1':'s1',role,teacher_id:role==='student'?'t1':null,active:true,data:{batchIds:['b1']}};return {p,owner:role==='admin'?'a1':'t1',profiles:[structuredClone(owner),p],db:blank(),platform:{}};}
test('global, teacher, tool and student AI permissions are enforced server-side',()=>{
 const c=ctx();assert.equal(permitted(c,'ai','quiz'),true);assert.equal(permitted(c,'ai','grading'),false);c.platform.services={ai:false};assert.equal(permitted(c,'ai','quiz'),false);
 const s=ctx('student');assert.equal(permitted(s,'ai','tutor'),false);s.profiles[0].data.features.studentAI=true;assert.equal(permitted(s,'ai','tutor'),true);assert.equal(permitted(s,'ai','quiz'),false);assert.equal(permitted(s,'email'),false);
});
test('provider status contains only names and flags, never secrets',()=>{const value=providerStatus({GROQ_API_KEY:'secret-sentinel'});assert.equal(value.ai.configured,true);assert.ok(!JSON.stringify(value).includes('secret-sentinel'));assert.ok(value.email.missing.includes('RESEND_API_KEY'));});
test('meeting URL rejects deceptive hosts, credentials and script protocols',()=>{for(const url of ['javascript:alert(1)','https://meet.google.com.evil.test/x','https://x@meet.google.com/abc','http://zoom.us/j/1'])assert.throws(()=>meetingURL(url));assert.equal(meetingURL('https://meet.google.com/abc-defg-hij'),'https://meet.google.com/abc-defg-hij');});
test('teacher cannot edit platform services and student cannot invoke admin AI',async()=>{await assert.rejects(integrationAction(ctx(),'service-settings',{},{}),/Super Admin/);await assert.rejects(integrationAction(ctx('student'),'ai-run',{tool:'operations',prompt:'help'},{}),/disabled/);});
test('daily AI limit blocks provider execution and reserves through CAS commit',async()=>{
 const c=ctx();c.db.integrationUsage={day:new Date().toISOString().slice(0,10),counts:{'t1:AI':30}};
 const old=process.env.GROQ_API_KEY;process.env.GROQ_API_KEY='test';
 try{await assert.rejects(integrationAction(c,'ai-run',{tool:'quiz',prompt:'Explain energy'},{commit:()=>{throw Error('should not commit');}}),/Daily AI limit/);}finally{if(old===undefined)delete process.env.GROQ_API_KEY;else process.env.GROQ_API_KEY=old;}
});
test('AI context excludes identities, emails, device tokens and delivery logs',()=>{
 const c=ctx();c.profiles.push({id:'s1',role:'student',teacher_id:'t1',email:'private@example.test',data:{name:'Private Student'},preferences:{pushToken:'private-token'}});
 c.db.integrationUsage={day:'x'};c.db.deliveryLog=[{secret:'delivery'}];
 const output=JSON.stringify(aggregateContext(c));assert.ok(!output.includes('private'));const view=project(c.p,c.db,c.profiles);assert.equal(view.integrationUsage,undefined);assert.equal(view.deliveryLog,undefined);
});
test('teacher can schedule only own active batch, with validated links',async()=>{
 const c=ctx();c.db.batches=[{id:'b1',status:'Active'}];let commits=0;
 const body={title:'Physics',batchId:'other',date:'2026-10-01',time:'18:00',url:'https://meet.google.com/abc-defg-hij'};
 await assert.rejects(integrationAction(c,'meeting-save',body,{commit:async()=>commits++}),/active batch/);
 await integrationAction(c,'meeting-save',{...body,batchId:'b1'},{commit:async()=>commits++});
 assert.equal(commits,1);assert.equal(c.db.events[0].teacherId,'t1');
});
test('disabled classroom modules reject forged direct changes',()=>{const c=ctx();c.profiles[0].data.features.attendance=false;assert.throws(()=>applyOperation(c.p,c.db,c.profiles,{entity:'attendance',id:'x',before:null,after:{id:'x',teacherId:'t1'}}),/disabled/);});
test('notification requests reject cross-workspace recipients before contacting provider',async()=>{await assert.rejects(integrationAction(ctx(),'notify',{channel:'email',recipientId:'stranger'},{}),/active account/);await assert.rejects(integrationAction(ctx('student'),'notify',{channel:'email'},{}),/disabled/);});
test('provider adapters send correct bounded payloads and sanitize errors',async()=>{
 const saved={...process.env},oldFetch=global.fetch,calls=[];
 try{
  Object.assign(process.env,{GROQ_API_KEY:'test',RESEND_API_KEY:'test',RESEND_FROM_EMAIL:'sender@example.test',WHATSAPP_ACCESS_TOKEN:'test',WHATSAPP_PHONE_NUMBER_ID:'123',WHATSAPP_GRAPH_VERSION:'v23.0',WHATSAPP_TEMPLATE_NAME:'class_update',WHATSAPP_TEMPLATE_LANGUAGE:'en'});
  global.fetch=async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>url.includes('groq')?{choices:[{message:{content:'Draft'}}]}:url.includes('resend')?{id:'email1'}:{messages:[{id:'wa1'}]}};};
  assert.equal((await generateAI('quiz','Topic','bn',{})).text,'Draft');assert.equal(await sendEmail('r@example.test','Title','Body','idempotency-test'),'email1');assert.equal(await sendWhatsApp('8801700000000','Update'),'wa1');
  assert.equal(calls[1].options.headers['Idempotency-Key'],'idempotency-test');assert.equal(JSON.parse(calls[2].options.body).template.components[0].parameters[0].text,'Update');
  global.fetch=async()=>({ok:false,status:401,json:async()=>({error:'secret-sentinel'})});await assert.rejects(generateAI('quiz','Topic','en',{}),e=>e.message.includes('credentials')&&!e.message.includes('secret-sentinel'));
 }finally{global.fetch=oldFetch;for(const k of Object.keys(process.env))if(!(k in saved))delete process.env[k];Object.assign(process.env,saved);}
});

test('individual student AI denial overrides teacher permission',()=>{const c=ctx('student');c.profiles[0].data.features.studentAI=true;c.p.data.aiEnabled=false;assert.equal(permitted(c,'ai','tutor'),false);});
test('online class links disappear when disabled globally or for the tenant',()=>{const c=ctx();c.db.events=[{id:'meeting',teacherId:'t1',type:'Online class',meetingUrl:'https://meet.google.com/abc-defg-hij'}];assert.equal(project(c.p,c.db,c.profiles).events.length,1);assert.equal(project(c.p,c.db,c.profiles,{services:{online:false}}).events.length,0);c.profiles[0].data.features.online=false;assert.equal(project(c.p,c.db,c.profiles).events.length,0);});
test('teachers cannot change individual student AI access',async()=>{await assert.rejects(integrationAction(ctx(),'student-access',{id:'s1',enabled:true},{}),/Super Admin/);});
test('repeated notification request is rejected before sending again',async()=>{const c=ctx();c.profiles.push({id:'s1',role:'student',teacher_id:'t1',active:true});const id='00000000-0000-0000-0000-000000000001';c.db.deliveryLog=[{id}];await assert.rejects(integrationAction(c,'notify',{channel:'email',recipientId:'s1',subject:'Title',text:'Body',requestId:id},{}),/already been submitted/);});

test('API connection status is Super Admin only, including direct requests',async()=>{for(const role of ['teacher','student'])await assert.rejects(integrationAction(ctx(role),'integration-status',{},{}),e=>e.status===403);const result=await integrationAction(ctx('admin'),'integration-status',{},{});assert.ok(result.status);});

test('all character agents resolve to connected tools without bypassing role or feature permissions',async()=>{
 assert.equal(resolveAITool('agent-appDoctor','admin').tool,'support');
 assert.equal(resolveAITool('agent-communication','teacher').tool,'guardian');
 assert.equal(resolveAITool('agent-tutor','student').tool,'tutor');
 assert.equal(resolveAITool('agent-help','student').tool,'tutor');
 for(const id of ['agent-appDoctor','agent-communication','agent-unknown'])
  await assert.rejects(integrationAction(ctx('student'),'ai-run',{tool:id,prompt:'Help me'},{}),/disabled/);
 const c=ctx();c.profiles[0].data.features.ai_guardian=false;
 await assert.rejects(integrationAction(c,'ai-run',{tool:'agent-communication',prompt:'Write a notice'},{}),/disabled/);
 const student=ctx('student');student.profiles[0].data.features.studentAI=false;
 await assert.rejects(integrationAction(student,'ai-run',{tool:'agent-help',prompt:'Help me'},{}),/disabled/);
});
