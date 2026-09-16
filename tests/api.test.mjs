import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/app.js';
test('public config contains no server secret, and anonymous HTTP requests cannot reach data',async()=>{
 const keys=['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','SUPABASE_SERVICE_ROLE_KEY'];
 const previous=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 process.env.SUPABASE_URL='https://example.test';
 process.env.SUPABASE_PUBLISHABLE_KEY='public-test-value';
 process.env.SUPABASE_SERVICE_ROLE_KEY='server-test-value';
 const original=global.fetch;
 global.fetch=()=>{throw Error('Network calls are forbidden in this test');};
 const invoke=async action=>{const res={statusCode:200,setHeader(){},status(n){this.statusCode=n;return this;},json(body){this.body=body;}};await handler({url:'/api/app?action='+action,headers:{},method:'GET'},res);return res;};
 try{
  const config=await invoke('config');assert.equal(config.statusCode,200);assert.equal(config.body.key,'public-test-value');assert.ok(!JSON.stringify(config.body).includes('server-test-value'));
  const denied=await invoke('session');assert.equal(denied.statusCode,401);assert.ok(!denied.body.db);
  process.env.SUPABASE_PUBLISHABLE_KEY='sb_secret_test_value';
  assert.equal((await invoke('config')).statusCode,503);
 }finally{global.fetch=original;for(const key of keys){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}}
});
