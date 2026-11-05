import {test} from "node:test";
import assert from "node:assert/strict";
import {MAX_FILE_BYTES,validateDesignFile,formatEnquiry,whatsappUrl} from "../src/lib/enquiry.ts";
test("file selection accepts supported extensions and enforces nonempty 25 MB boundary",()=>{
 for(const name of ["part.STL","part.3mf","part.step","part.stp"]){assert.equal(validateDesignFile({name,size:MAX_FILE_BYTES}),null);}
 assert.match(validateDesignFile({name:"part.stl",size:0})!,/empty/);
 assert.match(validateDesignFile({name:"part.stl",size:MAX_FILE_BYTES+1})!,/25 MB/);
 assert.match(validateDesignFile({name:"part.stl.exe",size:10})!,/Choose/);
 assert.match(validateDesignFile({name:"no-extension",size:10})!,/Choose/);
});
test("WhatsApp remains disabled without a valid configured number and encodes the message",()=>{
 assert.equal(whatsappUrl("","hello"),null);assert.equal(whatsappUrl("+91 123","hello"),null);
 const url=new URL(whatsappUrl("919876543210","A & B\npart")!);
 assert.equal(url.hostname,"wa.me");assert.equal(url.searchParams.get("text"),"A & B\npart");
});
test("draft identifies file attachment limitation",()=>{
 const draft=formatEnquiry({name:" Preview ",contact:"preview@example.invalid",material:"PLA",quantity:"2",details:"Concept enclosure"});
 assert.match(draft,/Name: Preview\n/);assert.match(draft,/Quantity: 2/);assert.match(draft,/No design file is attached/);
});
