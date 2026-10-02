import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import sharp from 'sharp';
export const base = 'https://Nikkola.github.io/creatoracademy/';
export const cdnBase = 'https://cdn.jsdelivr.net/gh/Nikkola/creatoracademy@v3.5.4/';
export async function build() {
  let css = await readFile('index.css', 'utf8');
  const imports = [...css.matchAll(/@import url\((css\/[^)]+)\);/g)];
  let sections = '';
  for (const [statement, path] of imports) {
    sections += (await readFile(path, 'utf8')).replaceAll('../images/', '../../images/');
    css = css.replace(statement, '');
  }
  const target = 'assets/site-audit-v7';
  await mkdir(target + '/fonts', { recursive: true });
  await cp('node_modules/owl.carousel/dist/assets/owl.video.play.png', target + '/owl.video.play.png');
  await cp('node_modules/@fontsource-variable/montserrat/files', target + '/fonts', { recursive: true });
  const fontCss = (await readFile('node_modules/@fontsource-variable/montserrat/index.css', 'utf8')).replaceAll('Montserrat Variable', 'Montserrat').replaceAll('./files/', './fonts/');
  const carouselCss = await readFile('node_modules/owl.carousel/dist/assets/owl.carousel.min.css', 'utf8');
  const jquery = await readFile('node_modules/jquery/dist/jquery.min.js', 'utf8');
  // OwlCarousel 2 hard-codes the global `jQuery` constructor in two instanceof
  // checks. The bundled jQuery is deliberately kept off the host global so it
  // cannot replace SaleBot's own copy; point those checks at Owl's jQuery alias.
  const carousel = (await readFile('node_modules/owl.carousel/dist/owl.carousel.min.js', 'utf8'))
    .replaceAll('instanceof jQuery', 'instanceof a');
  await writeFile(target + '/vendors.js', jquery + '\n;\n' + carousel + '\n;window.creatorAcademyJQuery=window.jQuery.noConflict(true);');
  // Remove external font imports.
  const external = [...css.matchAll(/@import url\("https:[^\n]+/g)].map(m => m[0]);
  for (const line of external) css = css.replace(line, '');
  css = css.replaceAll('url("fonts/', 'url("../../fonts/');
  let output = [fontCss, carouselCss].join('\n') + '\n' + sections + '\n' + css + '\n' + await readFile(target + '/fixes.css', 'utf8');
  await mkdir(target + '/images', {recursive:true});
  const backgrounds=[...new Set([...output.matchAll(/\.\.\/\.\.\/images\/[^"')\s]+/g)].map(m=>m[0]))];
  for(const url of backgrounds){
    const source=url.slice(6);
    const name='bg-'+source.replaceAll('/','-').replace(/\.[^.]+$/,'.webp');
    const image=await readFile(source);
    if (source.startsWith('images/about/')) {
      await sharp(image).resize({width:1200,withoutEnlargement:true}).webp({quality:90}).toFile(target+'/images/'+name.replace('.webp','-mobile.webp'));
      await sharp(image).resize({width:3000,withoutEnlargement:true}).webp({quality:90}).toFile(target+'/images/'+name.replace('.webp','-wide.webp'));
      output=output.replaceAll(url,'./images/'+name.replace('.webp','-mobile.webp'));
    } else {
      await sharp(image).resize({width:1200,withoutEnlargement:true}).webp({quality:82}).toFile(target+'/images/'+name);
      output=output.replaceAll(url,'./images/'+name);
    }
  }
  await writeFile(target + '/site.css', output.replace(/[\t ]+$/gm, ''));
  await mkdir('dist', { recursive: true });
  const salebotHtml = (await readFile('index.html', 'utf8')).replaceAll(base, cdnBase);
  await writeFile('dist/salebot.html', salebotHtml);
}
if (process.argv[1]?.endsWith('/build.mjs')) {
  await build();
  console.log('Готово: dist/salebot.html; ресурсы: assets/site-audit-v7/');
}
