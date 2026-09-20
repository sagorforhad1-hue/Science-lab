// A non-modal, account-scoped conversation. Closing it disposes the WebGL scene.
let askMeCleanup=null;
async function openAskMe(){
 if(!session||!allowed('ai')||session.impersonating)return;
 if(askMeCleanup){askMeCleanup();return;}
 const owner=currentUser(),panel=document.createElement('section');panel.className='ask-me-panel';panel.setAttribute('aria-label','Ask Me');
 panel.innerHTML='<div class="ask-me-character" aria-busy="true"></div><a class="ask-me-credit" href="https://github.com/vrm-c/vrm-specification/tree/master/samples/Seed-san" target="_blank" rel="noopener noreferrer">Seed-san © VirtualCast</a><div class="ask-me-chat"><header><strong>Ask Me</strong><button type="button" class="icon-button ask-me-close" aria-label="'+e('Close')+'">'+icon('close')+'</button></header><p class="ask-me-status" role="status">'+bilingual('Ask a question. I’m listening.','প্রশ্ন করো, আমি শুনছি।')+'</p><div class="ask-me-messages" role="log" aria-live="polite"></div><form><label class="sr-only" for="ask-me-input">'+bilingual('Message','মেসেজ')+'</label><textarea id="ask-me-input" required maxlength="3000" rows="2" placeholder="'+bilingual('Write a message…','মেসেজ লিখুন…')+'"></textarea><button class="btn primary" type="submit">'+bilingual('Send','পাঠাও')+'</button></form></div>';
 document.body.append(panel);let model,closed=false,replyTimer;const messages=[],feed=panel.querySelector('[role=log]'),status=panel.querySelector('[role=status]'),form=panel.querySelector('form');
 const cleanup=()=>{closed=true;clearTimeout(replyTimer);model?.dispose();panel.remove();observer.disconnect();document.removeEventListener('keydown',escape);askMeCleanup=null;$('#chatbot-launch')?.focus();};
 const escape=e=>{if(e.key==='Escape')cleanup();};
 const observer=new MutationObserver(()=>{if(!session||currentUser()!==owner||!allowed('ai')||session.impersonating)cleanup();});observer.observe($('#app'),{childList:true,subtree:true});
 askMeCleanup=cleanup;panel.querySelector('.ask-me-close').onclick=cleanup;document.addEventListener('keydown',escape);
 function bubble(text,mine=false){const p=document.createElement('p');p.className='ask-me-bubble'+(mine?' mine':'');p.textContent=text;feed.append(p);feed.scrollTop=feed.scrollHeight;return p;}
 form.onsubmit=async ev=>{
  ev.preventDefault();const input=form.querySelector('textarea'),button=form.querySelector('button'),prompt=input.value.trim();if(!prompt||button.disabled)return;
  clearTimeout(replyTimer);bubble(prompt,true);input.value='';button.disabled=true;model?.setState('thinking');status.textContent=bilingual('Thinking…','ভাবছি…');
  try{
   let text;if(session.demo)text=bilingual('Demo mode: sign in to your real account for an AI reply.','ডেমো মোড: AI-এর উত্তর পেতে আসল অ্যাকাউন্টে লগইন করো।');
   else{await cloud.flush();const result=await cloud.request('ai-run',{tool:isAdmin()?'support':'tutor',language:db.settings.language,prompt:('Conversation so far:\n'+messages.slice(-6).map(m=>m.role+': '+m.text).join('\n')+'\nCurrent question: '+prompt).slice(-12000)});text=result.text;}
   if(closed)return;messages.push({role:'user',text:prompt},{role:'assistant',text});bubble(text);model?.setState('replying');status.textContent=bilingual('Reply ready','উত্তর এসেছে');replyTimer=setTimeout(()=>model?.setState('idle'),3500);
  }catch(err){if(!closed){bubble(err.message);status.textContent=bilingual('Could not get a reply. Try again.','উত্তর আসেনি। আবার চেষ্টা করো।');model?.setState('idle');input.value=prompt;}}
  finally{button.disabled=false;if(!closed)input.focus();}
 };
 form.querySelector('textarea').focus();
 try{const {mountCharacter}=await import('./ask-me-model.js');if(!closed){const host=panel.querySelector('.ask-me-character');model=mountCharacter(host,matchMedia('(prefers-reduced-motion: reduce)').matches||document.body.classList.contains('no-motion'));await model.ready;if(!closed)host.setAttribute('aria-busy','false');}}
 catch{model?.dispose();if(!closed){panel.querySelector('.ask-me-character').setAttribute('aria-busy','false');panel.querySelector('.ask-me-character').textContent=bilingual('3D is unavailable on this device. Chat is still available.','এই ডিভাইসে 3D চলছে না। চ্যাট ব্যবহার করতে পারো।');}}
}
