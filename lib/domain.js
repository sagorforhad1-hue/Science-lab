import {seed} from '../public/data.js';
export const kinds=['batches','attendance','assignments','submissions','materials','exams','marks','quizzes','attempts','routine','notices','messages','payments','billing','queue','audit','events','plans'];
export class AppError extends Error {constructor(status,message){super(message);this.status=status;}}
export function requireThat(ok,message,status=403){if(!ok)throw new AppError(status,message);}
export const same=(a,b)=>JSON.stringify(normal(a))===JSON.stringify(normal(b));
function normal(x){if(Array.isArray(x))return x.map(normal);if(x&&typeof x==='object')return Object.fromEntries(Object.keys(x).sort().map(k=>[k,normal(x[k])]));return x??null;}
export function blank(){const s=seed();for(const k of Object.keys(s))if(Array.isArray(s[k])&&k!=='plans')s[k]=[];s.settings.name='';s.settings.coaching='Science Lab';s.preferences={};return s;}
export function profileRecord(p){return {...p.data,id:p.id,email:p.email,...(p.role==='student'?{teacherId:p.teacher_id}:{})};}
export function active(p,teacher){requireThat(p&&p.active,'This account is inactive.',403);if(p.role!=='admin'){requireThat(teacher?.active&&teacher.data.status!=='Suspended','Your coaching account is suspended.');if(teacher.data.expiry)requireThat(new Date(teacher.data.expiry+'T23:59:59+06:00').getTime()+3*86400000>=Date.now(),'Your coaching subscription has expired.');}if(p.role==='student')requireThat(p.data.status==='Active','Your student account is inactive.');}
export function project(p,raw,profiles,platform={}){
 const db=Object.assign(blank(),structuredClone(raw));db.accounts=[];delete db.integrationUsage;delete db.deliveryLog;delete db.aiUsage;delete db.aiTrackingSince;
 if(p.role!=='admin'&&(platform.services?.online===false||profiles.find(x=>x.id===(p.role==='teacher'?p.id:p.teacher_id))?.data.features?.online!==true))db.events=db.events.filter(x=>x.type!=='Online class'&&!x.meetingUrl);db.teachers=profiles.filter(x=>x.role==='teacher').map(profileRecord);db.students=profiles.filter(x=>x.role==='student').map(profileRecord);
 db.settings={...blank().settings,...raw.settings,...p.preferences?.settings};db.preferences={[p.role+':'+p.id]:p.preferences?.notifications||{}};
 if(p.role==='admin'){db.teachers=profiles.filter(x=>x.role==='teacher').map(profileRecord);db.students=profiles.filter(x=>x.role==='student').map(x=>({id:x.id,name:x.data.name,email:x.email,teacherId:x.teacher_id,status:x.data.status,aiEnabled:x.data.aiEnabled!==false}));return db;}
 db.plans=platform.plans?.length?platform.plans:blank().plans;
 db.notices=[...(raw.notices||[]),...(platform.notices||[]).filter(x=>x.global)];
 if(p.role==='teacher')return db;
 const student=profileRecord(p),enrolled=id=>student.batchIds?.includes(id),shared=r=>(!r.studentId||r.studentId===p.id)&&(!r.batchId||r.batchId==='all'||enrolled(r.batchId));
 const result=blank();result.plans=[];result.settings=db.settings;result.preferences=db.preferences;
 result.students=[student];result.teachers=db.teachers.map(t=>({id:t.id,name:t.name,coaching:t.coaching,status:t.status,features:t.features,storageLimit:t.storageLimit,expiry:t.expiry,photoData:t.photoData,logoData:t.logoData,coverData:t.coverData,subject:t.subject,bio:t.bio}));
 result.batches=db.batches.filter(b=>enrolled(b.id));
 for(const k of ['attendance','submissions','marks','payments','attempts'])result[k]=db[k].filter(x=>x.studentId===p.id);
 for(const k of ['assignments','exams','quizzes'])result[k]=db[k].filter(x=>enrolled(x.batchId)&&x.status==='Published');
 result.marks=result.marks.filter(x=>result.exams.some(e=>e.id===x.examId));
 for(const k of ['materials','routine','notices','events'])result[k]=db[k].filter(shared);
 result.messages=db.messages.filter(m=>m.group?enrolled(m.batchId):m.studentId===p.id);
 result.quizzes=result.quizzes.map(q=>({...q,questions:q.questions.map(({answer,...rest})=>result.attempts.some(a=>a.quizId===q.id)?{...rest,answer}:rest)}));
 return result;
}
const teacherKinds=new Set(['batches','attendance','assignments','submissions','materials','exams','marks','quizzes','routine','notices','messages','payments','queue','events']);
const adminKinds=new Set(['plans','billing','notices']);
const moduleFor={batches:'batches',attendance:'attendance',assignments:'assignments',submissions:'assignments',exams:'exams',marks:'exams',routine:'routine',events:'calendar',notices:'notices',messages:'messages',materials:'materials',quizzes:'quizzes',attempts:'quizzes',payments:'fees',queue:'guardians'};
export function applyOperation(p,db,profiles,op,now=Date.now()){
 const {entity,id,before,after}=op;
 requireThat(typeof id==='string'&&id.length<=100&&kinds.includes(entity),'Unknown record.',400);
 requireThat(entity!=='audit'&&entity!=='attempts','This record is server managed.');
 if(moduleFor[entity]&&p.role!=='admin'){
  const teacher=profiles.find(x=>x.id===(p.role==='teacher'?p.id:p.teacher_id));
  requireThat(teacher?.data.features?.[moduleFor[entity]]!==false,'This module is disabled.');
  if(entity==='events'&&(after?.meetingUrl||after?.type==='Online class'))requireThat(teacher?.data.features?.online===true,'Online classes are disabled.');
 }
 const list=db[entity]||[],old=list.find(x=>x.id===id);
 requireThat(same(old,before),'This record changed on another device. Refresh and try again.',409);
 let next=after?structuredClone(after):null;
 if(next){requireThat(next.id===id&&!['__proto__','constructor','prototype'].includes(id),'Invalid record ID.',400);requireThat(JSON.stringify(next).length<200000,'Record is too large.',413);}
 if(p.role==='admin'){
  requireThat(adminKinds.has(entity),'Only teachers manage classroom records.');
  if(next&&entity==='notices')Object.assign(next,{global:true,teacherId:null,batchId:'all',studentId:''});
 }else if(p.role==='teacher'){
  requireThat(teacherKinds.has(entity),'You cannot edit this record.');
  if(next){requireThat(next.teacherId===p.id,'Wrong workspace.');next.teacherId=p.id;}
 }else{
  requireThat(['submissions','messages'].includes(entity),'Students cannot change this data.');
  const s=profileRecord(p);
  if(entity==='submissions'){
   requireThat(next&&next.studentId===p.id&&next.teacherId===p.teacher_id,'You can submit only your own work.');
   const a=db.assignments.find(x=>x.id===next.assignmentId&&x.status==='Published'&&s.batchIds?.includes(x.batchId));
   requireThat(a,'Assignment is unavailable.');
   const late=now>new Date(a.deadline.length===16?a.deadline+':00+06:00':a.deadline).getTime();
   requireThat(!late||a.late,'Submissions are closed.');
   requireThat(!db.submissions.some(x=>x.assignmentId===a.id&&x.studentId===p.id&&x.id!==id),'Submission already exists.',409);
   next={id,teacherId:p.teacher_id,studentId:p.id,assignmentId:a.id,text:String(next.text||'').slice(0,50000),files:next.files||[],status:late?'Late':'Submitted',submittedAt:new Date(now).toISOString()};
  }
  if(entity==='messages'){
   if(old&&same({...old,read:true},next)){requireThat(old.studentId===p.id||(old.group&&s.batchIds?.includes(old.batchId)),'Not your conversation.');}
   else {
    requireThat(!old||old.sender===p.id&&now-new Date(old.created).getTime()<900000,'Only your recent messages can be changed.');
    if(next){
     requireThat(next.sender===p.id&&next.teacherId===p.teacher_id,'Invalid sender.');
     if(next.group){const batch=db.batches.find(b=>b.id===next.batchId);requireThat(batch?.discussion&&s.batchIds?.includes(batch.id),'Students cannot post in this group.');}
     else requireThat(next.studentId===p.id,'Not your conversation.');
     if(old)requireThat(next.studentId===old.studentId&&next.batchId===old.batchId&&next.group===old.group,'Conversation cannot change.');
     next={...next,created:old?.created||new Date(now).toISOString(),sender:p.id};
    }
   }
  }
 }
 if(next){
  for(const field of ['amount','marks','total','pass','fee','capacity','duration','studentLimit','batchLimit','storageLimit'])if(field in next)requireThat(Number.isFinite(next[field])&&next[field]>=0,'Invalid numeric value: '+field,400);
  if(next.batchId&&next.batchId!=='all')requireThat(db.batches.some(b=>b.id===next.batchId),'Batch does not exist.',400);
  if(next.studentId)requireThat(profiles.some(s=>s.role==='student'&&s.id===next.studentId),'Student does not belong to this workspace.',400);
  if(entity==='batches'){const teacher=profiles.find(x=>x.id===p.id);if(!old&&next.status==='Active')requireThat(db.batches.filter(b=>b.status==='Active').length<(teacher.data.batchLimit||0),'Batch limit reached.',400);}
  if(entity==='attendance')requireThat(['Present','Absent','Late'].includes(next.status),'Invalid attendance.',400);
  if(entity==='exams')requireThat(next.total>0&&next.pass<=next.total,'Invalid exam marks.',400);
  if(entity==='marks'){const ex=db.exams.find(e=>e.id===next.examId);requireThat(ex&&next.marks<=ex.total,'Marks exceed exam total.',400);}
  if(entity==='submissions'&&p.role==='teacher'){const a=db.assignments.find(a=>a.id===next.assignmentId);requireThat(a&&(!('marks'in next)||next.marks<=a.marks),'Invalid assignment marks.',400);}
  if(entity==='quizzes'){
   requireThat(!db.attempts.some(a=>a.quizId===id),'A quiz with attempts cannot be edited.',409);
   requireThat(next.duration>0&&next.duration<=180&&Array.isArray(next.questions)&&next.questions.length>0&&next.questions.length<=100,'Invalid quiz.',400);
   for(const q of next.questions)requireThat(typeof q.text==='string'&&q.text.trim()&&q.options?.length===4&&q.options.every(x=>typeof x==='string'&&x.trim())&&Number.isInteger(q.answer)&&q.answer>=0&&q.answer<4,'Invalid question.',400);
  }
  if(entity==='messages'&&p.role==='teacher'){requireThat(next.sender===p.id||old&&same({...old,read:true},next),'Cannot impersonate a student.');next.created=old?.created||new Date(now).toISOString();}
 }
 if(!next&&entity==='quizzes')requireThat(!db.attempts.some(a=>a.quizId===id),'A quiz with attempts cannot be deleted.',409);
 if(!next&&entity==='batches')requireThat(!profiles.some(s=>s.data.batchIds?.includes(id)),'Archive an enrolled batch instead of deleting it.',400);
 if(next){if(old)list[list.findIndex(x=>x.id===id)]=next;else list.push(next);}else db[entity]=list.filter(x=>x.id!==id);
 if(next)db[entity]=list;
 db.audit=[{id:crypto.randomUUID(),teacherId:p.role==='admin'?null:p.role==='teacher'?p.id:p.teacher_id,actor:p.data.name||p.email,action:next?(old?'Edit':'Create'):'Delete',entity,recordId:id,created:new Date(now).toISOString()},...(db.audit||[])].slice(0,1000);
 return db;
}
export function validateAccount(actor,role,record,profiles,workspace){
 requireThat(actor.role==='admin'&&role==='teacher'||actor.role==='teacher'&&role==='student','You cannot create this account.');
 requireThat(record&&typeof record.name==='string'&&record.name.trim().length>1,'Name is required.',400);
 requireThat(typeof record.email==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email),'A valid login email is required.',400);
 if(role==='student'){
  requireThat(Array.isArray(record.batchIds)&&record.batchIds.length>0,'Select a batch.',400);
  requireThat(!profiles.some(s=>s.role==='student'&&s.data.studentId===record.studentId),'Student ID already exists.',409);
  requireThat(profiles.filter(s=>s.role==='student'&&s.data.status==='Active').length<(actor.data.studentLimit||0),'Student limit reached.',400);
  for(const id of record.batchIds){const b=workspace.batches.find(b=>b.id===id&&b.status==='Active');requireThat(b,'Choose an active batch.',400);requireThat(profiles.filter(s=>s.role==='student'&&s.data.status==='Active'&&s.data.batchIds?.includes(id)).length<b.capacity,'Batch is full.',400);}
 }
}
export function quizStart(p,db,quizId,student,now=Date.now()){
 requireThat(p.role==='student','Only students can start a quiz.');
 const q=db.quizzes.find(q=>q.id===quizId&&q.status==='Published'&&student.batchIds?.includes(q.batchId));
 const at=v=>new Date(v.length===16?v+':00+06:00':v).getTime();
 requireThat(q&&now>=at(q.opens)&&now<at(q.closes),'Quiz is closed.',400);
 requireThat(!db.attempts.some(a=>a.quizId===q.id&&a.studentId===p.id),'Quiz already submitted.',409);
 db.quizSessions||=[];let s=db.quizSessions.find(s=>s.quizId===q.id&&s.studentId===p.id);
 if(!s){s={id:crypto.randomUUID(),quizId:q.id,studentId:p.id,end:Math.min(now+q.duration*60000,at(q.closes))};db.quizSessions.push(s);}
 return s;
}
export function quizSubmit(p,db,quizId,answers,now=Date.now()){
 const s=db.quizSessions?.find(s=>s.quizId===quizId&&s.studentId===p.id),q=db.quizzes.find(q=>q.id===quizId);
 requireThat(p.role==='student'&&s&&q,'Start the quiz first.',400);
 const done=db.attempts.find(a=>a.studentId===p.id&&a.quizId===quizId);if(done)return done;
 requireThat(answers&&typeof answers==='object'&&!Array.isArray(answers),'Invalid answers.',400);
 // A late network retry is accepted as a zero-score timed-out attempt, never extra exam time.
 const accepted=now<=s.end+15000?Object.fromEntries(q.questions.filter(q=>Number.isInteger(answers[q.id])&&answers[q.id]>=0&&answers[q.id]<4).map(q=>[q.id,answers[q.id]])):{};
 const a={id:crypto.randomUUID(),teacherId:p.teacher_id,studentId:p.id,quizId,answers:accepted,score:q.questions.filter(q=>accepted[q.id]===q.answer).length,total:q.questions.length,submittedAt:new Date(now).toISOString(),timedOut:now>s.end+15000};
 db.attempts.push(a);return a;
}
