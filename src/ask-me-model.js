import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {VRMLoaderPlugin,VRMUtils} from '@pixiv/three-vrm';

// Artist-authored skinned VRM. Poses are procedural, not motion capture.
export function mountCharacter(host,reduced=false){
 const renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(192,192);renderer.setClearColor(0,0);
 renderer.outputColorSpace=T.SRGBColorSpace;host.append(renderer.domElement);
 renderer.domElement.setAttribute('aria-label','Animated anime 3D Ask Me character');
 renderer.domElement.setAttribute('role','img');
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(30,1,.01,30);
 scene.add(new T.HemisphereLight(0xffffff,0xb1b5c9,2));
 const light=new T.DirectionalLight(0xffffff,2.2);light.position.set(-2,4,5);scene.add(light);
 let vrm,disposed=false,frame,state='idle',elapsed=0,last=performance.now(),pointerX=0,pointerY=0;
 let blinkAt=2.5,blinkStart=-10;
 const bones={},rest={},target=new T.Quaternion(),euler=new T.Euler();
 const pointer=ev=>{const r=host.getBoundingClientRect();pointerX=T.MathUtils.clamp((ev.clientX-r.left)/r.width-.5,-.5,.5);pointerY=T.MathUtils.clamp((ev.clientY-r.top)/r.height-.5,-.5,.5);};
 const leave=()=>{pointerX=0;pointerY=0;};
 host.addEventListener('pointermove',pointer);host.addEventListener('pointerleave',leave);
 const ready=new GLTFLoader().register(parser=>new VRMLoaderPlugin(parser)).loadAsync('/models/ask-me.vrm').then(gltf=>{
  const loaded=gltf.userData.vrm;
  if(disposed){VRMUtils.deepDispose(loaded.scene);return;}
  vrm=loaded;VRMUtils.rotateVRM0(vrm);
  // VRM 1 faces +Z. Keep this orientation toward the camera.
  scene.add(vrm.scene);
  for(const name of Object.keys(vrm.humanoid.humanBones)){
   const bone=vrm.humanoid.getNormalizedBoneNode(name);
   if(bone){bones[name]=bone;rest[name]=bone.position.clone();}
  }
  pose('leftUpperArm',0,0,-1.28,1);pose('rightUpperArm',0,0,1.28,1);
  vrm.update(0);scene.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(vrm.scene),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
  camera.position.set(center.x,center.y,Math.max(size.y,size.x)*2.35);camera.lookAt(center);
  host.setAttribute('data-model-ready','true');
 });
 function pose(name,x,y,z,blend){
  if(!bones[name])return;euler.set(x,y,z);target.setFromEuler(euler);bones[name].quaternion.slerp(target,blend);
 }
 function animate(now){
  if(disposed)return;frame=requestAnimationFrame(animate);
  const dt=Math.min((now-last)/1000,.05);last=now;
  if(document.hidden||!vrm)return;
  elapsed+=dt;const t=elapsed,k=1-Math.exp(-dt*6),motion=reduced?0:1;
  const think=state==='thinking',talk=state==='replying';
  const sway=Math.sin(t*.7)*.025*motion,breath=Math.sin(t*1.8)*.009*motion;
  // Counter-rotation keeps balance: hips, ribcage and head don't move as a rigid block.
  pose('hips',0,Math.sin(t*.55)*.025*motion,sway,k);
  pose('spine',breath,0,-sway*.65,k);
  pose('chest',-.015+breath, talk?Math.sin(t*1.2)*.035*motion:0,-sway*.25,k);
  pose('neck',think?.08:0,0,think?-.07:0,k);
  pose('head',pointerY*.12+(talk?Math.sin(t*2)*.025*motion:0),pointerX*.3+(think?-.12:0),think?-.1:Math.sin(t*.9)*.015*motion,k);
  // Lower arms lead the conversational gesture; upper arms follow with smaller arcs.
  const gesture=talk?(Math.sin(t*2.2)+1)*.5*motion:0;
  pose('leftUpperArm',-.08,0,-1.27+gesture*.26,k);
  pose('leftLowerArm',-.12-gesture*.4,-.04,-.12-gesture*.12,k);
  pose('leftHand',.04,gesture*.12,-.06,k);
  pose('rightUpperArm',think?-.45:-.08,think?-.35:0,think?.75:1.27-gesture*.18,k);
  pose('rightLowerArm',think?-1.55:-.16-gesture*.65,0,think?.25:.12,k);
  pose('rightHand',think?-.25:0,think?-.2:gesture*-.15,think?-.2:.05,k);
  // Feet remain planted. Small knee/ankle compensation follows the weight shift.
  pose('leftUpperLeg',-.025,0,-sway*.65,k);pose('rightUpperLeg',-.025,0,-sway*.65,k);
  pose('leftLowerLeg',.05,0,0,k);pose('rightLowerLeg',.05,0,0,k);
  pose('leftFoot',-.025,0,sway*.65,k);pose('rightFoot',-.025,0,sway*.65,k);
  for(const side of ['left','right'])for(const finger of ['Index','Middle','Ring','Little']){
   for(const part of ['Proximal','Intermediate','Distal'])
    pose(side+finger+part,0,0,(side==='left'?-1:1)*(talk?.12:.25),k);
  }
  if(bones.hips)bones.hips.position.copy(rest.hips);
  if(!reduced&&t>=blinkAt){blinkStart=t;blinkAt=t+3+Math.random()*3;}
  const blink=Math.max(0,1-Math.abs((t-blinkStart-.09)/.09));
  vrm.expressionManager.setValue('blink',blink);
  vrm.expressionManager.setValue('happy',think?.03:.18);
  vrm.expressionManager.setValue('relaxed',think?.22:.08);
  // Text replies have a smile and gestures; no pretend audio/lip-sync.
  vrm.expressionManager.setValue('aa',talk?.025:0);
  vrm.update(dt);renderer.render(scene,camera);
 }
 frame=requestAnimationFrame(animate);
 return {ready,setState(next){state=next;},dispose(){
  if(disposed)return;disposed=true;cancelAnimationFrame(frame);
  host.removeEventListener('pointermove',pointer);host.removeEventListener('pointerleave',leave);
  if(vrm)VRMUtils.deepDispose(vrm.scene);
  renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();
 }};
}
