import {requireThat} from './domain.js';
export function aiAttachments(value=[]){
 requireThat(Array.isArray(value)&&value.length<=3,'Attach up to 3 files.',400);
 let size=0;
 return value.map(file=>{
  requireThat(file&&typeof file.name==='string'&&file.name.length<=200,'Invalid attachment name.',400);
  if(file.kind==='text'){
   requireThat(typeof file.text==='string'&&file.text.length<=16000,'Attachment text is too long.',400);size+=file.text.length;
   requireThat(size<=1800000,'Attachments are too large.',413);return {name:file.name,kind:'text',text:file.text};
  }
  requireThat(file.kind==='image'&&typeof file.data==='string'&&file.data.length<=600000&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(file.data),'Use a valid JPG, PNG or WebP image.',400);
  const bytes=Buffer.from(file.data.split(',')[1],'base64');
  const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255,png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),webp=bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
  requireThat(jpeg||png||webp,'The file is not a supported image.',400);size+=file.data.length;requireThat(size<=1800000,'Attachments are too large.',413);
  return {name:file.name,kind:'image',data:file.data};
 });
}
