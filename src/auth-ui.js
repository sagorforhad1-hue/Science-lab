let liveProfile=null,authMode='login',authMessage='',authBusy=false,cloudState='idle';
const bilingual=(en,bn)=>db.settings.language==='bn'?bn:en;
const localLogin=renderLogin;
renderLogin=function(){
 const reset=authMode==='reset',forgot=authMode==='forgot';
 $('#app').innerHTML='<main class="login"><section class="login-story"><div class="brand"><img src="favicon.svg" alt=""><div><strong>Science Lab.</strong><small>Coaching workspace</small></div></div><div><div class="eyebrow">LEARN · EXPERIMENT · GROW</div><h1>'+bilingual('Your next discovery starts here.','তোমার নতুন আবিষ্কার শুরু হোক এখানেই।')+'</h1><p>'+bilingual('One workspace. Your teachers, classes and progress.','শিক্ষক, ক্লাস আর শেখার অগ্রগতি—সব এক জায়গায়।')+'</p><button type="button" class="lab-art" data-action="focus-login" aria-label="'+bilingual('Go to login form','লগইন ফর্মে যাও')+'"><i class="orbit"></i><i class="orbit two"></i><i class="orbit three"></i><img src="favicon.svg" alt=""></button><span class="lab-hint">'+bilingual('Tap the flask to sign in','লগইন করতে ফ্লাস্কে চাপ দাও')+'</span></div><p>'+bilingual('Private accounts · Connected learning','ব্যক্তিগত অ্যাকাউন্ট · একসাথে শেখা')+'</p></section><section class="login-form"><div class="login-box"><div class="eyebrow">SCIENCE LAB</div><h2>'+bilingual(reset?'Choose a new password':forgot?'Forgot your password?':'Welcome to your lab.',reset?'নতুন পাসওয়ার্ড দাও':forgot?'পাসওয়ার্ড ভুলে গেছ?':'তোমার ল্যাবে স্বাগতম।')+'</h2><p class="subtitle">'+bilingual(reset?'Use at least 12 characters.':forgot?'We will email a reset link. Open it in this same browser.':'Sign in with the email and password provided by your administrator or teacher.',reset?'কমপক্ষে ১২ অক্ষরের পাসওয়ার্ড ব্যবহার করো।':forgot?'ইমেইলে reset link যাবে। এই একই ব্রাউজারে লিংকটি খুলবে।':'অ্যাডমিন বা শিক্ষকের দেওয়া ইমেইল ও পাসওয়ার্ড দিয়ে প্রবেশ করো।')+'</p><form id="secure-auth-form">'+(!reset?field('email','Email','email','',[],true,true):'')+(!forgot?field('password',reset?'New password':'Password','password','',[],true,true):'')+(reset?field('confirm','Confirm password','password','',[],true,true):'')+'<div id="auth-error" class="error" role="alert">'+esc(authMessage)+'</div><button type="submit" class="btn primary" '+(authBusy?'disabled':'')+'>'+bilingual(reset?'Save password':forgot?'Send reset link':'Log in',reset?'পাসওয়ার্ড সংরক্ষণ':forgot?'Reset link পাঠাও':'লগইন')+icon('arrow')+'</button></form>'+(!reset?'<button class="btn ghost section-gap" data-action="auth-mode:'+(forgot?'login':'forgot')+'">'+bilingual(forgot?'Back to login':'Forgot password?',forgot?'লগইনে ফিরে যাও':'পাসওয়ার্ড ভুলে গেছ?')+'</button>':btn('Sign out','logout','section-gap'))+(!reset?'<div class="demo-divider">'+bilingual('Explore a separate demo — sample data only','আলাদা ডেমো দেখো—শুধু নমুনা তথ্য')+'</div><div class="demo-roles">'+btn('Teacher','demo:teacher')+btn('Student','demo:student')+btn('Super Admin','demo:admin')+'</div>':'')+'<button class="btn ghost section-gap" data-action="language">'+(db.settings.language==='en'?'বাংলায় দেখুন':'English')+'</button></div></section></main>';
 const f=$('#secure-auth-form');if(f.email)f.email.autocomplete='username';if(f.password){f.password.autocomplete=reset?'new-password':'current-password';if(reset)f.password.minLength=12;}
 f.onsubmit=async ev=>{ev.preventDefault();const button=f.querySelector('[type=submit]');button.disabled=true;$('#auth-error').textContent='';
 try{
  if(forgot){await cloud.forgot(f.email.value.trim());$('#auth-error').textContent=bilingual('If the address is registered, a reset link will arrive. Check your spam folder.','ঠিকানাটি নিবন্ধিত হলে reset link যাবে। Spam folder-ও দেখবে।');return;}
  if(reset){if(f.password.value!==f.confirm.value)throw Error(bilingual('Passwords do not match.','দুই পাসওয়ার্ড মিলছে না।'));await acceptCloud(await cloud.password(f.password.value));return;}
  await acceptCloud(await cloud.login(f.email.value.trim(),f.password.value));
 }catch(error){$('#auth-error').textContent=error.message;}finally{button.disabled=false;}};
};
async function acceptCloud(result){
 liveProfile=result.profile;
 if(result.profile.mustChangePassword||sessionStorage.getItem('sl-password-recovery')==='1'){session=null;authMode='reset';authMessage='';renderLogin();return;}
 db=result.db;cloud.attach(db);globalThis.scienceLabFileMode=true;globalThis.scienceLabCurrentDB=()=>db;
 authMode='login';authMessage='';session={role:liveProfile.role,id:liveProfile.id,teacherId:liveProfile.teacherId,accountId:liveProfile.id,demo:false,impersonating:!!liveProfile.viewing};
 page='dashboard';location.hash='dashboard';closeModal();render();
}
async function refreshCloud(){const result=await cloud.refresh();if(result.profile.mustChangePassword)return acceptCloud(result);db=result.db;liveProfile=result.profile;render();}
function showCredentials(result){modal('Temporary credentials','<p class="hint">'+bilingual('Share these details directly with the account owner. A new password is required at first login.','এই তথ্য সরাসরি অ্যাকাউন্টের মালিককে দাও। প্রথম লগইনে নতুন পাসওয়ার্ড দিতে হবে।')+'</p><div class="credential">Email: '+esc(result.email)+'<br>'+e('Password')+': '+esc(result.password)+'</div>',btn('Close','close'));}
const originalFeatureAction=featureAction;
featureAction=async function(action){
 const [a,b]=action.split(':');
 if(a==='auth-mode'){authMode=b;authMessage='';renderLogin();return;}
 if(a==='logout'||a==='switch'&&!session?.demo){await cloud.logout();globalThis.scienceLabFileMode=false;liveProfile=null;session=null;sessionStorage.removeItem('sl-session');db=load();authMode='login';authMessage='';$('#overlay').innerHTML='';render();return;}
 if(a==='demo'){if(cloud.isReal())await cloud.logout();globalThis.scienceLabFileMode=false;liveProfile=null;if(!session?.demo)db=load();return originalFeatureAction(action);}
 if(session&&!session.demo){
  if(a==='impersonate'||a==='return-admin'){toast(bilingual('Use a separate teacher login to access a classroom.','ক্লাসরুমে প্রবেশ করতে আলাদা teacher login ব্যবহার করো।'),true);return;}
  if(a==='student-import'){realStudentImport();return;}
  if(a==='refresh-cloud'){try{await refreshCloud();toast(bilingual('Up to date.','তথ্য আপডেট হয়েছে।'));}catch(err){toast(err.message,true);}return;}
 }
 return originalFeatureAction(action);
};
const originalBindFeatures=bindFeatures;
bindFeatures=function(){originalBindFeatures();
 if(!session?.demo&&$('#password-form'))$('#password-form').onsubmit=async ev=>{ev.preventDefault();const f=ev.currentTarget,button=f.querySelector('[type=submit]');button.disabled=true;try{if(f.password.value.length<12)throw Error('Use at least 12 characters.');await cloud.password(f.password.value,f.current.value);f.reset();toast(bilingual('Password updated.','পাসওয়ার্ড বদলানো হয়েছে।'));}catch(err){$('#password-error').textContent=err.message;}finally{button.disabled=false;}};
 if(!session?.demo&&$('#backup-import')){$('#backup-import').parentElement.hidden=true;}
};
const originalSettings=settingsPage;
settingsPage=function(){let html=originalSettings();if(session&&!session.demo){html=html.replace('This is a local demo. Production account security and data isolation require the future backend.','Your login is secured by Supabase. Only your administrator can manage account access.').replace('এটি স্থানীয় ডেমো। আসল অ্যাকাউন্ট নিরাপত্তা ও ডেটা বিচ্ছিন্নতা ব্যাকএন্ড যুক্ত করার পর চালু হবে।','Supabase দিয়ে লগইন সুরক্ষিত। শুধু তোমার অ্যাডমিন অ্যাকাউন্টের অনুমতি নিয়ন্ত্রণ করতে পারেন।');}return html;};
const originalRender=render;
render=function(){originalRender();if(!session)return;
 const label=$('.local-label');if(label)label.innerHTML='<i class="dot"></i>'+bilingual(session.demo?'Demo · sample data':'Cloud workspace',session.demo?'ডেমো · নমুনা তথ্য':'ক্লাউড ওয়ার্কস্পেস');
 const footer=$('.page-footer span:last-child');if(footer)footer.textContent=bilingual(session.demo?'Demo data stays in this browser':'Your data is stored securely online',session.demo?'ডেমোর তথ্য এই ব্রাউজারে থাকে':'তথ্য অনলাইনে সুরক্ষিতভাবে সংরক্ষিত');
 if(!session.demo){const switcher=$('[data-action=switch]');if(switcher)switcher.innerHTML=icon('logout')+e('Sign out');$('.top-actions')?.insertAdjacentHTML('afterbegin','<button class="btn ghost small" data-action="refresh-cloud" id="cloud-status">'+bilingual('Refresh','আপডেট')+'</button>');}
 if(session.demo)$('.content')?.insertAdjacentHTML('afterbegin','<div class="demo-banner">'+bilingual('DEMO — sample accounts and data. Changes here do not affect real accounts.','ডেমো — নমুনা অ্যাকাউন্ট ও তথ্য। এখানে বদলালে real account বদলাবে না।')+'</div>');
};
const originalToast=toast;
toast=function(message,error=false){if(session&&!session.demo&&!error&&[t('Saved successfully'),t('Settings saved')].includes(message))message=bilingual('Saving to cloud…','ক্লাউডে সংরক্ষণ হচ্ছে…');originalToast(message,error);};
async function realStudentImport(){
 modal('Import students','<p class="hint">'+bilingual('CSV needs email, name, studentId, grade, guardian, guardianPhone and batchIds (separate batch IDs with |). Real login accounts will be created.','CSV-তে email, name, studentId, grade, guardian, guardianPhone ও batchIds লাগবে। একাধিক batch ID | দিয়ে আলাদা করো।')+'</p><input id="real-import" type="file" accept=".csv"><div id="real-import-error" class="error"></div><div id="real-import-preview"></div>',btn('Close','close'),true);
 $('#real-import').onchange=async ev=>{try{
  const file=ev.target.files[0];if(!file)return;if(file.size>200000)throw Error('CSV limit: 200 KB');
  const [headers,...rows]=parseCSV((await file.text()).replace(/^\uFEFF/,''));const keys=headers.map(x=>x.trim());
  for(const key of ['email','name','studentId','grade','guardian','guardianPhone','batchIds'])if(!keys.includes(key))throw Error('Missing column: '+key);
  if(!rows.length||rows.length>50)throw Error('Import 1–50 students at a time.');
  const records=rows.map(values=>{const r=Object.fromEntries(keys.map((k,i)=>[k,values[i]||'']));return {...r,batchIds:r.batchIds.split('|').map(x=>x.trim()),status:'Active',roll:Number(r.roll)||1};});
  $('#real-import-preview').innerHTML='<p>'+records.length+' '+e('Students')+'</p><div class="detail-text">'+records.map(r=>esc(r.name)+' · '+esc(r.email)).join('<br>')+'</div><button class="btn primary section-gap" id="real-import-confirm">'+e('Import students')+'</button>';
  $('#real-import-confirm').onclick=async ev=>{ev.currentTarget.disabled=true;const results=[];let failure='';
   for(const record of records){try{results.push(await cloud.request('account',{role:'student',record}));}catch(err){failure=err.message;break;}}
   await refreshCloud();modal('Temporary credentials','<p class="hint">'+results.length+' '+bilingual('accounts created.','টি অ্যাকাউন্ট তৈরি হয়েছে।')+(failure?' '+esc(failure):'')+'</p><div class="detail-text">'+results.map(r=>esc(r.email)+' : '+esc(r.password)).join('<br>')+'</div>',btn('Close','close'),true);
  };
 }catch(err){$('#real-import-error').textContent=err.message;}};
}
function mergeCloudDB(next){for(const [key,value] of Object.entries(next)){if(Array.isArray(value)){const existing=new Map((db[key]||[]).map(r=>[r.id,r]));db[key]=value.map(r=>{const old=existing.get(r.id);if(old){for(const k of Object.keys(old))if(!(k in r))delete old[k];Object.assign(old,r);return old;}return r;});}else db[key]=value;}}
async function boot(){
 globalThis.scienceLabPersist=state=>cloud.persist(state);
 globalThis.scienceLabUpload=(file,id)=>cloud.upload(file,id);
 globalThis.scienceLabDownload=id=>cloud.file(id);
 globalThis.scienceLabAllFiles=()=>cloud.allFiles(db);
 window.addEventListener('sl-cloud-status',ev=>{cloudState=ev.detail.value;const el=$('#cloud-status');if(el)el.textContent=cloudState==='saving'?bilingual('Saving…','সংরক্ষণ হচ্ছে…'):cloudState==='error'?bilingual('Retry / refresh','আবার আপডেট'):bilingual('Synced · refresh','সংরক্ষিত · আপডেট');if(ev.detail.error)toast(ev.detail.error,true);});
 window.addEventListener('sl-cloud-reload',ev=>{if(session&&!session.demo){mergeCloudDB(ev.detail.db);if(!$('dialog')&&!document.activeElement?.matches('input,textarea,select'))render();}});
 window.addEventListener('sl-signed-out',()=>{session=null;globalThis.scienceLabFileMode=false;liveProfile=null;db=load();authMode='login';authMessage=bilingual('Please log in again.','আবার লগইন করো।');$('#overlay').innerHTML='';render();});
 window.addEventListener('sl-password-recovery',()=>{session=null;authMode='reset';renderLogin();});
 render();
 try{const restored=await cloud.restore();if(restored){if(new URLSearchParams(location.search).get('reset')==='1')sessionStorage.setItem('sl-password-recovery','1');if(!session?.demo)await acceptCloud(restored);}}
 catch(error){authMessage=error.message;if(!session)renderLogin();}
 // Explicit refresh is available while editing; automatic refresh never interrupts a form.
 setInterval(async()=>{if(!session||session.demo||cloud.busy()||$('dialog')||document.activeElement?.matches('input,textarea,select'))return;try{const result=await cloud.refresh();if(result.profile.mustChangePassword)return acceptCloud(result);db=result.db;render();}catch(error){toast(error.message,true);}},60000);
}

const demoStartQuiz=startQuiz;
startQuiz=async function(id){
 if(session?.demo)return demoStartQuiz(id);
 if(!isStudent())return;
 try{
  await cloud.flush();
  const started=await cloud.request('quiz-start',{quizId:id}),quiz=db.quizzes.find(q=>q.id===id);
  const key='sl-real-quiz-'+session.id+'-'+id;let draft=JSON.parse(localStorage.getItem(key)||'null')||{answers:{}};
  draft.end=started.result.end;const order=quiz.questions.map(q=>q.id);
  if(quiz.random&&!draft.order){for(let i=order.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}}draft.order||=order;
  modal(quiz.title,'<div class="quiz-timer">'+e('Time remaining')+' <strong id="quiz-timer"></strong></div>'+draft.order.map((qid,i)=>{const q=quiz.questions.find(q=>q.id===qid);return '<section class="quiz-question"><h3>'+(i+1)+'. '+esc(q.text)+'</h3>'+q.options.map((o,j)=>'<button class="quiz-option '+(draft.answers[q.id]===j?'selected':'')+'" data-q="'+q.id+'" data-answer="'+j+'"><span>'+String.fromCharCode(65+j)+'</span>'+esc(o)+'</button>').join('')+'</section>';}).join('')+'<div id="quiz-network-error" class="error"></div>','<button class="btn primary" id="finish-quiz">'+e('Submit quiz')+'</button>',true);
  $('dialog').dataset.quiz='true';$('dialog .modal-header [data-action=close]').hidden=true;
  const store=()=>localStorage.setItem(key,JSON.stringify(draft));store();
  $$('.quiz-option').forEach(b=>b.onclick=()=>{if(Date.now()>draft.end)return;draft.answers[b.dataset.q]=Number(b.dataset.answer);store();$$('[data-q="'+b.dataset.q+'"]').forEach(x=>x.classList.toggle('selected',x===b));});
  let sending=false;
  const finish=async()=>{if(sending)return;sending=true;$('#finish-quiz').disabled=true;clearInterval(quizInterval);
   try{const result=await cloud.request('quiz-submit',{quizId:id,answers:draft.answers});db=result.db;cloud.attach(db);localStorage.removeItem(key);delete $('dialog').dataset.quiz;closeModal();render();quizReview(id);}
   catch(error){$('#quiz-network-error').textContent=error.message;$('#finish-quiz').disabled=false;sending=false;}
  };
  $('#finish-quiz').onclick=finish;const tick=()=>{const remaining=Math.max(0,Math.ceil((draft.end-Date.now())/1000));$('#quiz-timer').textContent=Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0');if(!remaining)finish();};tick();if(!sending)quizInterval=setInterval(tick,1000);
 }catch(error){toast(error.message,true);}
};

const baseRecordActions=recordActions;
recordActions=function(entity,r){let html=baseRecordActions(entity,r);if(session&&!session.demo&&['students','teachers'].includes(entity))html=html.replace(/<button\b[^>]*data-action="delete:[^"]*"[\s\S]*?<\/button>/g,'');return html;};
const baseTeachersPage=teachersPage;
teachersPage=function(){let html=baseTeachersPage();if(session&&!session.demo)html=html.replace(/<button\b[^>]*data-action="impersonate:[^"]*"[\s\S]*?<\/button>/g,'');return html;};
