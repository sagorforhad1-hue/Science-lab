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
 let blinkAt=2.5,blinkStart=-10,greetUntil=3.5,manualMotion=null,motionStart=0;
 const greet=()=>{greetUntil=elapsed+3.5;};
 host.addEventListener('pointerdown',greet);
 const bones={},rest={},target=new T.Quaternion(),euler=new T.Euler();
 const pointer=ev=>{const r=host.getBoundingClientRect();pointerX=T.MathUtils.clamp((ev.clientX-r.left)/r.width-.5,-.5,.5);pointerY=T.MathUtils.clamp((ev.clientY-r.top)/r.height-.5,-.5,.5);};
 const leave=()=>{pointerX=0;pointerY=0;};
 host.addEventListener('pointermove',pointer);host.addEventListener('pointerleave',leave);
 const ready=new GLTFLoader().register(parser=>new VRMLoaderPlugin(parser)).loadAsync('/models/ask-me.vrm').then(gltf=>{
  const loaded=gltf.userData.vrm;
  if(disposed){VRMUtils.deepDispose(loaded.scene);return;}
  vrm=loaded;VRMUtils.rotateVRM0(vrm);
  // VRM 1 faces +Z. Keep this orientation toward the camera.
  vrm.scene.traverse(node=>{if(node.name==='robo_arm')node.visible=false;});
  scene.add(vrm.scene);
  for(const name of Object.keys(vrm.humanoid.humanBones)){
   const bone=vrm.humanoid.getNormalizedBoneNode(name);
   if(bone){bones[name]=bone;rest[name]=bone.position.clone();}
  }
  pose('leftUpperArm',0,0,-1.28,1);pose('rightUpperArm',0,0,1.28,1);
  vrm.update(0);scene.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(vrm.scene),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
  camera.position.set(center.x,center.y,size.y*2.4);camera.lookAt(center);
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
  const think=state==='thinking',talk=state==='replying',wave=!reduced&&!think&&!talk&&t<greetUntil;
  const action=reduced?'idle':manualMotion||(state==='idle'&&t%18>4&&t%18<10?'walk':'idle');
  const walk=action==='walk',dance=action==='dance',phase=(t-motionStart)*(walk?5:6);
  const idleGesture=!think&&!talk&&!wave&&t%16>10;
  host.dataset.motionState=walk||dance?action:wave?'greeting':state;
  const sway=Math.sin(t*.7)*.07*motion,breath=Math.sin(t*1.8)*.025*motion;
  // Counter-rotation keeps balance: hips, ribcage and head don't move as a rigid block.
  pose('hips',0,Math.sin(t*.55)*.09*motion,sway,k);
  pose('spine',breath,0,-sway*.65,k);
  pose('chest',-.015+breath, talk?Math.sin(t*1.2)*.09*motion:0,-sway*.25,k);
  pose('neck',think?.08:0,0,think?-.07:0,k);
  pose('head',pointerY*.12+(talk?Math.sin(t*2)*.10*motion:0),pointerX*.3+(think?-.12:0),think?-.1:Math.sin(t*.9)*.055*motion,k);
  // Lower arms lead the conversational gesture; upper arms follow with smaller arcs.
  const gesture=(talk||idleGesture)?(Math.sin(t*2.2)+1)*.5*motion:0;
  const armSwing=Math.sin(t*1.4)*.09*motion;
  pose('leftUpperArm',-.08+armSwing,0,-1.27+gesture*.55,k);
  pose('leftLowerArm',-.12-gesture*.4,-.04,-.12-gesture*.12,k);
  pose('leftHand',.04,gesture*.12,-.06,k);
  pose('rightUpperArm',think?-.45:wave?-.25:-.08-armSwing,think?-.35:0,wave?-.25:think?.75:1.27-gesture*.5,k);
  pose('rightLowerArm',wave?-.25:think?-1.55:-.16-gesture*.95,0,wave?-1.1:think?.25:.12,k);
  pose('rightHand',think?-.25:0,think?-.2:gesture*-.15,wave?Math.sin(t*9)*.35:think?-.2:.05,k);
  // Feet remain planted. Small knee/ankle compensation follows the weight shift.
  pose('leftUpperLeg',-.025,0,-sway*.65,k);pose('rightUpperLeg',-.025,0,-sway*.65,k);
  pose('leftLowerLeg',.05,0,0,k);pose('rightLowerLeg',.05,0,0,k);
  pose('leftFoot',-.025,0,sway*.65,k);pose('rightFoot',-.025,0,sway*.65,k);
  for(const side of ['left','right'])for(const finger of ['Index','Middle','Ring','Little']){
   for(const part of ['Proximal','Intermediate','Distal'])
    pose(side+finger+part,0,0,(side==='left'?-1:1)*(wave||talk?.06:.25),k);
  }
  if(bones.hips){
   const base=rest.hips,rise=dance?.035*(1-Math.cos(phase*2)):walk?.018*(1-Math.cos(phase*2)):0;
   bones.hips.position.lerp(new T.Vector3(base.x+(dance?Math.sin(phase)*.065:0),base.y+rise,base.z),k);
  }
  if(walk||dance){
   for(const [side,step] of [['left',Math.sin(phase)],['right',Math.sin(phase+Math.PI)]]){
    pose(side+'UpperLeg',step*(walk?.48:.28),0,dance?step*.12:0,k);
    pose(side+'LowerLeg',Math.max(0,-step)*(walk?.85:.55)+.08,0,0,k);
    pose(side+'Foot',-Math.max(0,-step)*.4,0,0,k);
    pose(side+'UpperArm',-step*(walk?.55:.45),0,(side==='left'?-1:1)*(dance?.7+Math.cos(phase)*.3:1.2),k);
    pose(side+'LowerArm',dance?-.85:-.35,0,(side==='left'?1:-1)*(dance?.3:0),k);
   }
   pose('hips',0,Math.sin(phase)*(dance?.25:.06),dance?Math.sin(phase)*.12:0,k);
   pose('spine',dance?.08:0,Math.sin(phase)*-.08,0,k);
   pose('head',dance?Math.sin(phase*2)*.12:Math.sin(phase)*.035,0,0,k);
   vrm.scene.position.x=T.MathUtils.damp(vrm.scene.position.x,walk?Math.sin((t-motionStart)*.8)*.09:0,6,dt);
  }else vrm.scene.position.x=T.MathUtils.damp(vrm.scene.position.x,0,6,dt);
  if(!reduced&&t>=blinkAt){blinkStart=t;blinkAt=t+3+Math.random()*3;}
  const blink=Math.max(0,1-Math.abs((t-blinkStart-.09)/.09));
  vrm.expressionManager.setValue('blink',blink);
  vrm.expressionManager.setValue('happy',dance?.75:think?.02:wave?.65:talk?.45:.2);
  vrm.expressionManager.setValue('relaxed',think?.22:.08);
  // Text replies have a smile and gestures; no pretend audio/lip-sync.
  vrm.expressionManager.setValue('aa',wave?.12:talk?.08:0);
  vrm.update(dt);renderer.render(scene,camera);
 }
 frame=requestAnimationFrame(animate);
 return {ready,setMotion(next){manualMotion=next;motionStart=elapsed;greetUntil=0;},setState(next){state=next;if(next==='thinking')manualMotion=null;},dispose(){
  if(disposed)return;disposed=true;cancelAnimationFrame(frame);
  host.removeEventListener('pointerdown',greet);
  host.removeEventListener('pointermove',pointer);host.removeEventListener('pointerleave',leave);
  if(vrm)VRMUtils.deepDispose(vrm.scene);
  renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();
 }};
}

