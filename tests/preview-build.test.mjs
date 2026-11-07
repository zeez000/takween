import {test} from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
const script=fileURLToPath(new URL("../scripts/build-preview.mjs",import.meta.url));
function check(SITE_URL,args=["--check"]){
  return spawnSync(process.execPath,["--experimental-strip-types",script,...args],{
    encoding:"utf8",env:{...process.env,SITE_URL,SITE_INDEXING_ENABLED:"true"}
  });
}
test("public preview refuses a missing canonical origin",()=>{
  const result=check("");assert.equal(result.status,1);assert.match(result.stderr,/confirmed HTTPS/);
});
test("preview preflight forces indexing off even when inherited settings enable it",()=>{
  const result=check("https://synthetic-preview.example");assert.equal(result.status,0);
  assert.match(result.stdout,/SITE_INDEXING_ENABLED=false/);assert.match(result.stdout,/No build or deployment/);
});
test("invalid origin and deployment arguments cannot bypass preview preflight",()=>{
  assert.equal(check("http://localhost:8787").status,1);
  assert.equal(check("https://synthetic-preview.example",["--deploy"]).status,1);
});
