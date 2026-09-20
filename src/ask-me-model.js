import * as T from 'three';

// Actual three-dimensional meshes attached to independently animated joints.
// No image planes, textures, external models or background scene are used.
export function mountCharacter(host, reduced=false){
 const renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(192,192);renderer.setClearColor(0,0);
 renderer.outputColorSpace=T.SRGBColorSpace;
 host.append(renderer.domElement);renderer.domElement.setAttribute('aria-label','Animated 3D Ask Me character');renderer.domElement.setAttribute('role','img');
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(32,1,.1,40);
 camera.position.set(0,1.8,7.6);camera.lookAt(0,1.55,0);
 scene.add(new T.HemisphereLight(0xeafaff,0x665043,2.3));
 const key=new T.DirectionalLight(0xffe2bf,3);key.position.set(-3,5,4);scene.add(key);
 const rim=new T.DirectionalLight(0x48e8ff,2);rim.position.set(3,3,-2);scene.add(rim);
 const materials=[],geometries=[];
 const material=(color,roughness=.55)=>{const m=new T.MeshStandardMaterial({color,roughness});materials.push(m);return m;};
 const skin=material(0xd99560),hair=material(0x201c29),red=material(0xdb4747),white=material(0xfff5e5),dark=material(0x251b29),teal=material(0x24d5cb),gold=material(0xf4bd54,.32);
 function ellipsoid(parent,mat,x,y,z,sx,sy,sz){const g=new T.SphereGeometry(1,24,16);geometries.push(g);const m=new T.Mesh(g,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;}
 function joint(parent,x,y,z){const j=new T.Bone();j.position.set(x,y,z);parent.add(j);return j;}
 const root=new T.Group();scene.add(root);
 const hips=joint(root,0,1.03,0),torso=joint(hips,0,.23,0);
 ellipsoid(torso,teal,0,.12,0,.33,.43,.23);ellipsoid(hips,red,0,-.06,0,.34,.24,.24);
 ellipsoid(torso,gold,0,.36,.205,.12,.04,.05);
 const head=joint(torso,0,.69,0);
 ellipsoid(head,skin,0,.13,0,.49,.52,.4);
 for(const side of [-1,1]){ellipsoid(head,skin,side*.49,.1,0,.115,.17,.085);ellipsoid(head,red,side*.51,.095,.064,.055,.09,.025);}
 ellipsoid(head,hair,0,.43,-.065,.5,.3,.39);
 for(let i=0;i<7;i++){const x=(i-3)*.12;ellipsoid(head,hair,x,.37+Math.abs(x)*.18,.27,.115,.18,.115);}
 const eyes=[],brows=[];
 for(const side of [-1,1]){
  const eye=joint(head,side*.205,.18,.342);eyes.push(eye);
  ellipsoid(eye,white,0,0,0,.145,.175,.066);ellipsoid(eye,teal,0,-.015,.052,.083,.104,.025);ellipsoid(eye,dark,0,-.015,.075,.047,.065,.012);ellipsoid(eye,white,-.027,.025,.087,.019,.024,.01);
  const brow=ellipsoid(head,hair,side*.205,.395,.36,.15,.035,.04);brow.rotation.z=side*-.1;brows.push(brow);
  ellipsoid(head,red,side*.34,-.04,.304,.07,.035,.025);
 }
 ellipsoid(head,skin,0,.01,.41,.10,.11,.12);
 const mouth=ellipsoid(head,dark,0,-.18,.342,.185,.079,.043);
 ellipsoid(head,white,0,-.151,.378,.143,.027,.018);
 ellipsoid(head,red,0,-.216,.377,.075,.019,.017);
 // A playful curl and three small colored feathers, built from solid geometry.
 for(let i=0;i<3;i++){const feather=ellipsoid(head,[red,gold,teal][i],.24+i*.08,.77+i*.08,-.04,.045,.25,.027);feather.rotation.z=-.25-i*.18;}
 const arms=[],elbows=[],legs=[],knees=[];
 for(const side of [-1,1]){
  const arm=joint(torso,side*.32,.36,0);arms.push(arm);
  ellipsoid(arm,teal,0,-.1,0,.12,.2,.13);
  ellipsoid(arm,skin,0,-.25,0,.084,.20,.084);
  const elbow=joint(arm,0,-.39,0);elbows.push(elbow);ellipsoid(elbow,skin,0,-.12,0,.077,.16,.077);
  ellipsoid(elbow,skin,0,-.29,.01,.105,.12,.07);
  for(let f=0;f<4;f++)ellipsoid(elbow,skin,(f-1.5)*.043,-.395,.01,.025,.065,.027);
  ellipsoid(elbow,skin,-side*.103,-.285,.04,.04,.065,.035);
  const leg=joint(hips,side*.17,-.17,0);legs.push(leg);ellipsoid(leg,skin,0,-.14,0,.115,.2,.12);
  const knee=joint(leg,0,-.33,0);knees.push(knee);ellipsoid(knee,skin,0,-.12,0,.088,.18,.092);ellipsoid(knee,dark,0,-.3,.065,.13,.08,.2);
 }
 let state='idle',frame=0,disposed=false,last=0,started=performance.now(),pointer=0;
 function draw(now){
  if(disposed)return;frame=requestAnimationFrame(draw);if(document.hidden||now-last<32)return;last=now;
  const t=reduced?0:(now-started)/1000,thinking=state==='thinking',replying=state==='replying';
  const walking=!reduced&&state==='idle'&&t%12<4;
  root.position.x=walking?Math.sin(t*1.5)*.3:root.position.x*.9;
  root.position.y=walking?Math.abs(Math.sin(t*7))*.04:Math.sin(t*2)*.015;
  root.rotation.y=walking?Math.cos(t*1.5)*.3:pointer*.18;
  head.rotation.z=thinking?-.18+Math.sin(t*2)*.04:Math.sin(t*1.3)*.035;
  head.rotation.y=thinking?Math.sin(t)*.15:pointer*.2;
  const blink=!reduced&&t%4.1<.16?.08:1;eyes.forEach(e=>e.scale.y=blink);
  brows.forEach((b,i)=>b.rotation.z=(i?1:-1)*(thinking?.3:.1));
  mouth.scale.y=replying?.09+Math.abs(Math.sin(t*9))*.055:thinking?.035:.079;
  arms.forEach((a,i)=>{a.rotation.x=walking?Math.sin(t*7+i*Math.PI)*.5:0;a.rotation.z=i?-.18:.18;elbows[i].rotation.x=0;elbows[i].rotation.z=0;});
  if(thinking){arms[1].rotation.z=-1.05;elbows[1].rotation.z=-1.6;elbows[1].rotation.x=-.3;}
  else if(replying||!reduced&&t%12>9){arms[0].rotation.z=2.3+Math.sin(t*6)*.18;elbows[0].rotation.z=.35+Math.sin(t*7)*.2;}
  legs.forEach((l,i)=>{l.rotation.x=walking?Math.sin(t*7+i*Math.PI)*.45:0;knees[i].rotation.x=walking?Math.max(0,Math.sin(t*7+i*Math.PI))*.45:0;});
  renderer.render(scene,camera);
 }
 const move=e=>{const r=host.getBoundingClientRect();pointer=Math.max(-1,Math.min(1,(e.clientX-r.left)/r.width*2-1));};
 host.addEventListener('pointermove',move);frame=requestAnimationFrame(draw);
 return {setState(value){state=value;},dispose(){disposed=true;cancelAnimationFrame(frame);host.removeEventListener('pointermove',move);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}};
}
