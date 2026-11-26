// Offline, deterministic brand asset. Reuses approved contours and licensed bundled fonts.
import fs from 'node:fs';
import sharp from 'sharp';
import fontkit from '@pdf-lib/fontkit';
import {emblemContours} from '../src/components/hero-emblem/outline.ts';
const font=fontkit.create(fs.readFileSync('node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff'));
function lettering(text,x,y,size,color){
  const run=font.layout(text),scale=size/font.unitsPerEm;let cursor=0;
  return run.glyphs.map((glyph,i)=>{const p=run.positions[i],svg=`<path fill="${color}" transform="translate(${x+(cursor+p.xOffset)*scale} ${y-p.yOffset*scale}) scale(${scale} ${-scale})" d="${glyph.path.toSVG()}"/>`;cursor+=p.xAdvance;return svg;}).join('');
}
const emblem=emblemContours.map(points=>`<polygon points="${points.map(([x,y])=>`${x},${y}`).join(' ')}"/>`).join('');
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#17181c"/><stop offset="1" stop-color="#08090b"/></linearGradient></defs>
<rect width="1200" height="630" fill="url(#bg)"/>
<rect x="28" y="28" width="1144" height="574" rx="2" fill="none" stroke="#35363d"/>
<path d="M28 100V28H100 M1100 602H1172V530" fill="none" stroke="#ff373e" stroke-width="3"/>
<path d="M490 118V512" stroke="#35363d"/>
<g transform="translate(102 144) scale(.88) translate(-196 -575)" fill="#ff373e">${emblem}</g>
${lettering('TAKWEEN',542,228,65,'#f3f1ee')}
${lettering('LABS',546,280,30,'#ff373e')}
${lettering('YOU NAME IT.',545,367,35,'#f3f1ee')}
${lettering('WE MAKE IT.',545,412,35,'#ff373e')}
${lettering('RAJAJINAGAR / BENGALURU',545,500,17,'#a9aab4')}
${lettering('FOUNDATION PREVIEW',76,566,14,'#a9aab4')}
<path d="M1025 557H1124" stroke="#ff373e" stroke-width="3"/>
</svg>`;
fs.mkdirSync('public',{recursive:true});
await sharp(Buffer.from(svg)).png().toFile('public/takween-social.png');
const {width,height}=await sharp('public/takween-social.png').metadata();
if(width!==1200||height!==630)throw Error('Unexpected social image dimensions');
console.log(JSON.stringify({file:'public/takween-social.png',width,height,bytes:fs.statSync('public/takween-social.png').size}));
