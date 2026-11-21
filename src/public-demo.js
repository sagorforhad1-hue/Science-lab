// Public showroom: only isolated browser data; never restore a cloud account.
function showroomReport(tool,prompt=''){
 return demoReport(db,{tool,prompt,language:db.settings.language,teacherId:isAdmin()?null:session.teacherId,studentId:isStudent()?session.id:null});
}
boot=async function(){
 globalThis.scienceLabPersist=null;globalThis.scienceLabFileMode=false;
 if(!db.showroomInitialized){for(const teacher of db.teachers)Object.assign(teacher.features,{ai:true,studentAI:true,messages:true,guardians:true,online:true});db.showroomInitialized=true;persist(db);}
 const role=sessionStorage.getItem('sl-showroom-role')||'teacher';
 const t=db.teachers.find(t=>t.status!=='Suspended');
 const s=db.students.find(s=>s.status==='Active'&&s.teacherId===t?.id);
 setSession({role:role==='student'&&s?'student':role==='admin'?'admin':'teacher',id:role==='admin'?'admin':role==='student'&&s?s.id:t?.id,teacherId:role==='admin'?null:t?.id,demo:true});
};
renderLogin=function(){boot();};
const showroomRender=render;
render=function(){showroomRender();if(!session)return;
 sessionStorage.setItem('sl-showroom-role',session.role);
 const banner=$('.demo-banner');if(banner)banner.innerHTML='<strong>'+bilingual('Interactive demo','ব্যবহারযোগ্য ডেমো')+'</strong> · '+bilingual('Sample records stay in your browser. Reports are simulated.','নমুনা তথ্য এই ব্রাউজারে থাকে। রিপোর্ট স্থানীয়ভাবে তৈরি।')+'<div class="demo-roles">'+btn('Teacher','demo:teacher')+btn('Student','demo:student')+btn('Super Admin','demo:admin')+btn(bilingual('How to use','ব্যবহার নির্দেশনা'),'showroom-help')+btn(bilingual('Reset demo','ডেমো রিসেট'),'showroom-reset')+'</div>';
};
const showroomAction=featureAction;
featureAction=async function(action){
 if(action==='logout'){switchWorkspace();return;}
 if(action==='showroom-reset'){if(!confirm(bilingual('Reset all demo records in this browser?','এই ব্রাউজারের সব ডেমো তথ্য রিসেট করবে?')))return;askMeCleanup?.();db=seedDemo();persist(db);closeModal();await boot();return;}
 if(action==='showroom-help'){modal(bilingual('Try a teaching day','একদিনের কোচিং চালিয়ে দেখো'),'<p class="detail-text">'+esc(bilingual('1. Teacher: add a student and assign a batch.\n2. Mark attendance and enter exam marks.\n3. Open AI Studio → Learning insights or Guardian summary. Reports reflect your changes.\n4. Try assignments, fees, notices and inbox.\n5. Switch to Student to see the student experience; Super Admin shows management controls.\n6. Reset demo restores the sample records. Changes are private to this browser. Email, push and WhatsApp delivery are simulated; AI replies use local templates.','১. Teacher হিসেবে শিক্ষার্থী ও ব্যাচ যোগ করো।\n২. হাজিরা ও পরীক্ষার নম্বর দাও।\n৩. AI Studio থেকে Learning insights বা Guardian summary তৈরি করো—বদলানো তথ্য রিপোর্টে আসবে।\n৪. কাজ, ফি, নোটিশ ও ইনবক্স ব্যবহার করো।\n৫. Student ও Super Admin বদলে তাদের কাজ দেখো।\n৬. Reset demo নমুনা তথ্য ফিরিয়ে আনে। তথ্য নিজের ব্রাউজারে থাকে। Email, push, WhatsApp পাঠানো ও AI উত্তর এখানে simulation।'))+'</p>',btn('Close','close'),true);return;}
 return showroomAction(action);
};
