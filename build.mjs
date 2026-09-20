import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {buildClient} from './tools/build-client.mjs';
// Recreate deployable assets even when the generated dist directory is absent.
await fs.mkdir('dist', {recursive:true});
await fs.cp('public', 'dist', {recursive:true});
let core=await fs.readFile('src/core.js','utf8');
core=core.replace("function renderPage(){return dashboard();}","function renderPage(){return renderFeaturePage();}")
.replace('function bindPage(){}','function bindPage(){bindFeatures();}')
.replace("else if(a.startsWith('go:'))go(a.slice(3));}","else if(a.startsWith('go:'))go(a.slice(3));else featureAction(a);}")
.replace(/\nrender\(\);\s*$/,'');
await fs.writeFile('dist/app.js',"import * as cloud from './cloud.js';\nimport {putFile,getFile,getAllFiles,clearFiles,passwordHash} from './storage.js';\n"+core+'\n'+await fs.readFile('src/features.js','utf8')+'\n'+await fs.readFile('src/auth-ui.js','utf8')+'\n'+await fs.readFile('src/connected-ui.js','utf8')+'\n'+await fs.readFile('src/interactions.js','utf8')+'\n'+await fs.readFile('src/workspace-upgrades.js','utf8')+'\n'+await fs.readFile('src/navigation.js','utf8')+'\nboot();\n');
await buildClient('src/cloud.js','dist/cloud.js');
await buildClient('src/push.js','dist/push.js');
await buildClient('src/ask-me-model.js','dist/ask-me-model.js');
await fs.writeFile('dist/app.js',(await fs.readFile('dist/app.js','utf8')).replace(/\nboot\(\);\s*$/,'')+'\n'+await fs.readFile('src/ask-me.js','utf8')+'\nboot();\n');
console.log('Built Science Lab local app.');
