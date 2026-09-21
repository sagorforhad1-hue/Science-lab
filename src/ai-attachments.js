// Attachments are kept in memory and sent only with the user's Send action.
function attachAIComposer(form){
 const box=document.createElement('div');box.className='ai-attachments';
 box.innerHTML='<label class="ai-file-label">'+bilingual('Attach photo or file','ছবি বা ফাইল যুক্ত করো')+'<input type="file" multiple accept="image/jpeg,image/png,image/webp,.txt,.csv,.pdf" aria-label="'+bilingual('Attach photo or file','ছবি বা ফাইল যুক্ত করো')+'"></label><div class="ai-file-list" aria-live="polite"></div><small>'+bilingual('JPG, PNG, WebP, PDF, TXT, CSV · up to 3 files, 4 MB each. Sent to AI when you press Send.','JPG, PNG, WebP, PDF, TXT, CSV · সর্বোচ্চ ৩টি, প্রতিটি ৪ MB। Send চাপলে AI-তে যাবে।')+'</small>';
 form.append(box);let selected=[];const input=box.querySelector('input'),list=box.querySelector('.ai-file-list');
 function draw(){list.replaceChildren();selected.forEach((file,index)=>{const row=document.createElement('div');row.className='ai-file-chip';const name=document.createElement('span');name.textContent=file.name;const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.setAttribute('aria-label',bilingual('Remove ','সরাও ')+file.name);remove.onclick=()=>{selected.splice(index,1);draw();};row.append(name,remove);list.append(row);});}
 input.onchange=()=>{const incoming=[...input.files];input.value='';if(selected.length+incoming.length>3||incoming.some(f=>f.size>4*1048576)){toast(bilingual('Choose up to 3 files, each under 4 MB.','সর্বোচ্চ ৩টি ফাইল দাও, প্রতিটি ৪ MB-এর কম।'),true);return;}selected.push(...incoming);draw();};
 return {clear(){selected=[];draw();},async prepare(){
  const result=[];for(const file of selected){
   if(['image/jpeg','image/png','image/webp'].includes(file.type)){
    const bmp=await createImageBitmap(file),canvas=document.createElement('canvas'),scale=Math.min(1,1280/bmp.width,1280/bmp.height);
    canvas.width=Math.max(1,Math.round(bmp.width*scale));canvas.height=Math.max(1,Math.round(bmp.height*scale));canvas.getContext('2d').drawImage(bmp,0,0,canvas.width,canvas.height);bmp.close();
    let data=canvas.toDataURL('image/jpeg',.72);if(data.length>600000)data=canvas.toDataURL('image/jpeg',.4);
    if(data.length>600000)throw Error(bilingual('This image is too detailed. Crop or resize it first.','ছবিটি crop বা ছোট করে দাও।'));
    result.push({name:file.name,kind:'image',data});
   }else if(/\.pdf$/i.test(file.name)){
    const {readPDF}=await import('./ai-pdf.js');result.push({name:file.name,kind:'text',text:await readPDF(file)});
   }else if(/\.(txt|csv)$/i.test(file.name)){
    const text=await file.text();if(text.length>16000)throw Error(bilingual('Text files may contain at most 16,000 characters.','Text file সর্বোচ্চ ১৬,০০০ অক্ষর হতে পারবে।'));result.push({name:file.name,kind:'text',text});
   }else throw Error(bilingual('Supported: JPG, PNG, WebP, PDF, TXT and CSV.','JPG, PNG, WebP, PDF, TXT এবং CSV দেওয়া যাবে।'));
  }return result;
 }};
}
