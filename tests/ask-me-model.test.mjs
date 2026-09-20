import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('shipped Ask Me is a self-contained skinned humanoid with facial expressions and redistribution credit',()=>{
 const bytes=fs.readFileSync(new URL('../public/models/ask-me.vrm',import.meta.url));
 assert.equal(bytes.toString('ascii',0,4),'glTF');
 assert.equal(bytes.readUInt32LE(8),bytes.length);
 const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));
 const vrm=json.extensions.VRMC_vrm;
 for(const name of ['hips','spine','head','leftUpperArm','leftLowerArm','rightUpperArm','rightLowerArm','leftUpperLeg','rightUpperLeg','leftFoot','rightFoot'])
  assert.ok(Number.isInteger(vrm.humanoid.humanBones[name]?.node),name);
 assert.ok(json.skins.length>0);
 assert.ok(json.meshes.some(m=>m.primitives.some(p=>p.attributes.JOINTS_0!==undefined&&p.attributes.WEIGHTS_0!==undefined)));
 for(const name of ['blink','happy','relaxed','aa'])assert.ok(vrm.expressions.preset[name],name);
 assert.ok(json.buffers.every(b=>!b.uri),'no third-party texture/model fetches');
 assert.ok(json.images.every(i=>i.bufferView!==undefined),'embedded textures');
 assert.equal(vrm.meta.allowRedistribution,true);
 const credits=fs.readFileSync(new URL('../public/models/SOURCE.md',import.meta.url),'utf8');
 for(const author of vrm.meta.authors)assert.ok(credits.includes(author));
});
