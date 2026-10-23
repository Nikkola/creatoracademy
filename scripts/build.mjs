import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
export const base='https://nikkola.github.io/creatoracademy/';
export const cdnBase='https://cdn.jsdelivr.net/gh/Nikkola/creatoracademy@v3.5.8/';
function publicAsset(path){
 const original=path;
 if(/^(?:data:|blob:)/i.test(path))return path;
 if(/^https?:\/\//i.test(path)){
  const known=path.match(/^https?:\/\/(?:nikkola\.github\.io\/creatoracademy\/|cdn\.jsdelivr\.net\/gh\/Nikkola\/creatoracademy@[^/]+\/)(.*)$/i);
  if(!known)return path;path=known[1];
 }
 path=path.replace(/^\//,'');
 if(!/^(?:assets|fonts|images)\//.test(path))return original;
 const overrides=[['assets/student-reviews-2026-10-19/','b1daab4'],['assets/student-works-ukhlov-2026-10-16/','2c356a3'],['assets/student-works-2026-10-16-v2/','770033f']];
 for(const [prefix,commit] of overrides)if(path.startsWith(prefix))return `https://cdn.jsdelivr.net/gh/Nikkola/creatoracademy@${commit}/${path}`;
 return cdnBase+path;
}
export async function build(){
 const localPython=join(homedir(),'.local','bin','python3.12');
 execFileSync(process.env.PYTHON||(existsSync(localPython)?localPython:'python3'),['scripts/story_content.py'],{stdio:'inherit'});
 let html=await readFile('index.html','utf8');
 for(const filename of ['carousel.css','site.css','editorial.css','refinements.css','layout.css','typography.css']){
  let css=await readFile(`assets/site-editorial-v4/${filename}`,'utf8');
  css=css.replace(/url\((['"]?)([^)'"\s]+)\1\)/g,(_,quote,path)=>{
   const resolved=/^(?:https?:\/\/|data:|blob:)/i.test(path)?path:path.startsWith('/assets/')?path.slice(1):path.startsWith('../')?'assets/'+path.slice(3):'assets/site-editorial-v4/'+path;
   return `url("${publicAsset(resolved)}")`;
  });
  html=html.replace(new RegExp(`<link rel="stylesheet" href="/?assets/site-editorial-v4/${filename}">`),()=>`<style>${css}</style>`);
 }
 for(const filename of ['vendors.js','legacy-interactions.js','site.js']){
  const js=await readFile(`assets/site-editorial-v4/${filename}`,'utf8');
  html=html.replace(new RegExp(`<script src="/?assets/site-editorial-v4/${filename}"></script>`),()=>`<script>${js.replaceAll('</script','<\\/script')}</script>`);
 }
 html=html.replace(/\b(src|href|poster|data-local-video|data-src|data-portfolio-src)="([^"#]+)"/g,(_,attr,path)=>`${attr}="${publicAsset(path)}"`);
 if(/(?:localhost|127\.0\.0\.1|file:\/\/|\.\.\/creatoracademy)/.test(html))throw Error('Local reference in SaleBot artifact');
 await mkdir('dist',{recursive:true});await writeFile('dist/salebot.html',html);
 console.log('Built dist/salebot.html: inline CSS/JS; existing public image/font paths.');
}
if(process.argv[1]?.endsWith('/build.mjs'))await build();
