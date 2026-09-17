
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import {normalizePrivateKey} from '../lib/providers.js';
test('Firebase PEM parser supports escaped newlines, quotes and service account JSON',()=>{
 const pem='-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----';
 for(const value of [pem,pem.replaceAll('\n','\\n'),JSON.stringify(pem),JSON.stringify({private_key:pem}),"'"+pem+"'"])assert.equal(normalizePrivateKey(value),pem);
});
test('password change reauthenticates before requesting app session',async()=>{
 const source=(await fs.readFile(new URL('../src/cloud.js',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');
 let token='old',changed=false,logged=false;const events=[];
 const auth={getSession:async()=>({data:{session:{access_token:token,user:{email:'test@example.com'}}}}),onAuthStateChange(){},signInWithPassword:async data=>{assert.equal(data.password,'NewPassword123');assert.ok(changed);token='new';logged=true;return {error:null};}};
 const ctx=vm.createContext({createClient:()=>({auth}),window:{addEventListener(){}},sessionStorage:{removeItem(){}},history:{replaceState(){}},location:{pathname:'/'},fetch:async(url,options)=>{
  events.push(url);
  if(url.endsWith('config'))return {ok:true,json:async()=>({url:'https://example.supabase.co',key:'public'})};
  if(url.endsWith('password')){changed=true;return {ok:true,json:async()=>({ok:true})};}
  assert.ok(logged);assert.equal(options.headers.Authorization,'Bearer new');return {ok:true,json:async()=>({profile:{role:'teacher'}})};
 }});
 vm.runInContext(source,ctx);const result=await vm.runInContext("password('NewPassword123')",ctx);assert.equal(result.profile.role,'teacher');assert.equal(events.at(-1),'/api/app?action=session');
});
