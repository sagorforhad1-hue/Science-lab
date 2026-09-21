import test from 'node:test';
import assert from 'node:assert/strict';
import {saveProfile} from '../lib/profile-save.js';
import {checked} from '../lib/api-errors.js';
import {aiAttachments} from '../lib/ai-input.js';
test('large profile compare-and-swap sends JSON via RPC body',async()=>{
 const data={photoData:'x'.repeat(170000)};let call;
 const admin={rpc:async(name,body)=>{call={name,body};return {data:[{id:'p'}]};}};
 await saveProfile(admin,{id:'p',data,active:true},{...data,name:'Updated'});
 assert.equal(call.name,'sl_update_profile');assert.equal(call.body.expected_data,data);assert.equal(call.body.replacement_data.name,'Updated');
});
test('database errors never expose upstream HTML and missing SQL is actionable',()=>{
 assert.throws(()=>checked({error:{message:'<html>private upstream response</html>'}}),e=>!e.message.includes('html')&&!e.message.includes('private'));
 assert.throws(()=>checked({error:{code:'PGRST202'}}),/profile-save-fix.sql/);
});
test('AI attachments reject URLs, SVG, fake images and excessive text',()=>{
 for(const data of ['https://example.com/private','data:image/svg+xml;base64,PHN2Zz4=','data:image/png;base64,YWJj'])assert.throws(()=>aiAttachments([{name:'image',kind:'image',data}]));
 assert.throws(()=>aiAttachments([{name:'text',kind:'text',text:'x'.repeat(16001)}]));
 assert.deepEqual(aiAttachments([{name:'notes.txt',kind:'text',text:'Newton'}]),[{name:'notes.txt',kind:'text',text:'Newton'}]);
});
