// Keep bundler reads within the workspace. This avoids native directory traversal
// into Windows user-profile ancestors when running under a filesystem sandbox.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
const root=fileURLToPath(new URL('../',import.meta.url));
const nodeRoot=path.join(root,'node_modules');
export async function buildClient(input,output){
 const entry=path.resolve(input);
 const plugin={name:'workspace-files',setup(b){
  b.onResolve({filter:/.*/},async args=>{
   if(args.path==='science-lab-client')return {path:entry,namespace:'workspace'};
   if(/^(node:|ws$)/.test(args.path))return {path:args.path,external:true};
   const parent=args.importer||entry;
   let resolved;
   if(args.path.startsWith('.')){
    const candidate=path.resolve(path.dirname(parent),args.path);
    for(const option of [candidate,candidate+'.js',candidate+'.mjs',path.join(candidate,'index.js')]){try{if((await fs.stat(option)).isFile()){resolved=option;break;}}catch{}}
   }else{
    const name=args.path.startsWith('@')?args.path.split('/').slice(0,2).join('/'):args.path.split('/')[0];
    const pkgPath=path.join(nodeRoot,name,'package.json'),pkg=JSON.parse(await fs.readFile(pkgPath,'utf8'));
    const suffix=args.path.slice(name.length);
    if(!suffix)resolved=path.resolve(path.dirname(pkgPath),typeof pkg.browser==='string'?pkg.browser:pkg.module||pkg.main||'index.js');
    else resolved=createRequire(parent).resolve(args.path);
   }
   if(!resolved)throw Error('Cannot resolve '+args.path);
   const allowed=resolved===entry||resolved.startsWith(nodeRoot+path.sep)||resolved.startsWith(path.dirname(entry)+path.sep);
   if(!allowed)throw Error('Build dependency outside workspace: '+args.path);
   return {path:resolved,namespace:'workspace'};
  });
  b.onLoad({filter:/.*/,namespace:'workspace'},async args=>({contents:await fs.readFile(args.path,'utf8'),loader:args.path.endsWith('.json')?'json':'js'}));
 }};
 const result=await build({entryPoints:['science-lab-client'],bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,write:false,tsconfigRaw:{},plugins:[plugin]});
 await fs.writeFile(output,result.outputFiles[0].contents);
}
