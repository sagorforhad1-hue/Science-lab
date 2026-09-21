import {getDocument,GlobalWorkerOptions} from 'pdfjs-dist/legacy/build/pdf.mjs';
GlobalWorkerOptions.workerSrc='/ai-pdf-worker.js';
export async function readPDF(file){
 const task=getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false});
 try{const doc=await task.promise;if(doc.numPages>20)throw Error('PDF limit: 20 pages.');let text='';
  for(let i=1;i<=doc.numPages;i++){const content=await(await doc.getPage(i)).getTextContent();text+='\n'+content.items.map(x=>x.str||'').join(' ');if(text.length>16000)throw Error('PDF text is too long. Upload fewer pages (16,000 characters maximum).');}
  if(!text.trim())throw Error('This PDF has no readable text. Upload screenshots of the relevant pages.');return text;
 }finally{await task.destroy();}
}
