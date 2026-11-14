import {test} from "node:test";
import assert from "node:assert/strict";
import {MAX_FILE_BYTES,validateDesignFile,formatEnquiry} from "../src/lib/enquiry.ts";
test("file selection accepts supported extensions and enforces nonempty 25 MB boundary",()=>{
 for(const name of ["part.STL","part.3mf","part.step","part.stp"]){assert.equal(validateDesignFile({name,size:MAX_FILE_BYTES}),null);}
 assert.match(validateDesignFile({name:"part.stl",size:0})!,/empty/);
 assert.match(validateDesignFile({name:"part.stl",size:MAX_FILE_BYTES+1})!,/25 MB/);
 assert.match(validateDesignFile({name:"part.stl.exe",size:10})!,/Choose/);
 assert.match(validateDesignFile({name:"no-extension",size:10})!,/Choose/);
 assert.match(validateDesignFile({name:"designs.zip",size:10})!,/Choose/);
});
test("draft identifies file attachment limitation",()=>{
 const draft=formatEnquiry({name:" Preview ",contact:"preview@example.invalid",material:"PLA",quantity:"2",details:"Concept enclosure"});
 assert.match(draft,/Name: Preview\n/);assert.match(draft,/Quantity: 2/);assert.match(draft,/No design file is attached/);
});
