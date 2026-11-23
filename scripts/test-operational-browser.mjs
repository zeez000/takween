// Enabled local workflows share the real 30/minute owner rate limiter. Isolate
// each file/project's budget by waiting outside test execution, never by relaxing
// security assertions, increasing test timeouts or bypassing the native limiter.
import {spawn} from 'node:child_process';import {readdir} from 'node:fs/promises';import {setTimeout as delay} from 'node:timers/promises';
const url=new URL(process.env.TAKWEEN_LOCAL_WORKER_URL??'http://127.0.0.1:8797');
if(!['localhost','127.0.0.1'].includes(url.hostname))throw Error('Only disposable localhost Workers are permitted');
const files=(await readdir('tests/operational-browser')).filter(f=>f.endsWith('.spec.ts')).sort();
for(const project of ['desktop','mobile'])for(const file of files){
 console.log(`Waiting for the real local limiter window before ${project}/${file}`);await delay(65000);
 const exit=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,['node_modules/@playwright/test/cli.js','test','--config','playwright.operations.config.ts',file,`--project=${project}`],{stdio:'inherit'});child.on('error',reject);child.on('exit',resolve);});
 if(exit!==0){process.exitCode=Number(exit)||1;throw Error(`Operational browser group failed: ${project}/${file}`);}
}
