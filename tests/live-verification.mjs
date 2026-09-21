
import {createClient} from '@supabase/supabase-js';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const base=process.env.SCIENCE_LAB_TEST_URL||'https://sciencelab-silk.vercel.app';
const url=new URL(process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL).origin;
const check=r=>{if(r.error)throw Error(r.error.message);return r.data;};
const admin=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const auth=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const report={},created=[],clients=[];
async function api(token,action,body,view){
 const response=await fetch(base+'/api/app?action='+action,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,...(body===undefined?{}:{'Content-Type':'application/json'}),...(view?{'X-View-Teacher':view}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(65000)});
 const data=await response.json();return {status:response.status,data};
}
async function ok(token,action,body,view){const r=await api(token,action,body,view);if(r.status>=400)throw Error(action+': '+r.data.error);return r.data;}
async function login(credentials){
 const client=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});clients.push(client);
 const r=check(await client.auth.signInWithPassword({email:credentials.email,password:credentials.password}));return r.session.access_token;
}
try{
 const cfg=await (await fetch(base+'/api/app?action=config')).json();assert.equal(cfg.url,url);report.publicConfig='Matches expected Supabase project';
 const owner=check(await admin.from('sl_profiles').select('id,email,role,active').eq('role','admin').single());assert.equal(owner.email,'sagorforhad1@gmail.com');assert.ok(owner.active);
 const link=check(await admin.auth.admin.generateLink({type:'magiclink',email:owner.email}));
 const ownerSession=check(await auth.auth.verifyOtp({token_hash:link.properties.hashed_token,type:'magiclink'}));const token=ownerSession.session.access_token;
 const ownerData=await ok(token,'session');assert.equal(ownerData.profile.role,'admin');report.ownerSession='Authenticated app access passed (existing password unchanged)';
 report.providers=await ok(token,'provider-check',{});
 const services=await ok(token,'integration-status',{});if(services.settings.email){await ok(token,'service-settings',{...services.settings,email:false});}report.emailDelivery='Disabled as requested until a sender domain is available';
 const plan=ownerData.db.plans.find(p=>p.studentLimit>=1&&p.batchLimit>=1);assert.ok(plan,'No usable existing plan');
 const marker=randomUUID().slice(0,8);
 const teacher=await ok(token,'account',{role:'teacher',record:{name:'Verification teacher '+marker,email:'science-lab-check-'+marker+'@example.com',phone:'01700000000',coaching:'Verification workspace',plan:plan.id,status:'Active',expiry:'2026-12-31'}});created.push(teacher.id);
 const initialView=await ok(token,'session',undefined,teacher.id);assert.equal(initialView.profile.viewing,true);assert.equal(initialView.profile.mustChangePassword,false);assert.ok(initialView.db);report.newTeacherPreview='Owner can preview before first teacher login without a password-change prompt';
 let tt=await login(teacher);const first=await ok(tt,'session');assert.equal(first.profile.mustChangePassword,true);
 const teacherPassword='Test!'+randomUUID();await ok(tt,'password',{password:teacherPassword});tt=await login({email:teacher.email,password:teacherPassword});report.teacherCreation='Created, password login and required first-password change passed';
 let td=await ok(tt,'session');const before=td.db.teachers.find(p=>p.id===teacher.id);
 const photo='data:image/png;base64,'+Buffer.concat([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l6sAAAAASUVORK5CYII=','base64'),Buffer.alloc(80000)]).toString('base64');
 await ok(tt,'mutate',{ops:[{entity:'teachers',id:teacher.id,before,after:{...before,bio:'Verification biography',subject:'Physics',photoData:photo,leaderboard:true}}]});
 const saved=(await ok(token,'session')).db.teachers.find(p=>p.id===teacher.id);
 const off={...saved,name:'Renamed verification teacher',features:{...saved.features,ai_agent_help:false,ai_quiz:false}};
 await ok(token,'mutate',{ops:[{entity:'teachers',id:teacher.id,before:saved,after:off}]});
 const renamed=(await ok(tt,'session')).db.teachers.find(p=>p.id===teacher.id);assert.equal(renamed.name,off.name);assert.equal(renamed.features.ai_quiz,false);
 assert.equal((await api(tt,'ai-run',{tool:'quiz',prompt:'Make a quiz'})).status,403);
 assert.equal((await api(tt,'ai-run',{tool:'agent-help',prompt:'Help me'})).status,403);
 assert.equal((await api(tt,'mutate',{ops:[{entity:'teachers',id:teacher.id,before:saved,after:saved}]})).status,409);
 report.largeProfileAndToggles='106 KB profile image saved; admin rename persisted; disabled quiz and agent denied; stale edit rejected';
 const batch={id:randomUUID(),teacherId:teacher.id,name:'Verification batch',subject:'Physics',status:'Active',capacity:3,fee:0};
 await ok(tt,'mutate',{ops:[{entity:'batches',id:batch.id,before:null,after:batch}]});
 const student=await ok(tt,'account',{role:'student',record:{name:'Verification student',email:'science-lab-student-'+marker+'@example.com',studentId:'CHECK-'+marker,grade:'10',guardian:'Verification guardian',guardianPhone:'01700000000',batchIds:[batch.id]}});created.push(student.id);
 let st=await login(student);const studentPassword='Test!'+randomUUID();await ok(st,'password',{password:studentPassword});st=await login({email:student.email,password:studentPassword});
 let sd=await ok(st,'session');assert.equal(sd.db.teachers[0].bio,'Verification biography');assert.equal(sd.db.teachers[0].photoData,photo);assert.equal(sd.db.students.length,1);
 const sp=sd.db.students[0];await ok(st,'mutate',{ops:[{entity:'students',id:student.id,before:sp,after:{...sp,bio:'Student profile test',interests:'Physics',photoData:photo}}]});
 assert.equal((await api(st,'integration-status',{})).status,403);
 assert.equal((await api(tt,'integration-status',{})).status,403);
 assert.equal((await api(tt,'session',undefined,teacher.id)).status,403);
 const view=await ok(token,'session',undefined,teacher.id);assert.equal(view.profile.viewing,true);assert.equal(view.profile.role,'teacher');assert.equal(view.db.students.length,1);
 assert.equal((await api(token,'mutate',{ops:[]},teacher.id)).status,403);
 assert.equal((await api(token,'ai-run',{tool:'tutor',prompt:'Say hello'},teacher.id)).status,403);
 report.profilesAndPreview='Teacher identity → student dashboard, student self-edit, private API controls and read-only preview passed';
 const attendance={id:randomUUID(),teacherId:teacher.id,batchId:batch.id,studentId:student.id,date:new Date().toISOString().slice(0,10),status:'Present'};
 await ok(tt,'mutate',{ops:[{entity:'attendance',id:attendance.id,before:null,after:attendance}]});
 assert.equal((await ok(st,'session')).db.attendance[0].status,'Present');report.attendance='Teacher save → student view passed';
 await ok(token,'ai-limits',{id:teacher.id,daily:2,monthly:1});
 try{
  const ai=await ok(tt,'ai-run',{tool:'tutor',prompt:'Explain Newton first law in one short sentence.',language:'en'});assert.ok(ai.text?.length>0);
  const usage=(await ok(tt,'ai-usage',{})).accounts[0];assert.equal(usage.monthlyUsed,1);assert.equal(usage.monthlyRemaining,0);assert.equal(usage.dailyUsed,1);assert.equal(usage.tokens,ai.usage);
  assert.equal((await api(tt,'ai-run',{tool:'tutor',prompt:'Explain gravity.'})).status,429);
  report.liveAI={responseReceived:true,recordedTokens:usage.tokens,monthlyLimitEnforced:true};
 }catch(e){report.liveAI={error:e.message};}
 await ok(token,'ai-limits',{id:teacher.id,daily:0,monthly:null});assert.equal((await ok(tt,'ai-usage',{})).accounts[0].dailyRemaining,0);
 assert.equal((await api(tt,'ai-run',{tool:'tutor',prompt:'Explain gravity.'})).status,429);report.zeroLimit='Enforced';
}catch(e){report.failure=e.message;process.exitCode=1;}
finally{
 for(const client of clients)await client.auth.signOut({scope:'local'}).catch(()=>{});
 await auth.auth.signOut({scope:'local'}).catch(()=>{});
 for(const id of created.reverse()){const result=await admin.auth.admin.deleteUser(id);if(result.error){report.cleanupError=result.error.message;process.exitCode=1;}}
 report.cleanedTestAccounts=created.length;
 console.log(JSON.stringify(report,null,2));
}
