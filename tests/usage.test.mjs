
import test from 'node:test';
import assert from 'node:assert/strict';
import {usageSummary,checkMonthlyQuota,assertViewAction} from '../lib/usage.js';
import {project,blank} from '../lib/domain.js';
const p={id:'t1',role:'teacher',data:{name:'Teacher',aiDailyLimit:0,aiMonthlyLimit:0}};
const now=new Date('2026-09-17T15:00:00Z');
test('zero quotas are preserved and enforced, never replaced with a default',()=>{
 const r=usageSummary(p,{}, {},now);assert.equal(r.dailyLimit,0);assert.equal(r.monthlyLimit,0);assert.equal(r.monthlyRemaining,0);assert.throws(()=>checkMonthlyQuota(r),/Monthly/);
});
test('usage counts only the correct account and month; unknown tokens stay unknown',()=>{
 const raw={aiUsage:[{accountId:'t1',month:'2026-09',tool:'quiz',tokens:51},{accountId:'t1',month:'2026-09',tool:'quiz',tokens:null},{accountId:'other',month:'2026-09',tokens:999},{accountId:'t1',month:'2026-08',tokens:900}]};
 const r=usageSummary({...p,data:{aiDailyLimit:40,aiMonthlyLimit:10}},raw,{services:{dailyAiLimit:30}},now);
 assert.equal(r.tokens,51);assert.equal(r.unknownTokens,1);assert.equal(r.monthlyUsed,2);assert.equal(r.monthlyRemaining,8);assert.equal(r.dailyLimit,30);assert.equal(r.features.quiz.requests,2);assert.equal(r.resetAt,'2026-10-01T00:00:00.000Z');
});
test('missing monthly cap is explicit and 80/90 percent alerts reflect actual daily usage',()=>{
 const profile={...p,data:{aiDailyLimit:10}};
 for(const [n,alert] of [[7,null],[8,80],[9,90]]){const r=usageSummary(profile,{integrationUsage:{day:'2026-09-17',counts:{'t1:AI':n}}},{},now);assert.equal(r.alert,alert);assert.equal(r.monthlyLimit,null);}
});
test('teacher preview rejects every write and non-owner access',()=>{
 for(const action of ['mutate','ai-run','notify','account','password','upload','preferences','service-settings','ai-limits'])assert.throws(()=>assertViewAction('admin','t1',action),/read-only/);
 assert.throws(()=>assertViewAction('teacher','other','session'),/Super Admin/);
 for(const action of ['session','file','ai-usage'])assert.doesNotThrow(()=>assertViewAction('admin','t1',action));
});
test('usage ledger and tokens are private; students see safe teacher identity fields',()=>{
 const teacher={id:'t1',role:'teacher',data:{name:'Teacher',bio:'Physics teacher',photoData:'photo',features:{},privateThing:'secret'}},s={id:'s1',role:'student',teacher_id:'t1',data:{batchIds:[]}};
 const result=project(s,{...blank(),aiUsage:[{tokens:99}],aiTrackingSince:'date'},[teacher,s]);
 assert.equal(result.aiUsage,undefined);assert.equal(result.aiTrackingSince,undefined);assert.equal(result.teachers[0].bio,'Physics teacher');assert.equal(result.teachers[0].privateThing,undefined);
});
