import {createClient} from '@supabase/supabase-js';
let clientPromise;
let real=false,baseline=null,queued=null,draining=null,epoch=0,dirty=false;
export const isReal=()=>real;
export function client(){return clientPromise??=(async()=>{
 const response=await fetch('/api/app?action=config',{cache:'no-store'});const config=await response.json();
 if(!response.ok)throw Error(config.error||'Unable to load login configuration.');
 const supabase=createClient(config.url,config.key,{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'science-lab-auth'}});
 supabase.auth.onAuthStateChange((event)=>{
  if(event==='PASSWORD_RECOVERY'){sessionStorage.setItem('sl-password-recovery','1');window.dispatchEvent(new Event('sl-password-recovery'));}
  if(event==='SIGNED_OUT'&&real){reset();window.dispatchEvent(new Event('sl-signed-out'));}
 });return supabase;
 })().catch(error=>{clientPromise=null;throw error;});}
export async function request(action,body){
 const auth=await client();const {data:{session}}=await auth.auth.getSession();
 if(!session)throw Error('Please log in again.');
 const response=await fetch('/api/app?action='+action,{method:body===undefined?'GET':'POST',cache:'no-store',headers:{Authorization:'Bearer '+session.access_token,...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const result=await response.json();if(!response.ok)throw Error(result.error||'Request failed.');return result;
}
export async function restore(){const auth=await client();const {data:{session},error}=await auth.auth.getSession();if(error)throw error;return session?await request('session'):null;}
export async function login(email,password){const auth=await client();const {error}=await auth.auth.signInWithPassword({email,password});if(error)throw Error(error.message);try{return await request('session');}catch(e){await auth.auth.signOut({scope:'local'});throw e;}}
export async function forgot(email){const auth=await client();const {error}=await auth.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/?reset=1'});if(error)throw Error(error.message);}
export async function password(password,current){await request('password',{password,current});sessionStorage.removeItem('sl-password-recovery');history.replaceState(null,'',location.pathname);return await request('session');}
export async function logout(){await flush();reset();try{const auth=await client();await auth.auth.signOut({scope:'local'});}catch{}sessionStorage.removeItem('sl-password-recovery');}
export function reset(){real=false;baseline=null;queued=null;epoch++;dirty=false;}
export function attach(db){real=true;baseline=structuredClone(db);}
export function status(value,error){window.dispatchEvent(new CustomEvent('sl-cloud-status',{detail:{value,error}}));}
const equals=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const arrays=['teachers','students','batches','attendance','assignments','submissions','materials','exams','marks','quizzes','routine','notices','messages','payments','billing','queue','events','plans'];
function diff(before,after){const ops=[];for(const entity of arrays){const old=new Map((before[entity]||[]).map(r=>[r.id,r]));const next=new Map((after[entity]||[]).map(r=>[r.id,r]));for(const id of new Set([...old.keys(),...next.keys()]))if(!equals(old.get(id),next.get(id)))ops.push({entity,id,before:old.get(id)||null,after:next.get(id)||null});}return ops;}
export function persist(db){
 if(!real)return false;queued=structuredClone(db);dirty=true;status('saving');
 if(!draining)draining=drain(epoch).finally(()=>{draining=null;if(queued&&real)persist(queued);});return true;
}
async function drain(generation){
 try{while(queued&&generation===epoch){
  const target=queued;queued=null;
  const ops=diff(baseline,target);
  let canonical=target;if(ops.length)canonical=(await request('mutate',{ops})).db;
  if(!equals(baseline.settings,target.settings)||!equals(baseline.preferences,target.preferences))await request('preferences',{settings:target.settings,notifications:Object.values(target.preferences)[0]||{}});
  if(generation!==epoch)return;
  canonical.settings=target.settings;canonical.preferences=target.preferences;
  if(queued){const following=diff(target,queued),rebased=structuredClone(canonical);for(const op of following){const list=rebased[op.entity];const index=list.findIndex(r=>r.id===op.id);if(op.after){if(index<0)list.push(op.after);else list[index]=op.after;}else if(index>=0)list.splice(index,1);}rebased.settings=queued.settings;rebased.preferences=queued.preferences;queued=rebased;}
  baseline=structuredClone(canonical);if(!queued)window.dispatchEvent(new CustomEvent('sl-cloud-reload',{detail:{db:canonical}}));
 }if(generation===epoch){dirty=false;status('saved');}}
 catch(error){if(generation!==epoch)return;queued=null;dirty=false;status('error',error.message);try{const latest=await request('session');if(generation===epoch){baseline=structuredClone(latest.db);window.dispatchEvent(new CustomEvent('sl-cloud-reload',{detail:latest}));}}catch{window.dispatchEvent(new Event('sl-signed-out'));}}
}
export async function flush(){if(draining)await draining;if(draining)await draining;}
export const busy=()=>dirty;
export async function refresh(){await flush();const result=await request('session');if(result.db)baseline=structuredClone(result.db);return result;}
export async function upload(file,id){
 const auth=await client();const signed=await request('upload',{id,name:file.name,type:file.type,size:file.size});
 const {error}=await auth.storage.from('science-lab-private').uploadToSignedUrl(signed.path,signed.token,file,{contentType:file.type,upsert:false});if(error)throw error;
}
export async function file(id){const info=await request('file',{id});const response=await fetch(info.url);if(!response.ok)throw Error('Unable to download this file.');return new File([await response.blob()],info.name,{type:info.type});}
export async function allFiles(db){const ids=new Set(Object.values(db).filter(Array.isArray).flat().flatMap(r=>[...(r.files||[]),...(r.feedbackFiles||[])].map(f=>f.id)));return await Promise.all([...ids].map(async id=>({id,file:await file(id)})));}
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
