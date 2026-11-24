import {test} from "node:test";
import assert from "node:assert/strict";
import {getSeoConfig} from "../src/lib/seo.ts";

test("unconfigured and configured previews stay unindexed until explicit launch",()=>{
  assert.deepEqual(getSeoConfig({}),{url:undefined,indexable:false});
  assert.deepEqual(getSeoConfig({SITE_URL:"https://takween.example/"}),{url:"https://takween.example",indexable:false});
  assert.deepEqual(getSeoConfig({SITE_URL:"https://takween.example",SITE_INDEXING_ENABLED:"true"}),{url:"https://takween.example",indexable:true});
});
test("indexing cannot use missing, local, malformed or credential-bearing origins",()=>{
  assert.throws(()=>getSeoConfig({SITE_INDEXING_ENABLED:"true"}));
  assert.throws(()=>getSeoConfig({SITE_INDEXING_ENABLED:"yes"}));
  for(const SITE_URL of ["broken","http://takween.example","https://localhost","https://127.0.0.1","https://user:pass@takween.example","https://takween.example/path","https://takween.example/?a=1","https://takween.example/#x"]){
    assert.throws(()=>getSeoConfig({SITE_URL,SITE_INDEXING_ENABLED:"true"}),SITE_URL);
  }
});
