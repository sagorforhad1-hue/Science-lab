import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
try{process.loadEnvFile('.env.local');}catch{}
const {default:api}=await import('./api/app.js');
const root=path.resolve('dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json'};
http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/api/app'){
   let bytes=0,chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>2000000){res.writeHead(413).end();return;}chunks.push(chunk);}
   try{req.body=bytes?JSON.parse(Buffer.concat(chunks).toString()):{};}catch{res.writeHead(400).end('Invalid JSON');return;}
   res.status=code=>{res.statusCode=code;return res;};res.json=value=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value));};
   return await api(req,res);
  }
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data);
 }catch{res.writeHead(404).end('Not found');}
}).listen(Number(process.env.PORT)||5173,'127.0.0.1',()=>console.log('Science Lab: http://127.0.0.1:'+(process.env.PORT||5173)));
