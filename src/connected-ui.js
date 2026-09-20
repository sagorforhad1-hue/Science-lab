// Connected tools use authenticated server actions. Demo accounts remain isolated.
const serviceLabels={ai:['AI Studio','এআই স্টুডিও'],email:['Email','ইমেইল'],push:['Push notifications','পুশ নোটিফিকেশন'],whatsapp:['WhatsApp','হোয়াটসঅ্যাপ'],online:['Online classes','অনলাইন ক্লাস']};
const aiLabels={quiz:['Quiz assistant','কুইজ সহকারী'],grading:['Grading assistant','মূল্যায়ন সহকারী'],insights:['Learning insights','শেখার বিশ্লেষণ'],guardian:['Guardian summary','অভিভাবকের সারাংশ'],tutor:['Study tutor','পড়াশোনার সহকারী'],operations:['Admin operations','অ্যাডমিনের কাজের সহকারী'],billing:['Billing analyst','বিলিং বিশ্লেষক'],announcement:['Announcement writer','নোটিশ লেখক'],support:['Support assistant','সাপোর্ট সহকারী']};
const toolLabel=k=>bilingual(...aiLabels[k]);
const agentProfiles=Object.freeze({
 appDoctor:{name:['App Doctor','অ্যাপ ডাক্তার'],role:['System health and real incident analysis','সিস্টেম health ও বাস্তব সমস্যা বিশ্লেষণ'],image:'/agents/app-doctor.png',access:['admin'],asset:'3D asset slot'},
 communication:{name:['Communication agent','যোগাযোগ সহকারী'],role:['Notice drafts and delivery review','নোটিশ draft ও delivery review'],image:'/agents/communication.png',access:['admin','teacher'],asset:'3D asset slot'},
 tutor:{name:['Study assistant','পড়াশোনার সহকারী'],role:['Explain topics and guide practice','বিষয় বোঝানো ও practice guidance'],image:'/agents/student.png',access:['teacher','student'],asset:'3D asset slot'},
 help:{name:['App guide','অ্যাপ গাইড'],role:['Explain only the features this account can use','এই account-এর ব্যবহারযোগ্য feature বোঝায়'],image:'/agents/help.png',access:['admin','teacher','student'],asset:'3D asset slot'}
});
const visibleAgentProfiles=()=>Object.entries(agentProfiles).filter(([,p])=>p.access.includes(isAdmin()?'admin':isStudent()?'student':'teacher'));
let connectedStatus=null;
const priorAllowed=allowed;
allowed=function(p){
 if(p==='connections')return !!session&&isAdmin();
 if(p==='online')return !!session&&!isAdmin()&&(session.demo||teacher()?.features?.online===true);
 if(p==='ai')return !!session&&(isAdmin()||isStudent()?isAdmin()||teacher()?.features?.ai&&teacher()?.features?.studentAI&&me()?.aiEnabled!==false:teacher()?.features?.ai);
 if(!isAdmin()&&teacher()?.features?.[p]===false)return false;
 return priorAllowed(p);
};
labels.connections='API connections';labels.online='Online classes';paths.connections=paths.settings;paths.online=paths.routine;
const connectedRenderPage=renderFeaturePage;
renderFeaturePage=function(){if(page==='connections')return connectionsPage();if(page==='online')return onlinePage();return connectedRenderPage();};
aiPage=function(){
 const tools=isAdmin()?Object.keys(aiLabels):isStudent()?['tutor']:['quiz','grading','insights','guardian','tutor'];
 return heading('AI Studio',bilingual('Choose an assistant. Review its draft before use.','সহকারী বেছে নাও। ব্যবহারের আগে ফলাফল যাচাই করো।'),(isAdmin()?btn('API connections','go:connections','','settings'):''))+
 '<div class="hint">'+(session.demo?bilingual('Demo uses sample previews. Log in to a real account to use the connected AI.','ডেমোতে নমুনা preview দেখাবে। আসল AI ব্যবহার করতে নিজের অ্যাকাউন্টে লগইন করো।'):bilingual('AI creates drafts; it never changes marks, permissions or sends messages automatically. Only aggregate records are included automatically.','AI খসড়া তৈরি করে; নিজে নম্বর, অনুমতি বদলায় না বা মেসেজ পাঠায় না। স্বয়ংক্রিয়ভাবে শুধু সারসংক্ষেপ তথ্য যুক্ত হয়।'))+'</div><div class="cards">'+tools.filter(k=>isAdmin()||teacher()?.features?.['ai_'+k]!==false).map(k=>'<article class="card"><span class="subject-symbol">'+icon('ai')+'</span><h3>'+esc(toolLabel(k))+'</h3><p>'+esc(bilingual('Add your instructions and generate a draft.','তোমার নির্দেশনা দিয়ে খসড়া তৈরি করো।'))+'</p>'+btn(bilingual('Open assistant','সহকারী খোলো'),'connected-ai:'+k,'primary small')+'</article>').join('')+'</div>'+
 '<section class="agent-directory"><div class="section-heading"><div><h2>'+bilingual('Character agents','ক্যারেক্টার agent')+'</h2><p class="subtitle">'+bilingual('Each character has a role and permission boundary. 3D assets will load in this slot when supplied.','প্রতিটি character-এর role ও permission আলাদা। 3D asset দিলে এই slot-এ যুক্ত হবে।')+'</p></div></div><div class="cards">'+visibleAgentProfiles().map(([k,p])=>'<article class="card agent-card"><div class="agent-thumb"><img src="'+p.image+'" alt="'+esc(bilingual(...p.name))+' reference character"><span>'+esc(p.asset)+'</span></div><h3>'+esc(bilingual(...p.name))+'</h3><p>'+esc(bilingual(...p.role))+'</p>'+btn(bilingual('Open agent','agent খোলো'),'connected-ai:agent-'+k,'primary small')+'</article>').join('')+'</div></section>';
};
async function openAssistant(tool){
 if(tool==='agent-askMe'){openAskMe();return;}
 const agentKey=tool.startsWith('agent-')?tool.slice(6):'';const profile=agentProfiles[agentKey];
 if(profile){
  const permitted=profile.access.includes(isAdmin()?'admin':isStudent()?'student':'teacher');if(!permitted){toast(bilingual('This agent is not available for this account.','এই account-এর জন্য agentটি চালু নেই।'),true);return;}
 }
 const title=profile?bilingual('Ask Me','আমাকে জিজ্ঞেস করো'):toolLabel(tool);
 modal(title,(profile?'<div class="agent-stage"><img src="'+profile.image+'" alt="'+esc(title)+' reference character"><div><strong>'+esc(bilingual(...profile.role))+'</strong><small>'+bilingual('Reference character · 3D model asset slot','Reference character · 3D model asset slot')+'</small></div></div><div id="agent-inbox" class="agent-inbox" aria-live="polite"><div class="agent-empty">'+bilingual('Ask me about this app.','এই app সম্পর্কে আমাকে জিজ্ঞেস করো।')+'</div></div>':'')+'<form id="ai-form">'+field('prompt',profile?bilingual('Write a message','মেসেজ লিখুন'):bilingual('Topic, question, answer or instructions','বিষয়, প্রশ্ন, উত্তর বা নির্দেশনা'),'textarea','',[],true,true)+'<p class="hint">'+bilingual('For grading, include the answer, rubric and maximum marks. Avoid passwords and private contact details.','মূল্যায়নের জন্য উত্তর, মূল্যায়নের নিয়ম ও মোট নম্বর দাও। পাসওয়ার্ড বা ব্যক্তিগত যোগাযোগের তথ্য দেবে না।')+'</p><button class="btn primary" type="submit">'+(profile?bilingual('Send','পাঠাও'):bilingual('Generate draft','খসড়া তৈরি'))+'</button><div id="ai-error" class="error" role="alert"></div></form><pre class="ai-output" id="ai-result" aria-live="polite"></pre><button hidden class="btn" id="ai-copy">'+bilingual('Copy draft','খসড়া কপি')+'</button>',btn('Close','close'),true);
 if(profile){const d=$('dialog');if(d){d.classList.add('agent-dialog');d.querySelector('.modal-header')?.classList.add('agent-dialog-header');}}
 $('#ai-form').onsubmit=async ev=>{
  ev.preventDefault();const f=ev.currentTarget,b=f.querySelector('button');b.disabled=true;$('#ai-error').textContent='';$('#ai-result').textContent=bilingual('Working…','তৈরি হচ্ছে…');
  try{
   let result;
   if(session.demo){result={text:bilingual('DEMO SAMPLE — This is not an AI response.\n\n1. Define the learning objective.\n2. Review the supplied work and evidence.\n3. Write feedback and next steps.\n\nLog in to a real account to generate your requested draft.','ডেমো নমুনা—এটি AI-এর উত্তর নয়।\n\n১. শেখার লক্ষ্য ঠিক করো।\n২. উত্তর ও প্রমাণ যাচাই করো।\n৩. মতামত ও পরের ধাপ লেখো।\n\nনিজের অ্যাকাউন্টে লগইন করলে আসল খসড়া তৈরি হবে।')};}
   else {await cloud.flush();result=await cloud.request('ai-run',{tool,prompt:f.elements.prompt.value,language:db.settings.language});}
   if(!$('#ai-result'))return;$('#ai-result').textContent=result.text;if(profile&&$('#agent-inbox')){$('#agent-inbox').innerHTML='<div class="agent-bubble mine">'+esc(f.elements.prompt.value)+'</div><div class="agent-bubble">'+esc(result.text)+'</div>';f.elements.prompt.value='';}$('#ai-copy').hidden=false;$('#ai-copy').onclick=async()=>{try{await navigator.clipboard.writeText(result.text);toast(bilingual('Copied','কপি হয়েছে'));}catch{toast(bilingual('Select the draft and copy it.','খসড়া নির্বাচন করে কপি করো।'),true);}};
  }catch(err){if($('#ai-error')){$('#ai-error').textContent=err.message;$('#ai-result').textContent='';}}finally{b.disabled=false;}
 };
}
function connectionsPage(){
 return heading('API connections',bilingual('Provider status, delivery and access controls','API সংযোগ, মেসেজ পাঠানো ও অনুমতি নিয়ন্ত্রণ'),btn(bilingual('Check connections','সংযোগ যাচাই'),'service-refresh'))+
 (session.demo?'<div class="hint">'+bilingual('Demo: settings are local examples. No real API calls or messages are sent.','ডেমো: সেটিংস শুধু নমুনা। আসল API বা মেসেজ পাঠানো হবে না।')+'</div>':'')+'<div id="service-status" class="cards"></div>'+
 (isAdmin()?'<section class="panel"><div class="panel-body"><h2>'+bilingual('Platform controls','প্ল্যাটফর্ম নিয়ন্ত্রণ')+'</h2><form id="service-form">'+Object.entries(serviceLabels).map(([k,l])=>'<label class="switch-row"><span>'+bilingual(...l)+'</span><input class="switch" type="checkbox" name="'+k+'"></label>').join('')+'<div class="form-grid">'+field('dailyAiLimit',bilingual('AI requests per account / day','প্রতি অ্যাকাউন্টে দৈনিক AI অনুরোধ'),'number',30,[],true)+field('dailySendLimit',bilingual('Messages per workspace / day','প্রতি ওয়ার্কস্পেসে দৈনিক মেসেজ'),'number',50,[],true)+'</div><button class="btn primary" type="submit">'+e('Save changes')+'</button><p class="hint">'+bilingual('Teacher-specific permissions: Teachers → Features. Failed provider requests also count toward daily limits.','শিক্ষকভিত্তিক অনুমতি: Teachers → Features। ব্যর্থ provider request-ও দৈনিক সীমায় গণনা হয়।')+'</p></form></div></section>':'')+
 '<section class="panel"><div class="panel-body"><h2>'+bilingual('This device','এই ডিভাইস')+'</h2>'+btn(bilingual('Enable push notifications','পুশ নোটিফিকেশন চালু'),'enable-push')+'</div></section>'+
 messagePanel();
}
async function loadConnections(){
 if(!isAdmin())return;
 try{
  const r=session.demo?{status:Object.fromEntries(Object.keys(serviceLabels).map(k=>[k,{configured:k==='online',enabled:k!=='whatsapp',missing:[]} ])),settings:{ai:true,email:true,push:true,whatsapp:false,online:true,dailyAiLimit:30,dailySendLimit:50},history:[]}:await cloud.request('integration-status',{});
  connectedStatus=r;if(!$('#service-status'))return;
  $('#service-status').innerHTML=Object.entries(serviceLabels).map(([k,l])=>'<article class="card"><h3>'+bilingual(...l)+'</h3>'+badge(!r.status[k].enabled?'Disabled':r.status[k].configured?'Configured':'Setup needed')+'<p>'+esc((r.status[k].missing||[]).join(', '))+'</p>'+(k==='online'?'<small>'+bilingual('Google Meet / Zoom links. No API key required.','Google Meet / Zoom link। API key লাগে না।')+'</small>':'')+'</article>').join('');
  const f=$('#service-form');if(f){for(const k of Object.keys(serviceLabels))f.elements[k].checked=r.settings[k];for(const k of ['dailyAiLimit','dailySendLimit'])f.elements[k].value=r.settings[k];}
  if($('#delivery-history'))$('#delivery-history').innerHTML=r.history.length?r.history.map(x=>'<p>'+esc(x.channel)+' · '+esc(x.status)+' · '+date(x.created)+(x.error?' — '+esc(x.error):'')+'</p>').join(''):'<p>'+bilingual('No delivery requests yet.','এখনো মেসেজ পাঠানো হয়নি।')+'</p>';
 }catch(err){if($('#service-status'))$('#service-status').textContent=err.message;}
}
function onlinePage(){
 const list=visible('events').filter(r=>r.type==='Online class');
 return heading('Online classes',bilingual('Scheduled classes · Bangladesh time','নির্ধারিত ক্লাস · বাংলাদেশ সময়'),!isStudent()?btn(bilingual('Schedule class','ক্লাস যোগ করো'),'online-create','primary','plus'):'')+
 '<div class="hint">'+bilingual('Create a meeting in Google Meet, then save its link here. Free personal Meet: up to 100 people and 60 minutes for group calls.','Google Meet-এ meeting তৈরি করে link এখানে রাখো। ফ্রি personal Meet: সর্বোচ্চ ১০০ জন, group call ৬০ মিনিট।')+'</div>'+
 '<div class="cards">'+(list.length?list.sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).map(r=>'<article class="card"><h3>'+esc(r.title)+'</h3><p>'+esc(batchName(r.batchId))+' · '+date(r.date)+' '+esc(r.time||'')+'</p><a class="btn primary" target="_blank" rel="noopener noreferrer" href="'+esc(safeMeetingLink(r.meetingUrl))+'">'+bilingual('Join class','ক্লাসে যোগ দাও')+'</a>'+(!isStudent()?btn('Edit','online-edit:'+r.id,'small')+btn('Delete','online-delete:'+r.id,'small'):'')+'</article>').join(''):'<p>'+bilingual('No online classes scheduled.','এখনো অনলাইন ক্লাস নেই।')+'</p>')+'</div>';
}
function safeMeetingLink(url){try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password&&(['meet.google.com','zoom.us'].includes(u.hostname)||u.hostname.endsWith('.zoom.us'))?u.href:'#';}catch{return '#';}}
function meetingForm(id){
 const r=db.events.find(x=>x.id===id)||{};modal('Online classes','<a class="btn" href="https://meet.google.com/" target="_blank" rel="noopener noreferrer">'+bilingual('Open Google Meet to create a link','লিংক তৈরির জন্য Google Meet খোলো')+'</a><form id="meeting-form"><div class="form-grid">'+field('title','Title','text',r.title||'',[],true,true)+field('batchId','Batch','select',r.batchId||'',batches().map(b=>({value:b.id,label:b.name})),true)+field('date','Date','date',r.date||today(),[],true)+field('time','Time','time',r.time||'18:00',[],true)+field('url',bilingual('Meeting link','মিটিং লিংক'),'url',r.meetingUrl||'',[],true,true)+'</div><div class="error" id="meeting-error"></div><button class="btn primary" type="submit">'+e('Save')+'</button></form>',btn('Close','close'));
 $('#meeting-form').onsubmit=async ev=>{ev.preventDefault();const button=ev.currentTarget.querySelector('button');button.disabled=true;try{const body={...Object.fromEntries(new FormData(ev.currentTarget)),id};if(safeMeetingLink(body.url)==='#')throw Error('Use a Google Meet or Zoom HTTPS link.');if(session.demo){const row={...body,id:id||uid(),teacherId:session.teacherId,type:'Online class',meetingUrl:body.url};if(id)Object.assign(r,row);else db.events.push(row);persist(db);}else{await cloud.flush();await cloud.request('meeting-save',body);await refreshCloud();}closeModal();render();}catch(err){if($('#meeting-error'))$('#meeting-error').textContent=err.message;}finally{button.disabled=false;}};
}
const connectedBind=bindFeatures;
bindFeatures=function(){connectedBind();
 if(page==='connections'&&isAdmin()||page==='guardians'){
  if(isAdmin())loadConnections();
  const f=$('#service-form');if(f)f.onsubmit=async ev=>{ev.preventDefault();const button=f.querySelector('button');button.disabled=true;try{const body=Object.fromEntries(Object.keys(serviceLabels).map(k=>[k,f.elements[k].checked]));for(const k of ['dailyAiLimit','dailySendLimit'])body[k]=Number(f.elements[k].value);if(session.demo){toast(bilingual('Demo settings only','শুধু ডেমো সেটিংস'));return;}await cloud.flush();await cloud.request('service-settings',body);toast(t('Settings saved'));await loadConnections();}catch(err){toast(err.message,true);}finally{button.disabled=false;}};
  const n=$('#notify-form');if(n)n.onsubmit=async ev=>{ev.preventDefault();const button=n.querySelector('button');button.disabled=true;try{if(session.demo)throw Error(bilingual('Log in to send real messages.','আসল মেসেজ পাঠাতে লগইন করো।'));const body={...Object.fromEntries(new FormData(n)),consent:n.elements.consent.checked,requestId:crypto.randomUUID()};if(!confirm(bilingual('Send this message to the selected recipient?','নির্বাচিত প্রাপককে মেসেজটি পাঠাবে?')))return;await cloud.flush();const r=await cloud.request('notify',body);$('#delivery-result').textContent=r.status+(r.error?' — '+r.error:'');if(isAdmin())await loadConnections();}catch(err){$('#delivery-result').textContent=err.message;}finally{button.disabled=false;}};
 }
};
const connectedFeatureAction=featureAction;
featureAction=async function(action){
 const [a,b]=action.split(':');
 if(a==='student-ai'){try{const s=db.students.find(s=>s.id===b);if(!isAdmin()||!s)return;if(session.demo){s.aiEnabled=s.aiEnabled===false;persist(db);render();}else{await cloud.request('student-access',{id:b,enabled:s.aiEnabled===false});await refreshCloud();}}catch(err){toast(err.message,true);}return;}
 if(a==='connected-ai'){openAssistant(b);return;}
 if(a==='service-refresh'){loadConnections();return;}
 if(a==='online-create'||a==='online-edit'){meetingForm(b);return;}
 if(a==='online-delete'){if(!confirm(bilingual('Delete this scheduled class?','ক্লাসটি মুছে ফেলবে?')))return;try{if(session.demo){db.events=db.events.filter(x=>x.id!==b);persist(db);}else{await cloud.flush();await cloud.request('meeting-delete',{id:b});await refreshCloud();}render();}catch(err){toast(err.message,true);}return;}
 if(a==='enable-push'){
  try{if(session.demo)throw Error(bilingual('Use a real login first.','আগে নিজের অ্যাকাউন্টে লগইন করো।'));const r=await cloud.request('push-config',{});if(!r.firebase)throw Error(bilingual('Push is disabled or Firebase configuration is incomplete.','Push বন্ধ বা Firebase configuration অসম্পূর্ণ।'));const {registerPush}=await import('./push.js');const token=await registerPush(r.firebase);await cloud.request('push-register',{token});toast(bilingual('Push enabled on this device.','এই ডিভাইসে Push চালু হয়েছে।'));}catch(err){toast(err.message,true);}return;
 }
 return connectedFeatureAction(action);
};
teacherFeatures=function(id){
 if(!isAdmin())return;const r=db.teachers.find(x=>x.id===id);if(!r)return;
 const modules={students:'Students',batches:'Batches',attendance:'Attendance',assignments:'Assignments',materials:'Materials',exams:'Exams',quizzes:'Quizzes',routine:'Routine',notices:'Notices',messages:'Messages',calendar:'Calendar',fees:'Fees',analytics:'Analytics',guardians:'Guardians',ai:'AI Studio',email:'Email',push:'Push notifications',whatsapp:'WhatsApp',online:'Online classes',studentAI:'Student study tutor',...Object.fromEntries(['quiz','grading','insights','guardian','tutor'].map(k=>['ai_'+k,toolLabel(k)]))};
 modal('Features','<p>'+esc(r.name)+'</p><form id="features-form">'+Object.entries(modules).map(([k,label])=>'<label class="switch-row"><span>'+e(label)+'</span><input class="switch" type="checkbox" name="'+k+'" '+((r.features?.[k]??(!['email','push','whatsapp','online','studentAI'].includes(k)))?'checked':'')+'></label>').join('')+'<div class="form-grid">'+field('studentLimit','Student limit','number',r.studentLimit,[],true)+field('batchLimit','Batch limit','number',r.batchLimit,[],true)+field('storageLimit','Storage limit (MB)','number',r.storageLimit,[],true)+field('aiDailyLimit',bilingual('Daily AI limit','দৈনিক AI সীমা'),'number',r.aiDailyLimit??30,[],true)+'</div><button class="btn primary" type="submit">'+e('Save changes')+'</button></form>',btn('Close','close'),true);
 $('#features-form').onsubmit=ev=>{ev.preventDefault();const before=structuredClone(r),f=ev.currentTarget;const nums=Object.fromEntries(['studentLimit','batchLimit','storageLimit','aiDailyLimit'].map(k=>[k,Number(f.elements[k].value)]));if(Object.values(nums).some(n=>!Number.isInteger(n)||n<0)||nums.aiDailyLimit<0){toast('Enter valid nonnegative limits.',true);return;}r.features=Object.fromEntries(Object.keys(modules).map(k=>[k,f.elements[k].checked]));Object.assign(r,nums);save('Edit','teachers',id,before);closeModal();render();toast(t('Saved successfully'));};

};

const baseConnectionsPage=connectionsPage;
connectionsPage=function(){if(!isAdmin())return heading('Feature unavailable');return baseConnectionsPage()+(isAdmin()?'<section class="panel"><div class="panel-body"><h2>'+bilingual('Student AI access','শিক্ষার্থীর AI অনুমতি')+'</h2><p>'+bilingual('The teacher’s Student study tutor switch must also be enabled.','শিক্ষকের Student study tutor-ও চালু থাকতে হবে।')+'</p>'+db.students.map(s=>'<div class="switch-row"><span>'+esc(s.name||s.id)+'</span>'+btn(s.aiEnabled===false?'Enable AI':'Disable AI','student-ai:'+s.id,'small')+'</div>').join('')+'</div></section>':'');};

const previewGuardiansPage=guardiansPage;
guardiansPage=function(){if(session.demo)return previewGuardiansPage();return heading('Guardians',bilingual('Review and send a message to your students.','শিক্ষার্থীদের মেসেজ যাচাই করে পাঠাও।'))+messagePanel();};

const previewAdminDashboard=adminDashboard;
adminDashboard=function(){return previewAdminDashboard().replace(e('No API connected')+' · AI: 0',session.demo?bilingual('Demo tools','ডেমো tools'):'<a href="#connections">'+bilingual('Manage API connections','API সংযোগ নিয়ন্ত্রণ')+'</a>');};

function messagePanel(){return (!isStudent()?'<section class="panel"><div class="panel-body"><h2>'+bilingual('Send a message','মেসেজ পাঠাও')+'</h2><form id="notify-form"><div class="form-grid">'+field('recipientId',bilingual('Recipient','প্রাপক'),'select','',(isAdmin()?db.teachers:students()).map(r=>({value:r.id,label:r.name+' · '+(r.email||r.studentId||'Demo')})),true)+field('channel',bilingual('Channel','মাধ্যম'),'select','email',[{value:'email',label:'Email'},{value:'push',label:'Push'},{value:'whatsapp',label:'WhatsApp'}],true)+field('subject',bilingual('Subject','বিষয়'),'text','',[],true,true)+field('text',bilingual('Message','মেসেজ'),'textarea','',[],true,true)+'</div><label class="switch-row"><span>'+bilingual('For WhatsApp: guardian has agreed to receive messages','WhatsApp-এর জন্য: অভিভাবক মেসেজ পেতে সম্মতি দিয়েছেন')+'</span><input type="checkbox" name="consent"></label><p class="hint">'+bilingual('Email and push go to the selected account. WhatsApp goes to the saved guardian number using your approved template. Review before sending.','Email ও push নির্বাচিত অ্যাকাউন্টে যাবে। WhatsApp অনুমোদিত template দিয়ে অভিভাবকের নম্বরে যাবে। পাঠানোর আগে যাচাই করো।')+'</p><button class="btn primary" type="submit">'+bilingual('Send message','মেসেজ পাঠাও')+'</button><p id="delivery-result" role="status"></p></form></div></section><section class="panel"><div class="panel-body"><h2>'+bilingual('Recent delivery requests','সাম্প্রতিক মেসেজ অনুরোধ')+'</h2><div id="delivery-history"></div></div></section>':'');}

const settingsWithDevicePush=settingsPage;
settingsPage=function(){return settingsWithDevicePush()+(!isAdmin()?'<section class="panel section-gap"><div class="panel-body"><h2>'+bilingual('Device notifications','ডিভাইস নোটিফিকেশন')+'</h2>'+btn(bilingual('Enable push notifications','পুশ নোটিফিকেশন চালু'),'enable-push')+'</div></section>':'');};
