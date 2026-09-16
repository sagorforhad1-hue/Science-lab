import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {seed} from '../public/data.js';
import {blank,active,project,applyOperation,validateAccount,quizStart,quizSubmit} from '../lib/domain.js';
function fixture(){
 const db=seed(),teacher={id:'t1',role:'teacher',active:true,data:db.teachers[0],email:'teacher@example.test',preferences:{}};
 const profiles=[teacher,...db.students.map(s=>({id:s.id,role:'student',teacher_id:s.teacherId,active:true,data:s,email:s.id+'@example.test',preferences:{}}))];
 return {db,teacher,student:profiles[1],profiles};
}
test('real workspaces start empty and cannot inherit demo student accounts',()=>{
 const db=blank();assert.equal(db.students.length,0);assert.equal(db.accounts.length,0);assert.equal(db.teachers.length,0);assert.equal(db.marks.length,0);
});
test('student data projection excludes classmates, guardian contacts, drafts and answer keys',()=>{
 const {db,student,profiles}=fixture();db.queue.push({id:'private'});db.quizSessions=[{id:'private'}];db.notices.push({id:'private',studentId:'s2',batchId:'all'});
 const view=project(student,db,profiles);
 assert.equal(view.students.length,1);assert.ok(view.students.every(s=>s.id==='s1'));assert.ok(!JSON.stringify(view).includes('Guardian of Arif'));
 assert.ok(view.exams.every(x=>x.status==='Published'));assert.ok(view.quizzes.every(q=>q.questions.every(q=>!('answer'in q))));
 assert.equal(view.queue.length,0);assert.ok(!('quizSessions'in view));assert.ok(!view.notices.some(n=>n.id==='private'));
});
test('students cannot forge marks, fees, attendance, quiz scores or teacher records',()=>{
 const {db,student,profiles}=fixture();
 for(const entity of ['marks','payments','attendance','attempts','plans','audit','teachers'])
 assert.throws(()=>applyOperation(student,db,profiles,{entity,id:'forged',before:null,after:{id:'forged',teacherId:'t1',studentId:'s1'}}));
});
test('teacher cannot create admin/teacher accounts, student cannot create any accounts',()=>{
 const {teacher,student,profiles,db}=fixture();
 for(const [actor,role] of [[teacher,'admin'],[teacher,'teacher'],[student,'student'],[student,'teacher']])
 assert.throws(()=>validateAccount(actor,role,{name:'Other',email:'other@example.test'},profiles,db));
});
test('teacher account creation enforces ownership enrollment and duplicate student IDs',()=>{
 const {teacher,profiles,db}=fixture();const r={name:'New Student',email:'new@example.test',batchIds:['foreign'],studentId:'new'};
 assert.throws(()=>validateAccount(teacher,'student',r,profiles,db),/active batch/);
 r.batchIds=['b1'];r.studentId=profiles[1].data.studentId;assert.throws(()=>validateAccount(teacher,'student',r,profiles,db),/already exists/);
 r.studentId='new';validateAccount(teacher,'student',r,profiles,db);
});
test('suspended and expired teacher accounts block student access',()=>{
 const {student,teacher}=fixture();teacher.active=false;assert.throws(()=>active(student,teacher),/suspended/);teacher.active=true;teacher.data.expiry='2000-01-01';assert.throws(()=>active(student,teacher),/expired/);
});
test('updates reject stale writes and forged tenant ownership',()=>{
 const {teacher,profiles,db}=fixture();const old=db.batches[0];assert.throws(()=>applyOperation(teacher,db,profiles,{entity:'batches',id:old.id,before:{...old,name:'stale'},after:old}),/changed/);
 assert.throws(()=>applyOperation(teacher,db,profiles,{entity:'batches',id:old.id,before:old,after:{...old,teacherId:'t2'}}),/workspace/);
});
test('student submissions cannot set grades or submit for another student',()=>{
 const {student,profiles,db}=fixture();db.submissions=[];const r={id:'new',teacherId:'t1',studentId:'s2',assignmentId:'h1',text:'answer',marks:20,files:[]};
 assert.throws(()=>applyOperation(student,db,profiles,{entity:'submissions',id:'new',before:null,after:r}));
 r.studentId='s1';applyOperation(student,db,profiles,{entity:'submissions',id:'new',before:null,after:r});
 assert.ok(!('marks'in db.submissions[0]));assert.equal(db.submissions[0].status,'Submitted');
});
test('student cannot message another student or bypass teacher-only batch discussion',()=>{
 const {student,profiles,db}=fixture();const r={id:'new',teacherId:'t1',studentId:'s2',sender:'s1',text:'x',files:[]};
 assert.throws(()=>applyOperation(student,db,profiles,{entity:'messages',id:'new',before:null,after:r}),/conversation/);
 Object.assign(r,{studentId:null,batchId:'b1',group:true});assert.throws(()=>applyOperation(student,db,profiles,{entity:'messages',id:'new',before:null,after:r}),/group/);
});
test('quiz timer and score are controlled by server and late answers cannot earn marks',()=>{
 const {student,db}=fixture();const now=Date.now(),s=quizStart(student,db,'q1',student.data,now);assert.equal(quizStart(student,db,'q1',student.data,now+500).end,s.end);
 const result=quizSubmit(student,db,'q1',{q11:1,q12:2,q13:2,score:999},now+1000);assert.equal(result.score,3);
 assert.equal(quizSubmit(student,db,'q1',{},now+2000).id,result.id);
 const other={...student,id:'s2'};quizStart(other,db,'q1',student.data,now);assert.equal(quizSubmit(other,db,'q1',{q11:1,q12:2,q13:2},now+700000).score,0);
});
