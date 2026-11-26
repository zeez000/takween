// Explicitly opt-in; uses the existing disposable stack and synthetic owner only.
// No installation, migration, service restart, hosted access or real email.
import {readFile} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
if(process.env.TAKWEEN_LOCAL_INTEGRATION!=='1')throw Error('Explicit local integration opt-in required');
const statusPath=resolve(process.env.TAKWEEN_LOCAL_SUPABASE_STATUS??'');
const rel=relative(resolve('artifacts'),statusPath);
if(!rel||rel.startsWith('..'))throw Error('Status must be an ignored local artifact');
const status=JSON.parse(await readFile(statusPath,'utf8'));
for(const address of [status.env?.API_URL,status.env?.DB_URL]){
 if(!['127.0.0.1','localhost','[::1]'].includes(new URL(address).hostname))throw Error('Refusing non-loopback runtime');
}
const cases=[['desktop','connected-journey.spec.ts'],...['desktop','tablet','mobile'].map(p=>[p,'owner-views.spec.ts'])];
for(const [project,file]of cases){
 console.log(`Waiting for the existing owner rate-limit window before ${project} / ${file}`);
 await delay(65000);
 const exit=await new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,['node_modules/@playwright/test/cli.js','test',file,'--config=playwright.review.config.ts',`--project=${project}`],{stdio:'inherit'});
  child.once('error',reject);child.once('exit',code=>resolve(code??1));
 });
 if(exit)process.exit(exit);
}
