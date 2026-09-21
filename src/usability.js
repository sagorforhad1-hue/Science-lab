// Management forms save explicitly so failures never look like successful edits.
editIdentity=function(id){
 const entity=db.teachers.some(x=>x.id===id)?'teachers':'students',record=db[entity].find(x=>x.id===id);
 if(!record||session.impersonating)return;
 if(entity==='teachers'&&!isAdmin()&&id!==session.id)return;
 if(entity==='students'&&isStudent()&&id!==session.id)return;
 const teacherProfile=entity==='teachers',keys=teacherProfile?['photoData','logoData','coverData']:['photoData',...(!isStudent()?['guardianPhotoData']:[])];
 modal(bilingual('Profile & identity','প্রোফাইল ও পরিচিতি'),'<form id="identity-form"><div class="form-grid">'+field('name','Name','text',record.name,[],true)+(teacherProfile?field('coaching','Coaching name','text',record.coaching||'')+field('subject',bilingual('Subject','বিষয়'),'text',record.subject||''):'')+field('bio',bilingual('Bio','পরিচিতি'),'textarea',record.bio||'',[],false,true)+(isStudent()?field('interests',bilingual('Interests','আগ্রহ'),'text',record.interests||''):'')+keys.map(k=>'<label class="field"><span>'+({photoData:'Profile photo',logoData:'Coaching logo',coverData:'Cover photo',guardianPhotoData:'Guardian photo'}[k])+'</span><input type="file" name="'+k+'" accept="image/jpeg,image/png,image/webp"></label>'+check('remove_'+k,bilingual('Remove saved image','সংরক্ষিত ছবি সরাও'))).join('')+(teacherProfile?check('leaderboard',bilingual('Show performance leaderboard','ফলাফলের তালিকা দেখাও'),record.leaderboard):'')+'</div><p class="hint">'+bilingual('Photos are resized automatically. Maximum source size: 8 MB.','ছবি নিজে থেকেই ছোট হবে। মূল ছবি সর্বোচ্চ ৮ MB।')+'</p><p class="error" id="identity-error" role="alert"></p><button type="submit" class="btn primary">'+e('Save')+'</button></form>',btn('Close','close'));
 const form=$('#identity-form'),error=$('#identity-error');form.onsubmit=async ev=>{ev.preventDefault();const button=form.querySelector('[type=submit]');if(button.disabled)return;button.disabled=true;
  try{const after=structuredClone(record);for(const k of ['name','coaching','subject','bio','interests'])if(form.elements[k])after[k]=form.elements[k].value.trim();if(after.name.length<2||after.name.length>100)throw Error(bilingual('Name must be 2–100 characters.','নাম ২–১০০ অক্ষরের হতে হবে।'));if(teacherProfile)after.leaderboard=form.elements.leaderboard.checked;
   for(const k of keys){if(form.elements['remove_'+k].checked)after[k]='';const image=await readProfileImage(form.elements[k]);if(image)after[k]=image;}
   if(session.demo){Object.assign(record,after);persist(db);}else{await cloud.flush();await cloud.request('mutate',{ops:[{entity,id,before:record,after}]});await refreshCloud();}
   closeModal();render();toast(bilingual('Profile saved.','প্রোফাইল সংরক্ষিত হয়েছে।'));
  }catch(err){if(form.isConnected)error.textContent=err.message;}finally{button.disabled=false;}
 };
};
const usabilityRender=render;
render=function(){usabilityRender();if(session?.impersonating){$('.impersonation')?.insertAdjacentHTML('beforeend',btn(bilingual('Exit & edit teacher profile','বের হয়ে teacher-এর profile বদলাও'),'edit-viewed-teacher','small'));}};
// This capture handler exits read-only preview before opening the admin edit form.
document.addEventListener('click',async ev=>{const target=ev.target.closest('[data-action="edit-viewed-teacher"]');if(!target||!session?.impersonating)return;ev.preventDefault();const id=session.id;await featureAction('return-admin');if(isAdmin())editIdentity(id);},true);
const baseExportEntity=exportEntity;
exportEntity=function(entity){if(entity!=='students')return baseExportEntity(entity);const rows=isStudent()?[me()]:filtered(own('students'));download('students-'+today()+'.csv',csv([['ID','Name','Grade','Batches','Status'],...rows.map(s=>[s.studentId,s.name,s.grade,s.batchIds.map(batchName).join('; '),s.status])]),'text/csv;charset=utf-8');};
