import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/aiseosauyi-idahor/Desktop/Development/Nexus/node_modules/.pnpm/playwright@1.58.2/node_modules/playwright/index.js');

const dir = dirname(fileURLToPath(import.meta.url));
const shots = join(dir, 'shots');
import { mkdirSync } from 'fs';
mkdirSync(shots, { recursive: true });

const browser = await chromium.launch();

// 1) Full app screen — hero shot @ 2x for crispness
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await page.goto('file://' + join(dir, '_appshot.html'));
await page.waitForTimeout(400);
await page.screenshot({ path: join(shots, 'app-doc.png') });
console.log('saved shots/app-doc.png');

// 2) Calendar view — toggle the tab + swap main content, then shoot
await page.evaluate(() => {
  document.querySelectorAll('.tabs .t').forEach((t,i)=>t.classList.toggle('on', i===1));
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const weeks = [[null,null,1,2,3,4,5],[6,7,8,9,10,11,12],[13,14,15,16,17,18,19],[20,21,22,23,24,25,26],[27,28,29,30,null,null,null]];
  const ent = {2:['#b14e2c','Sprint review'],7:['#5e7152','API v2 spec'],10:['#c08a3e','v2.1 release'],15:['#b14e2c','Team sync'],21:['#5e7152','Launch plan'],24:['#c08a3e','Brand review']};
  const dark = c => c==='#b14e2c'||c==='#5e7152';
  let cells='';
  weeks.forEach(w=>w.forEach(d=>{
    const e = d && ent[d];
    cells += `<div style="min-height:96px;padding:8px 9px;border-right:1px solid var(--line);border-bottom:1px solid var(--line)">`+
      (d?`<div style="font-size:13px;font-weight:600;margin-bottom:7px;color:var(--ink)">${d}</div>`:'')+
      (e?`<div style="background:${e[0]};color:${dark(e[0])?'#fff':'#241f18'};border-radius:7px;padding:4px 8px;font-size:11.5px;font-weight:600">${e[1]}</div>`:'')+
      `</div>`;
  }));
  const head = days.map(d=>`<div style="text-align:center;font-size:11px;font-weight:650;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);padding:11px 0;border-right:1px solid var(--line)">${d}</div>`).join('');
  document.querySelector('.scroll').innerHTML =
    `<div style="flex:1;padding:34px 44px;overflow:hidden">
       <div style="display:flex;align-items:center;gap:14px;margin-bottom:22px">
         <h1 style="font-size:30px;font-weight:650;letter-spacing:-.03em">April 2026</h1>
         <span style="font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:var(--clay);font-weight:650">Content Calendar</span>
       </div>
       <div style="border:1px solid var(--line2);border-radius:16px;overflow:hidden;background:var(--card)">
         <div style="display:grid;grid-template-columns:repeat(7,1fr);background:var(--paper2);border-bottom:1px solid var(--line)">${head}</div>
         <div style="display:grid;grid-template-columns:repeat(7,1fr)">${cells}</div>
       </div>
     </div>`;
});
await page.waitForTimeout(250);
await page.screenshot({ path: join(shots, 'app-calendar.png') });
console.log('saved shots/app-calendar.png');

await browser.close();
console.log('done');
