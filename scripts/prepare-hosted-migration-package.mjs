// Offline packaging only. Never connects to Supabase or executes SQL.
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const verified='2e841cd42da87cca4bbc6faf2c4c1b60e24d7d57';
const root=path.resolve('artifacts/hosted-package-001-011');fs.mkdirSync(path.join(root,'supabase/migrations'),{recursive:true});
const files=execFileSync('git',['ls-tree','-r','--name-only',verified,'--','supabase/migrations'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(f=>f.endsWith('.sql')).sort();if(files.length!==11)throw Error('Expected exactly 11 verified migrations');
const manifest=[];for(const file of files){const bytes=execFileSync('git',['show',`${verified}:${file}`]);fs.writeFileSync(path.join(root,file),bytes);manifest.push({file,sha256:createHash('sha256').update(bytes).digest('hex')});}
fs.writeFileSync(path.join(root,'supabase/config.toml'),'project_id = "takween-reviewed-001-011"\n[db]\nmajor_version = 17\n');
fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify({verified,scope:'001-011 only; no later sprint migrations',migrations:manifest},null,2));
for(const file of ['hosted-readonly-inventory.sql','hosted-auth-storage-counts.sql','post-migration-security.sql'])fs.copyFileSync(path.join('supabase/inspection',file),path.join(root,file));
fs.copyFileSync('docs/HOSTED_ACTIVATION_PACKAGE.md',path.join(root,'README.md'));
const packaged=fs.readdirSync(path.join(root,'supabase/migrations')).filter(f=>f.endsWith('.sql'));if(packaged.length!==11||packaged.some(f=>!files.some(p=>path.basename(p)===f)))throw Error('Unexpected file in frozen package: stop and review, do not delete automatically');
for(const item of manifest)if(createHash('sha256').update(fs.readFileSync(path.join(root,item.file))).digest('hex')!==item.sha256)throw Error('Package hash mismatch');
console.log(JSON.stringify({status:'pass',directory:'artifacts/hosted-package-001-011',verified,migrations:11,networkRequests:0}));
