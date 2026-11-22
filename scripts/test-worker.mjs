// Starts only a local test Worker. No real provider or credentials are used.
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const child=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--local','--ip','127.0.0.1','--port','8791','--inspector-port','9232','--config','tests/worker/wrangler.json'],{stdio:'pipe',env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
let logs='';child.stdout.on('data',data=>{logs+=data});child.stderr.on('data',data=>{logs+=data});
try{
 let ready=false;
 for(let n=0;n<120;n++){
   if(child.exitCode!==null)throw Error('Test Worker exited: '+logs);
   try{await fetch('http://127.0.0.1:8791/',{signal:AbortSignal.timeout(500)});ready=true;break}catch{await delay(500)}
 }
 if(!ready)throw Error('Local test Worker did not start: '+logs);
 const outcomes=[];
 for(let n=0;n<7;n++){
  const response=await fetch('http://127.0.0.1:8791/',{method:'POST',headers:{origin:'http://127.0.0.1:8791','content-type':'application/json','cf-connecting-ip':'192.0.2.99'},body:JSON.stringify({name:'Synthetic test',email:'audit@example.invalid',quantity:'1',material:'PLA',details:'Local worker test only',website:'',requestId:'a1234567-1234-4234-8234-123456789abc'})});
  outcomes.push(response.status);
 }
 assert.deepEqual(outcomes,[202,202,202,202,202,429,429]);
 await mkdir('artifacts/release',{recursive:true});await writeFile('artifacts/release/native-worker-test.json',JSON.stringify({provider:'mocked',outcomes},null,2));
 console.log('PASS: local workerd handler + native rate bindings, mocked provider',outcomes);
}finally{child.kill();}
