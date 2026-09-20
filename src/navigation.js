/* Small, safe navigation layer shared by real and demo workspaces. */
const scienceLabRender=render;
render=function(){
 scienceLabRender();
 const crumb=document.querySelector('.breadcrumb');
 if(!crumb||document.querySelector('.back-nav'))return;
 const back=document.createElement('button');
 back.type='button';back.className='icon-button back-nav';back.dataset.action='back';
 back.setAttribute('aria-label',bilingual('Back','পেছনে'));back.title=bilingual('Back','পেছনে');
 back.innerHTML=icon('arrow');
 crumb.prepend(back);
};
const scienceLabFeatureAction=featureAction;
featureAction=async function(action){
 if(action==='back'){
  if(session?.impersonating){await scienceLabFeatureAction('return-admin');return;}
  if(history.length>1){history.back();return;}
  go('dashboard');return;
 }
 return scienceLabFeatureAction(action);
};
