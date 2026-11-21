import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {seed} from '../public/data.js';
import {demoReport} from '../public/demo-reports.js';

test('reports follow edited attendance and exclude another classroom',()=>{
 const db=seed();db.attendance=[{studentId:'s1',status:'Present'}];
 let report=demoReport(db,{teacherId:'t1'});assert.match(report,/100%/);
 db.attendance[0].status='Absent';report=demoReport(db,{teacherId:'t1'});assert.match(report,/0%/);
 assert.match(demoReport(db,{teacherId:'t2'}),/Students: 0/);
 assert.match(report,/DEMO REPORT/);
});
test('student reports include only their own records and tolerate empty data',()=>{
 const db=seed();const report=demoReport(db,{teacherId:'t1',studentId:'s1'});
 assert.match(report,/Ayesha Rahman/);assert.doesNotMatch(report,/Arif Hasan/);
 db.students=[];db.marks=[];assert.match(demoReport(db),/No records/);
});
test('exam percentages use recorded maximum marks',()=>{
 const db=seed();db.marks=[{studentId:'s1',examId:'e1',marks:30}];db.exams[0].total=50;
 assert.match(demoReport(db,{teacherId:'t1'}),/60.0%/);
});
test('public startup never restores cloud login and selects a demo role',async()=>{
 const context=vm.createContext({db:seed(),globalThis:{},sessionStorage:{getItem:()=>null},boot:null,renderLogin:null,render:()=>{},featureAction:()=>{},persist:()=>{},setSession:s=>context.session=s});
 vm.runInContext(fs.readFileSync(new URL('../src/public-demo.js',import.meta.url),'utf8'),context);
 await context.boot();assert.equal(context.session.role,'teacher');assert.equal(context.session.demo,true);
 assert.equal(context.db.teachers[0].features.studentAI,true);
});
