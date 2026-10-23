import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve('.');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.woff2':'font/woff2','.woff':'font/woff','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.mp4':'video/mp4'};
http.createServer(async(req,res)=>{try{
 let path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(path==='/')path='/index.html';
 if(!(/^\/(assets|fonts|images|dist)\//.test(path)||path==='/index.html'||path==='/favicon.ico')||path.split('/').some(p=>p.startsWith('.')))throw Error();
 const file=resolve(root,'.'+path);if(!file.startsWith(root+sep))throw Error();
 let body=await readFile(file);
 if(path.endsWith('.html'))body=body.toString().replace(/<!-- (?:Top.Mail.Ru counter|Yandex.Metrika counter) -->[\s\S]*?<!-- \/(?:Top.Mail.Ru counter|Yandex.Metrika counter) -->/g,'').replace(/<noscript>[\s\S]*?<\/noscript>/g,'');
 if(path.endsWith('.mp4')&&req.headers.range){const match=/bytes=(\d+)-(\d*)/.exec(req.headers.range);if(!match)throw Error();const start=Number(match[1]),end=match[2]?Math.min(Number(match[2]),body.length-1):body.length-1;if(start>=body.length||end<start){res.writeHead(416,{'Content-Range':`bytes */${body.length}`});res.end();return}res.writeHead(206,{'Content-Type':'video/mp4','Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${body.length}`,'Content-Length':end-start+1});res.end(body.subarray(start,end+1));return}
 res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store','Accept-Ranges':'bytes'});res.end(body);
 }catch{res.writeHead(404);res.end('Not found')}}).listen(Number(process.env.PORT||4177),process.env.HOST||'127.0.0.1',function(){console.log(`http://${this.address().address}:${this.address().port}/`)});
