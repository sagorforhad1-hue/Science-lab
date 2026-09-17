
/** Dashboard actions and short, reduced-motion-aware feedback. */
const staticStat=stat;
stat=function(title,value,foot,ico){
 const routes={'Active students':'students','Active batches':isStudent()?'routine':'batches','Assignments':'assignments','Attendance rate':'attendance','Outstanding fees':'fees','Teachers':'teachers','Active':isAdmin()?'teachers':null,'Students':isAdmin()?'teachers':'students','Collection this month':'billing'};
 const route=routes[title],html=staticStat(title,value,foot,ico);
 if(!route||!allowed(route))return html;
 return html.replace('<div class="stat">','<a class="stat stat-link" href="#'+route+'" data-go="'+route+'" aria-label="'+e(title)+' — '+e(labels[route])+'">').replace(/<\/div>$/,'</a>');
};
const staticPulse=pulse;
pulse=function(){
 const exams=visible('exams').filter(x=>x.status==='Published').slice(-6);
 if(!exams.length)return '<div class="empty">'+e('No records yet')+'</div>';
 let index=0;
 return staticPulse().replace('role="img"','role="group"').replace(/<circle cx="([^"]+)" cy="([^"]+)" r="4"([^>]*)\/>/g,(_,x,y,rest)=>{
  const exam=exams[index++];return '<g class="chart-point" role="button" tabindex="0" data-action="pulse-exam:'+esc(exam.id)+'" aria-label="'+esc(exam.title)+'"><title>'+esc(exam.title)+'</title><circle cx="'+x+'" cy="'+y+'" r="18" fill="transparent"/><circle class="point-core" cx="'+x+'" cy="'+y+'" r="4"'+rest+'/></g>';
 });
};
const staticDashboard=dashboard;
dashboard=function(){
 let html=staticDashboard();if(isAdmin())return html;
 html=html.replace('<span class="badge">'+e('Overview')+'</span>',btn('View results','go:exams','small'));
 html=html.replace(/<div class="attention-row">([\s\S]*?)<button class="text-link" data-go="([^"]+)">↗<\/button><\/div>/g,(_,content,route)=>'<a class="attention-row row-link" href="#'+route+'" data-go="'+route+'">'+content+'<span aria-hidden="true">↗</span></a>');
 const featuredNotice=visible('notices').filter(n=>!n.expires||n.expires>=today()).sort((a,b)=>Number(b.pinned)-Number(a.pinned))[0];
 if(featuredNotice){html=html.replace('<h3>'+esc(featuredNotice.title)+'</h3>','<h3><button class="notice-title-action" data-action="detail:notices:'+esc(featuredNotice.id)+'">'+esc(featuredNotice.title)+'</button></h3>');html=html.replace('<svg class="molecule"','<svg role="button" tabindex="0" data-action="detail:notices:'+esc(featuredNotice.id)+'" aria-label="'+e('Open notice')+'" class="molecule"');}
 const activity=own('audit').slice(0,3);let index=0;
 html=html.replace(/<div class="activity-row">([\s\S]*?)<\/time><\/div>/g,(all)=>{const a=activity[index++];return a?all.replace('<div class="activity-row">','<button type="button" class="activity-row row-link" data-action="activity-open:'+esc(a.id)+'">').replace(/<\/div>$/,'</button>'):all;});
 html=html.replace('<div class="donut" style=', '<button type="button" class="donut" data-action="attendance-breakdown:all" aria-label="'+e('Attendance history')+'" style=').replace('</small></div></div><div class="legend-list">','</small></div></button><div class="legend-list">');
 for(const status of ['Present','Absent','Late']){
  const label=e(status);
  html=html.replace(new RegExp('<div>(<i style="[^"]+"></i>'+label+'<b>[^<]*</b>)</div>'),'<button type="button" class="legend-button" data-action="attendance-breakdown:'+status+'">$1</button>');
 }
 return html;
};
const staticScheduleRows=scheduleRows;
scheduleRows=function(){return staticScheduleRows().replace(/<div class="schedule-row">([\s\S]*?)<button class="icon-button" data-action="([^"]+)" aria-label="[^"]*">[\s\S]*?<\/button><\/div>/g,(_,content,action)=>'<button type="button" class="schedule-row row-link" data-action="'+action+'">'+content+'<span class="icon-button" aria-hidden="true">'+icon('arrow')+'</span></button>');};
const motionFeatureAction=featureAction;
featureAction=async function(action){
 const [kind,id]=action.split(':');
 if(kind==='focus-login'){const input=$('#secure-auth-form input');input?.focus();input?.scrollIntoView({behavior:motionEnabled()?'smooth':'auto',block:'center'});return;}
 if(kind==='pulse-exam'){
  if(!allowed('exams'))return;const exam=visible('exams').find(x=>x.id===id);if(!exam)return;
  const marks=visible('marks').filter(m=>m.examId===id);
  modal(exam.title,'<p class="subtitle">'+date(exam.date)+' · '+esc(batchName(exam.batchId))+'</p>'+(marks.length?'<div class="table-wrap"><table><thead><tr><th>'+e('Student')+'</th><th>'+e('Marks')+'</th></tr></thead><tbody>'+marks.map(m=>'<tr><td>'+esc(studentName(m.studentId))+'</td><td>'+num(m.marks)+' / '+num(exam.total)+'</td></tr>').join('')+'</tbody></table></div>':empty()),btn('View results','go:exams','primary')+btn('Close','close'));return;
 }
 if(kind==='attendance-breakdown'){
  if(!allowed('attendance'))return;const records=visible('attendance').filter(a=>id==='all'||a.status===id).sort((a,b)=>b.date.localeCompare(a.date));
  modal(id==='all'?'Attendance history':id,'<p class="subtitle">'+num(records.length)+' '+e('Records')+'</p>'+(records.length?'<div class="table-wrap"><table><thead><tr>'+['Date','Student','Status'].map(x=>'<th>'+e(x)+'</th>').join('')+'</tr></thead><tbody>'+records.slice(0,100).map(a=>'<tr><td>'+date(a.date)+'</td><td>'+esc(studentName(a.studentId))+'</td><td>'+badge(a.status)+'</td></tr>').join('')+'</tbody></table></div>'+(records.length>100?'<p class="hint">'+bilingual('Showing latest 100 records. Open Attendance for full history.','সর্বশেষ ১০০টি রেকর্ড। সম্পূর্ণ ইতিহাস Attendance-এ দেখো।')+'</p>':''):empty()),btn('Attendance','go:attendance','primary')+btn('Close','close'),true);return;
 }
 if(kind==='activity-open'){
  const a=own('audit').find(x=>x.id===id);if(!a)return;
  const route={submissions:'assignments',marks:'exams',payments:'fees'}[a.entity]||a.entity;
  modal('Recent activity','<p class="detail-text">'+esc(a.actor)+'\n'+e(a.action)+' · '+e(labels[a.entity]||a.entity)+'\n'+date(a.created)+'</p>',(labels[route]&&allowed(route)?btn('Open','go:'+route,'primary'):'')+btn('Close','close'));return;
 }
 return motionFeatureAction(action);
};
function motionEnabled(){return !document.body?.classList.contains('no-motion')&&!(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches);}
document.addEventListener('keydown',ev=>{
 const el=ev.target.closest?.('[role="button"][data-action]');
 if(el&&(ev.key==='Enter'||ev.key===' ')){ev.preventDefault();featureAction(el.dataset.action);}
});
document.addEventListener('pointerdown',ev=>{
 const el=ev.target.closest?.('button:not(:disabled),a.stat-link,a.row-link');
 if(!el||!motionEnabled()||ev.button>0)return;
 const box=el.getBoundingClientRect(),dot=document.createElement('span');
 dot.className='reaction-ripple';dot.setAttribute('aria-hidden','true');
 dot.style.left=(ev.clientX-box.left)+'px';dot.style.top=(ev.clientY-box.top)+'px';
 el.append(dot);setTimeout(()=>dot.remove(),500);
});
