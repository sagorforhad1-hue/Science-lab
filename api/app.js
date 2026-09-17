import {integrationActions,integrationAction} from '../lib/integration-actions.js';
import {createClient} from '@supabase/supabase-js';
import {randomBytes} from 'node:crypto';
import {assertViewAction} from '../lib/usage.js';
import {AppError,requireThat,same,blank,profileRecord,active,project,applyOperation,validateAccount,quizStart,quizSubmit} from '../lib/domain.js';
export const config={maxDuration:60};
const bucket='science-lab-private';
function settings(){
 const configuredURL=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
 const url=configuredURL?new URL(configuredURL).origin:undefined;
 const key=process.env.SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 requireThat(url&&key,'Supabase public configuration is missing.',503);
 let role='';try{role=JSON.parse(Buffer.from(key.split('.')[1]||'','base64url').toString()).role;}catch{}
 requireThat(!key.startsWith('sb_secret_')&&role!=='service_role','A private Supabase key was placed in the public-key setting. Fix server configuration.',503);
 return {url,key,secret};
}
const check=result=>{if(result.error){if(['42P01','PGRST205'].includes(result.error.code))throw new AppError(503,'Database setup is required. Run supabase/setup.sql first.');throw new AppError(400,result.error.message);}return result.data;};
function clients(){const {url,key,secret}=settings();requireThat(secret,'SUPABASE_SERVICE_ROLE_KEY is missing on the server.',503);return {admin:createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}}),url,key};}
async function context(req){
 const {admin,url,key}=clients(),token=(req.headers.authorization||'').replace(/^Bearer /,'');
 requireThat(token,'Please log in.',401);
 const {data,error}=await admin.auth.getUser(token);requireThat(!error&&data?.user,'Your session expired. Please log in again.',401);
 let p=check(await admin.from('sl_profiles').select('*').eq('id',data.user.id).maybeSingle());
 requireThat(p,'This login has not been assigned an app account. Contact your administrator.',403);
 const viewId=req.headers['x-view-teacher'];
 if(viewId){
  assertViewAction(p.role,viewId,new URL(req.url,'http://localhost').searchParams.get('action')||'session');
  requireThat(p.active&&!p.must_change_password,'Owner account is unavailable.');
  p=check(await admin.from('sl_profiles').select('*').eq('id',viewId).eq('role','teacher').maybeSingle());requireThat(p,'Teacher not found.',404);
 }
 const owner=p.role==='admin'?p.id:p.role==='teacher'?p.id:p.teacher_id;
 let profiles;
 if(p.role==='admin')profiles=check(await admin.from('sl_profiles').select('*'));
 else profiles=check(await admin.from('sl_profiles').select('*').or('id.eq.'+owner+',teacher_id.eq.'+owner));
 const teacher=profiles.find(x=>x.id===owner);active(p,teacher);
 const ws=check(await admin.from('sl_workspaces').select('*').eq('owner_id',owner).maybeSingle())||{owner_id:owner,version:0,data:{}};
 let platform={};
 if(p.role!=='admin'){const a=check(await admin.from('sl_profiles').select('id').eq('role','admin').maybeSingle());if(a)platform=check(await admin.from('sl_workspaces').select('data').eq('owner_id',a.id).maybeSingle())?.data||{};}
 return {admin,url,key,token,user:data.user,p,profiles,owner,ws,platform,viewing:!!viewId,db:Object.assign(blank(),ws.data)};
}
function payload(c){return {profile:{id:c.p.id,role:c.p.role,teacherId:c.p.role==='teacher'?c.p.id:c.p.teacher_id,email:c.p.email,mustChangePassword:c.viewing?false:c.p.must_change_password,viewing:c.viewing},db:project(c.p,c.db,c.profiles,c.platform)};}
async function commit(c){
 const changed=check(await c.admin.from('sl_workspaces').update({data:c.db,version:c.ws.version+1,updated_at:new Date().toISOString()}).eq('owner_id',c.owner).eq('version',c.ws.version).select('version'));
 requireThat(changed.length===1,'Data changed on another device. Refresh and try again.',409);c.ws.version++;
}
async function attachments(c,record){
 for(const f of [...(record?.files||[]),...(record?.feedbackFiles||[])]){
  requireThat(typeof f.id==='string','Invalid attachment.',400);
  const row=check(await c.admin.from('sl_files').select('*').eq('id',f.id).eq('tenant_id',c.owner).maybeSingle());
  requireThat(row,'Attachment does not belong to this workspace.');
  if(c.p.role==='student'&&row.owner_id!==c.p.id){
   const visible=payload(c).db;
   requireThat(Object.values(visible).filter(Array.isArray).flat().some(r=>[...(r.files||[]),...(r.feedbackFiles||[])].some(x=>x.id===f.id)),'Attachment is private.');
  }
  requireThat(f.name===row.name&&f.size===row.size&&f.type===row.mime,'Invalid attachment metadata.',400);
 }
}
async function updateProfile(c,op){
 const {entity,id,after,before}=op,target=c.profiles.find(p=>p.id===id);
 requireThat(target&&['teachers','students'].includes(entity),'Account not found.',404);
 requireThat(target.role===(entity==='teachers'?'teacher':'student'),'Invalid account.');
 requireThat(after,'Archive or suspend accounts instead of deleting them.',400);
 requireThat(same(profileRecord(target),before),'Account changed. Refresh and try again.',409);
 requireThat(after.id===id&&after.email===target.email,'Login email cannot be edited here.',400);
 if(c.p.role==='teacher'&&target.role==='student')requireThat(c.p.data.features?.students!==false,'Student management is disabled.');
 const permitted=c.p.role==='admin'&&target.role==='teacher'||c.p.role==='teacher'&&target.role==='student'&&target.teacher_id===c.p.id;
 const self=c.p.id===target.id;
 requireThat(permitted||self,'You cannot change this account.');
 if(self&&!permitted){
  const allowed=target.role==='teacher'?['name','coaching','photoData','coverData','logoData','subject','bio','leaderboard']:['name','phone','photoData','bio','interests'];
  for(const k of new Set([...Object.keys(before),...Object.keys(after)]))requireThat(same(before[k],after[k])||allowed.includes(k),'You cannot change account permissions.');
 }
 if(target.role==='student'){
  requireThat(after.aiEnabled===before.aiEnabled,'Only the Super Admin can change student AI permissions.');
  requireThat(after.teacherId===target.teacher_id,'Account ownership cannot change.');
  requireThat(Array.isArray(after.batchIds)&&after.batchIds.every(id=>c.db.batches.some(b=>b.id===id)),'Invalid enrollment.',400);
  requireThat(!c.profiles.some(p=>p.id!==id&&p.role==='student'&&p.data.studentId===after.studentId),'Student ID already exists.',409);
 }
 for(const k of ['photoData','coverData','logoData','guardianPhotoData'])if(after[k])requireThat(typeof after[k]==='string'&&after[k].length<=180000&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(after[k]),'Use a valid image under 130 KB.',400);
 for(const k of ['bio','interests','subject'])if(after[k]!==undefined)requireThat(typeof after[k]==='string'&&after[k].length<=2000,'Profile text is too long.',400);
 if(target.role==='teacher'&&after.aiDailyLimit!==undefined)requireThat(Number.isInteger(after.aiDailyLimit)&&after.aiDailyLimit>=0&&after.aiDailyLimit<=500,'AI limit must be 0–500.',400);
 if(target.role==='teacher'&&after.aiMonthlyLimit!=null)requireThat(Number.isInteger(after.aiMonthlyLimit)&&after.aiMonthlyLimit>=0&&after.aiMonthlyLimit<=15000,'Invalid monthly AI limit.',400);
 if(target.role==='teacher')for(const k of ['studentLimit','batchLimit','storageLimit'])requireThat(Number.isFinite(after[k])&&after[k]>=0,'Invalid account limit.',400);
 const data=structuredClone(after);delete data.id;delete data.email;delete data.teacherId;
 const isActive=!['Suspended','Archived'].includes(data.status);
 const changed=check(await c.admin.from('sl_profiles').update({data,active:isActive}).eq('id',id).eq('data',JSON.stringify(target.data)).select('id'));
 requireThat(changed.length===1,'Account changed. Refresh and try again.',409);
 Object.assign(target,{data,active:isActive});if(self)Object.assign(c.p,target);
}
async function createAccount(c,body){
 const role=body.role,record=body.record;if(c.p.role==='teacher')requireThat(c.p.data.features?.students!==false,'Student management is disabled.');validateAccount(c.p,role,record,c.profiles,c.db);
 const email=record.email.trim().toLowerCase(),password='Lab!'+randomBytes(15).toString('base64url');
 if(role==='teacher')requireThat(c.db.plans.some(p=>p.id===record.plan),'Choose a valid plan.',400);
 const created=await c.admin.auth.admin.createUser({email,password,email_confirm:true});const u=check(created).user;
 const data=structuredClone(record);delete data.id;delete data.teacherId;delete data.email;delete data.password;
 if(role==='teacher'){
  requireThat(c.db.plans.some(p=>p.id===data.plan),'Choose a valid plan.',400);
  const plan=c.db.plans.find(p=>p.id===data.plan);Object.assign(data,{studentLimit:plan.studentLimit,batchLimit:plan.batchLimit,storageLimit:plan.storageLimit,features:{messages:true,materials:true,quizzes:true,ai:true,fees:true,guardians:true,email:true,push:true,online:true,whatsapp:false,studentAI:false},joined:new Date().toISOString().slice(0,10)});
 }else {data.status='Active';data.joined=new Date().toISOString().slice(0,10);}
 try{
  check(await c.admin.rpc('sl_register_account',{creator_id:c.p.id,new_id:u.id,new_role:role,login_email:email,profile_data:data}));
 }catch(error){await c.admin.auth.admin.deleteUser(u.id);throw error;}
 return {email,password,id:u.id};
}
function bodyOf(req){const b=typeof req.body==='string'?JSON.parse(req.body):req.body||{};requireThat(JSON.stringify(b).length<=2000000,'Request is too large.',413);return b;}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const action=new URL(req.url,'http://localhost').searchParams.get('action')||req.query?.action||'session';
 try{
  requireThat(['GET','POST'].includes(req.method),'Method not allowed.',405);
  if(action==='config'){requireThat(req.method==='GET','Method not allowed.',405);const {url,key}=settings();return res.status(200).json({url,key});}
  const c=await context(req);
  if(action==='session')return res.status(200).json(c.p.must_change_password&&!c.viewing?{profile:payload(c).profile,db:null}:payload(c));
  requireThat(req.method==='POST','Method not allowed.',405);const body=bodyOf(req);
  if(action==='password'){
   requireThat(typeof body.password==='string'&&body.password.length>=12&&body.password.length<=128,'Use a password of 12–128 characters.',400);
   if(body.current){const auth=createClient(c.url,c.key,{auth:{persistSession:false,autoRefreshToken:false}});const {error}=await auth.auth.signInWithPassword({email:c.user.email,password:body.current});requireThat(!error,'Current password is incorrect.',400);await auth.auth.signOut({scope:'local'});}
   check(await c.admin.auth.admin.updateUserById(c.p.id,{password:body.password}));
   check(await c.admin.from('sl_profiles').update({must_change_password:false}).eq('id',c.p.id));return res.status(200).json({ok:true});
  }
  requireThat(c.viewing||!c.p.must_change_password,'Change your temporary password first.',403);
  if(integrationActions.has(action))return res.status(200).json(await integrationAction(c,action,body,{check,commit}));
  if(action==='account')return res.status(201).json(await createAccount(c,body));
  if(action==='preferences'){
   const settings=body.settings||{},notifications=body.notifications||{};
   const allowed=['language','theme','motion'];if(c.p.role!=='student')allowed.push('coaching','grading');if(c.p.role==='admin')allowed.push('uploadLimit','extensions','grace');
   const prefs={settings:Object.fromEntries(allowed.filter(k=>k in settings).map(k=>[k,settings[k]])),notifications:Object.fromEntries(['messages','notices','fees','attendance'].map(k=>[k,notifications[k]!==false]))};
   check(await c.admin.from('sl_profiles').update({preferences:{...c.p.preferences,...prefs}}).eq('id',c.p.id));return res.status(200).json({ok:true});
  }
  if(action==='mutate'){
   requireThat(Array.isArray(body.ops)&&body.ops.length<=500,'Too many changes.',400);
   let dirty=false;
   for(const op of body.ops){
    requireThat(op&&typeof op.entity==='string','Invalid change.',400);
    if(['teachers','students'].includes(op.entity)){await updateProfile(c,op);continue;}
    if(op.entity==='events'&&(op.after?.meetingUrl||op.before?.meetingUrl||op.after?.type==='Online class'))requireThat(false,'Manage this record from Online classes.',400);
    await attachments(c,op.after);applyOperation(c.p,c.db,c.profiles,op);dirty=true;
   }
   if(dirty)await commit(c);return res.status(200).json(payload(c));
  }
  if(action==='quiz-start'||action==='quiz-submit'){
   const t=c.profiles.find(p=>p.id===c.owner);requireThat(t?.data.features?.quizzes,'Quizzes are disabled.');
   const result=action==='quiz-start'?quizStart(c.p,c.db,body.quizId,c.p.data):quizSubmit(c.p,c.db,body.quizId,body.answers);
   await commit(c);return res.status(200).json({result,...(action==='quiz-submit'?payload(c):{})});
  }
  if(action==='upload'){
   requireThat(typeof body.id==='string'&&/^[0-9a-f-]{36}$/i.test(body.id),'Invalid file ID.',400);
   requireThat(typeof body.name==='string'&&body.name.length<=200&&Number.isInteger(body.size)&&body.size>0&&body.size<=10485760,'File maximum is 10 MB.',400);
   const ext=body.name.split('.').pop().toLowerCase();requireThat('pdf,jpg,jpeg,png,webp,doc,docx,ppt,pptx,mp3,mp4,wav,webm,ogg,m4a'.split(',').includes(ext),'Unsupported file type.',400);
   const used=check(await c.admin.from('sl_files').select('size').eq('tenant_id',c.owner));
   const max=(c.p.role==='admin'?100:c.profiles.find(p=>p.id===c.owner).data.storageLimit||100)*1048576;
   requireThat(used.reduce((n,f)=>n+f.size,0)+body.size<=max,'Storage quota reached.',400);
   const path=c.owner+'/'+body.id;
   const metadata={id:body.id,owner_id:c.p.id,tenant_id:c.owner,path,name:body.name,mime:typeof body.type==='string'?body.type:'application/octet-stream',size:body.size};
   check(await c.admin.from('sl_files').insert(metadata));
   try{const signed=check(await c.admin.storage.from(bucket).createSignedUploadUrl(path));return res.status(200).json({path,token:signed.token});}
   catch(error){await c.admin.from('sl_files').delete().eq('id',body.id);throw error;}
  }
  if(action==='file'){
   const row=check(await c.admin.from('sl_files').select('*').eq('id',body.id).maybeSingle());requireThat(row,'File not found.',404);
   const view=payload(c).db;
   const visible=Object.values(view).filter(Array.isArray).flat().some(r=>[...(r.files||[]),...(r.feedbackFiles||[])].some(f=>f.id===body.id));
   requireThat(row.owner_id===c.p.id||visible,'File is private.');
   const signed=check(await c.admin.storage.from(bucket).createSignedUrl(row.path,60));
   return res.status(200).json({url:signed.signedUrl,name:row.name,type:row.mime});
  }
  throw new AppError(404,'Unknown action.');
 }catch(error){const status=error instanceof AppError?error.status:500;if(status===500)console.error('Science Lab request failed:',error.name);res.status(status).json({error:status===500?'The server could not complete this request. Please try again.':error.message});}
}
