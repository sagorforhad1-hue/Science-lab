
/* Workspace improvements: server-backed usage, identity, read-only owner preview. */
let usageAccounts=[],usageLoaded=false,usageOwner=null;
function profileImage(record,key='photoData',cls='profile-photo'){
 const value=record?.[key];
 return typeof value==='string'&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value)?'<img class="'+cls+'" src="'+esc(value)+'" alt="'+esc(record.name||'')+'">':key==='photoData'?avatar(record?.name||''):'';
}
function identityPanel(){
 if(isAdmin())return '';
 const r=teacher()||{};
 return '<section class="identity-panel">'+profileImage(r,'coverData','identity-cover')+'<div class="identity-body">'+profileImage(r,'logoData','coaching-logo')+'<div><div class="eyebrow">'+bilingual('COACHING WORKSPACE','কোচিং সেন্টার')+'</div><h1>'+esc(r.coaching||bilingual('Coaching name not set','কোচিংয়ের নাম দেওয়া হয়নি'))+'</h1><div class="person">'+profileImage(r)+'<div><strong>'+esc(r.name||'')+'</strong><p>'+esc(r.subject||'')+'</p></div></div>'+(r.bio?'<p class="profile-bio">'+esc(r.bio)+'</p>':'')+'</div></div></section>';
}
function usageShell(){return '<section class="panel section-gap"><div class="panel-body"><h2>'+bilingual('AI usage & limits','AI ব্যবহার ও সীমা')+'</h2><div id="usage-content" class="usage-skeleton" aria-live="polite">'+bilingual('Loading server usage…','সার্ভার থেকে হিসাব আসছে…')+'</div></div></section>';}
function usageCard(r){
 const percent=r.dailyLimit?Math.min(100,100*r.dailyUsed/r.dailyLimit):100;
 return '<article class="usage-card"><div class="switch-row"><h3>'+esc(r.name)+'</h3>'+(isAdmin()&&r.id!==session.id?btn(bilingual('Edit limits','সীমা বদলাও'),'usage-limit:'+r.id,'small'):'')+'</div><p>'+bilingual('Today: ','আজ: ')+num(r.dailyUsed)+' / '+num(r.dailyLimit)+' · '+bilingual('Remaining: ','বাকি: ')+num(r.dailyRemaining)+'</p><progress max="100" value="'+percent+'" aria-label="Daily AI requests"></progress><p>'+bilingual('This month: ','এই মাস: ')+num(r.monthlyUsed)+' / '+(r.monthlyLimit===null?bilingual('No monthly cap set','মাসিক সীমা নির্ধারিত নেই'):num(r.monthlyLimit))+(r.monthlyRemaining!==null?' · '+bilingual('Remaining: ','বাকি: ')+num(r.monthlyRemaining):'')+'</p><p>'+bilingual('Provider-reported tokens: ','Provider-এর জানানো token: ')+num(r.tokens)+(r.unknownTokens?' · '+num(r.unknownTokens)+' '+bilingual('requests with unknown token usage','অনুরোধের token অজানা'):'')+'</p><small>'+bilingual('Daily reset: ','দৈনিক reset: ')+esc(new Date(r.dailyResetAt).toLocaleString())+'<br>'+bilingual('Monthly reset: ','মাসিক reset: ')+esc(new Date(r.resetAt).toLocaleString())+'</small>'+(r.alert?'<p class="hint warning" role="status">'+num(r.alert)+'% '+bilingual('of a request limit reached','অনুরোধ সীমায় পৌঁছেছে')+'</p>':'')+'<details><summary>'+bilingual('Usage by feature','ফিচার অনুযায়ী ব্যবহার')+'</summary>'+Object.entries(r.features).map(([k,f])=>'<p>'+esc(aiLabels[k]?toolLabel(k):k)+' · '+num(f.requests)+' requests · '+num(f.tokens)+' tokens'+(f.unknownTokens?' + '+num(f.unknownTokens)+' unknown':'')+'</p>').join('')+'</details><p class="hint">'+(r.trackingSince?bilingual('Monthly tracking started: ','মাসিক হিসাব শুরু: ')+esc(new Date(r.trackingSince).toLocaleString()):bilingual('No tracked requests yet. Earlier monthly/token usage is unavailable.','এখনো নতুন হিসাব নেই। আগের মাসিক/token ব্যবহার জানা নেই।'))+'</p></article>';
}
async function loadUsage(){
 const el=$('#usage-content');if(!el)return;
 if(session.demo){el.className='';el.textContent=bilingual('Demo: real API usage and limits are unavailable.','ডেমোতে বাস্তব API ব্যবহার ও সীমার হিসাব নেই।');return;}
 const identity=session.id;
 try{const r=await cloud.request('ai-usage',{});if(session?.id!==identity||!el.isConnected)return;usageAccounts=r.accounts;usageLoaded=true;usageOwner=identity;el.className='usage-grid';el.innerHTML=r.accounts.map(usageCard).join('')+'<p class="hint">'+bilingual('Limits count requests, including failed attempts. Tokens are reported separately; these are app limits, not your provider balance. Daily limits remain capped by the platform setting.','ব্যর্থ চেষ্টা সহ প্রতিটি request সীমায় গণনা হয়। Token আলাদা হিসাব; এটি অ্যাপের সীমা, provider-এর balance নয়। দৈনিক সীমায় platform limit-ও প্রযোজ্য।')+'</p>';const bell=$('[data-action="notifications"]');if(bell&&r.accounts.some(a=>a.alert))bell.setAttribute('aria-label',bilingual('Notifications: AI limit warning','নোটিফিকেশন: AI সীমার সতর্কতা'));}
 catch(error){if(el.isConnected){el.className='';el.textContent=error.message;}}
}
const upgradesDashboard=dashboard;
dashboard=function(){
 let html=upgradesDashboard();
 if(isAdmin())return html+'<section class="card section-gap"><h2>'+bilingual('Account overview','অ্যাকাউন্টের সারসংক্ষেপ')+'</h2><p>'+bilingual('Teachers: ','শিক্ষক: ')+num(db.teachers.length)+' · '+bilingual('Active: ','সক্রিয়: ')+num(db.teachers.filter(t=>t.status==='Active').length)+' · '+bilingual('Inactive: ','নিষ্ক্রিয়: ')+num(db.teachers.filter(t=>t.status!=='Active').length)+'</p><p>'+bilingual('Students: ','শিক্ষার্থী: ')+num(db.students.length)+' · '+bilingual('Active: ','সক্রিয়: ')+num(db.students.filter(s=>s.status==='Active').length)+' · '+bilingual('Inactive: ','নিষ্ক্রিয়: ')+num(db.students.filter(s=>s.status!=='Active').length)+'</p></section>'+usageShell();
 const records=visible('attendance').filter(a=>a.date===today());
 const quick=!isStudent()?'<div class="quick-actions">'+(allowed('students')?btn('Add student','create:students','primary','plus'):'')+(allowed('notices')?btn(bilingual('Send announcement','নোটিশ তৈরি'),'create:notices'):'')+(allowed('ai')?btn(bilingual('Generate quiz','কুইজ তৈরি'),'connected-ai:quiz'):'')+'</div>':'';
 const snapshot=!isStudent()?'<section class="card section-gap"><h3>'+bilingual('Today’s attendance','আজকের উপস্থিতি')+'</h3><p>'+['Present','Absent','Late'].map(s=>e(s)+': '+num(records.filter(a=>a.status===s).length)).join(' · ')+'</p><small>'+bilingual('Recorded attendance entries only','শুধু সংরক্ষিত উপস্থিতির হিসাব')+'</small></section>':'';
 return identityPanel()+quick+html+snapshot+(!isStudent()||allowed('ai')?usageShell():'')+(!isStudent()&&teacher()?.leaderboard?leaderboardPanel():'');
};
function leaderboardPanel(){
 const ranked=students().map(s=>{const scores=db.marks.filter(m=>m.studentId===s.id).map(m=>{const ex=db.exams.find(x=>x.id===m.examId&&x.status==='Published'&&x.total>0);return ex?m.marks/ex.total*100:null;}).filter(n=>n!==null);return {s,score:scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:null};}).filter(r=>r.score!==null).sort((a,b)=>b.score-a.score).slice(0,5);
 return '<section class="panel section-gap"><div class="panel-body"><h2>'+bilingual('Performance leaderboard','ফলাফলের তালিকা')+'</h2><p>'+bilingual('Average percentage across published exams. Teacher view only.','প্রকাশিত পরীক্ষার গড় শতাংশ। শুধু শিক্ষকের জন্য।')+'</p>'+ranked.map((r,i)=>'<div class="switch-row"><span>'+num(i+1)+'. '+esc(r.s.name)+'</span><b>'+num(Math.round(r.score*10)/10)+'%</b></div>').join('')+(ranked.length?'':empty())+'</div></section>';
}
const upgradesStudents=studentsPage;
studentsPage=function(){
 return upgradesStudents()+'<div class="batch-tabs">'+btn('All batches','batch-tab:all','small')+batches().map(b=>btn(b.name,'batch-tab:'+b.id,'small')).join('')+'</div><div class="cards student-profile-cards">'+filtered(own('students')).map(s=>'<article class="card">'+profileImage(s)+'<h3>'+esc(s.name)+'</h3><p>'+e('Grade')+' '+esc(s.grade||'')+' · '+esc((s.batchIds||[]).map(batchName).join(', '))+'</p><div class="person">'+profileImage({name:s.guardian,photoData:s.guardianPhotoData})+'<div>'+esc(s.guardian||'')+'<p>'+esc(s.guardianPhone||'')+'</p></div></div>'+btn('Edit','edit:students:'+s.id,'small')+btn(bilingual('Profile photos','প্রোফাইলের ছবি'),'identity:'+s.id,'small')+'</article>').join('')+'</div>'+btn(bilingual('Export guardian contacts (CSV)','অভিভাবকের তালিকা (CSV)'),'guardian-export')+btn(bilingual('Print student list / PDF','তালিকা প্রিন্ট / PDF'),'student-print');
};
const upgradesSettings=settingsPage;
settingsPage=function(){return upgradesSettings()+(!isAdmin()?'<section class="panel section-gap"><div class="panel-body"><h2>'+bilingual('Profile & coaching identity','প্রোফাইল ও কোচিং পরিচিতি')+'</h2>'+profileImage(me())+btn(bilingual('Edit profile & photos','পরিচিতি ও ছবি বদলাও'),'identity:'+session.id)+'</div></section>':'');};
const upgradesTeachers=teachersPage;
teachersPage=function(){return baseTeachersPage()+usageShell();};
const upgradesAllowed=allowed;
allowed=function(p){return session?.impersonating&&p==='connections'?false:upgradesAllowed(p);};
const upgradesBind=bindFeatures;
bindFeatures=function(){upgradesBind();if($('#usage-content'))loadUsage();if(!session)return;
 if(allowed('ai')&&!session.impersonating&&!$('#chatbot-launch')){const b=document.createElement('button');b.id='chatbot-launch';b.className='chatbot-launch';b.dataset.action='connected-ai:agent-askMe';b.setAttribute('aria-label',bilingual('Open Ask Me','Ask Me খোলো'));b.innerHTML=icon('ai')+' '+bilingual('Ask Me','আমাকে জিজ্ঞেস করো');$('.main').append(b);}
 if(session.impersonating){const banner=$('.impersonation');if(banner)banner.innerHTML=bilingual('Viewing as ','দেখছ: ')+esc(me()?.name)+' · '+bilingual('Read-only','শুধু দেখা যাবে')+btn(bilingual('Exit view','ফিরে যাও'),'return-admin','small');}
};
async function readProfileImage(input){
 const file=input?.files?.[0];if(!file)return null;
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1048576)throw Error(bilingual('Choose a JPG, PNG or WebP under 8 MB.','৮ MB-এর কম JPG, PNG বা WebP দাও।'));
 const bmp=await createImageBitmap(file),canvas=document.createElement('canvas');const scale=Math.min(1,960/bmp.width,600/bmp.height);canvas.width=Math.max(1,Math.round(bmp.width*scale));canvas.height=Math.max(1,Math.round(bmp.height*scale));canvas.getContext('2d').drawImage(bmp,0,0,canvas.width,canvas.height);bmp.close();let data=canvas.toDataURL('image/jpeg',.7);if(data.length>180000){canvas.width=Math.max(1,Math.round(canvas.width/2));canvas.height=Math.max(1,Math.round(canvas.height/2));const image=await createImageBitmap(file);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);image.close();data=canvas.toDataURL('image/jpeg',.55);}if(data.length>180000)throw Error('Choose a smaller image.');return data;
}
function editIdentity(id){
 const entity=isStudent()?'students':id===session.id?'teachers':'students',r=db[entity].find(x=>x.id===id);
 if(!r||session.impersonating||isStudent()&&id!==session.id)return;
 const isTeacher=entity==='teachers',keys=isTeacher?['photoData','logoData','coverData']:id===session.id?['photoData']:['photoData','guardianPhotoData'];
 modal(bilingual('Profile & identity','প্রোফাইল ও পরিচিতি'),'<form id="identity-form"><div class="form-grid">'+(isTeacher?field('coaching','Coaching name','text',r.coaching||'')+field('subject',bilingual('Subject','বিষয়'),'text',r.subject||''):'')+field('bio',bilingual('Bio','পরিচিতি'),'textarea',r.bio||'',[],false,true)+(isStudent()?field('interests',bilingual('Interests','আগ্রহ'),'text',r.interests||''):'')+keys.map(k=>'<label class="field"><span>'+({photoData:bilingual('Profile photo','প্রোফাইল ছবি'),logoData:bilingual('Coaching logo','কোচিং লোগো'),coverData:bilingual('Cover photo','কভার ছবি'),guardianPhotoData:bilingual('Guardian photo (optional)','অভিভাবকের ছবি (ঐচ্ছিক)')}[k])+'</span><input type="file" name="'+k+'" accept="image/jpeg,image/png,image/webp"></label>'+check('remove_'+k,bilingual('Remove saved image','সংরক্ষিত ছবি সরাও'))).join('')+(isTeacher?check('leaderboard',bilingual('Show my performance leaderboard','ফলাফলের তালিকা দেখাও'),r.leaderboard):'')+'</div><div class="error" id="identity-error"></div><button class="btn primary" type="submit">'+e('Save')+'</button></form>',btn('Close','close'));
 $('#identity-form').onsubmit=async ev=>{ev.preventDefault();const f=ev.currentTarget,button=f.querySelector('[type=submit]');button.disabled=true;try{const after=structuredClone(r);for(const k of ['coaching','subject','bio','interests'])if(f.elements[k])after[k]=f.elements[k].value.slice(0,2000);if(isTeacher)after.leaderboard=f.elements.leaderboard.checked;for(const k of keys){if(f.elements['remove_'+k].checked)after[k]='';const img=await readProfileImage(f.elements[k]);if(img)after[k]=img;}if(session.demo){Object.assign(r,after);persist(db);}else{await cloud.flush();await cloud.request('mutate',{ops:[{entity,id,before:r,after}]});}closeModal();if(session.demo)render();else await refreshCloud();}catch(err){$('#identity-error').textContent=err.message;}finally{button.disabled=false;}};
}
function limitForm(id){
 const r=usageAccounts.find(r=>r.id===id);if(!r||!isAdmin())return;
 modal(bilingual('Teacher AI limits','শিক্ষকের AI সীমা'),'<form id="usage-limit-form">'+field('daily',bilingual('Daily request cap (0–500)','দৈনিক request সীমা (০–৫০০)'),'number',db.teachers.find(t=>t.id===id)?.aiDailyLimit??r.dailyLimit)+field('monthly',bilingual('Monthly request cap (blank = no monthly cap)','মাসিক request সীমা (ফাঁকা = মাসিক সীমা নেই)'),'number',r.monthlyLimit??'')+'<p class="hint">'+bilingual('Changing limits does not erase usage. Platform daily cap still applies.','সীমা বদলালে ব্যবহার মুছে যায় না। Platform-এর দৈনিক সীমাও প্রযোজ্য।')+'</p><div id="limit-error" class="error"></div><button type="submit" class="btn primary">'+e('Save')+'</button></form>',btn('Close','close'));
 $('#usage-limit-form').onsubmit=async ev=>{ev.preventDefault();const f=ev.currentTarget,b=f.querySelector('button');b.disabled=true;try{await cloud.request('ai-limits',{id,daily:Number(f.daily.value),monthly:f.monthly.value===''?null:Number(f.monthly.value)});closeModal();await refreshCloud();}catch(err){$('#limit-error').textContent=err.message;}finally{b.disabled=false;}};
}
const upgradesAction=featureAction;
featureAction=async function(action){
 const [a,b]=action.split(':');
 if(a==='impersonate'&&!session.demo){try{await acceptCloud(await cloud.viewTeacher(b));}catch(err){await cloud.viewTeacher(null);toast(err.message,true);}return;}
 if(a==='return-admin'&&session?.impersonating){
  try{if(session.demo){closeModal();setSession({role:'admin',id:'admin',teacherId:null,demo:true});}else await acceptCloud(await cloud.viewTeacher(null));}
  catch(err){toast(bilingual('Could not exit preview. Try Exit view again. ','Preview থেকে বের হওয়া যায়নি। আবার ফিরে যাও চাপো। ')+err.message,true);}
  return;
 }
 if(a==='service-refresh'&&isAdmin()&&!session.demo){try{toast(bilingual('Checking providers…','Provider যাচাই চলছে…'));const r=await cloud.request('provider-check',{});await loadConnections();modal(bilingual('Live provider checks','লাইভ provider পরীক্ষা'),Object.entries(r).map(([key,value])=>'<div class="switch-row"><b>'+esc(key)+'</b><span>'+esc(value)+'</span></div>').join(''),btn('Close','close'));}catch(err){toast(err.message,true);}return;}
 if(a==='identity'){editIdentity(b);return;}
 if(a==='usage-limit'){limitForm(b);return;}
 if(a==='batch-tab'){batchFilter=b;render();return;}
 if(a==='guardian-export'){const rows=filtered(own('students'));download('guardian-contacts.csv',csv([['Student','Class','Guardian','Phone'],...rows.map(s=>[s.name,s.grade,s.guardian,s.guardianPhone])]),'text/csv;charset=utf-8');return;}
 if(a==='student-print'){window.print();return;}
 return upgradesAction(action);
};
document.addEventListener('submit',ev=>{if(session?.impersonating){ev.preventDefault();ev.stopImmediatePropagation();toast(bilingual('Read-only preview. Exit to edit.','শুধু দেখার মোড। সম্পাদনা করতে বের হও।'),true);}},true);
document.addEventListener('click',ev=>{
 if(!session?.impersonating)return;const el=ev.target.closest('[data-action]');if(!el)return;
 const a=el.dataset.action.split(':')[0];
 if(!['edit-viewed-teacher','back','return-admin','close','go','search','notifications','menu','profile','detail','assignment','exam','file','att-history','combined-report','batch-tab','pulse-result','attendance-detail','activity-detail','schedule-detail'].includes(a)){ev.preventDefault();ev.stopImmediatePropagation();toast(bilingual('Read-only preview. Exit to edit.','শুধু দেখার মোড। সম্পাদনা করতে বের হও।'),true);}
},true);
const upgradesNotifications=notificationsModal;
notificationsModal=function(){upgradesNotifications();const el=$('.modal-body');if(el&&usageLoaded&&usageOwner===session?.id){el.insertAdjacentHTML('afterbegin',usageAccounts.filter(r=>r.alert).map(r=>'<p class="hint warning">'+esc(r.name)+' · '+num(r.alert)+'% '+bilingual('AI request limit reached','AI request সীমায় পৌঁছেছে')+'</p>').join(''));}};
