import {test} from "node:test";
import assert from "node:assert/strict";
import {assemblyTimeline} from "../src/lib/assembly-timeline.ts";
test("timeline assembles, separates, holds and reassembles at the specified ranges",()=>{
 for(const p of [0,.1,.2,1])assert.equal(assemblyTimeline(p).explosion,0);
 for(const p of [.65,.75,.85])assert.equal(assemblyTimeline(p).explosion,1);
 assert.ok(assemblyTimeline(.4).explosion>0&&assemblyTimeline(.4).explosion<1);
 assert.ok(assemblyTimeline(.93).explosion>0&&assemblyTimeline(.93).explosion<1);
 assert.equal(assemblyTimeline(.75).interactive,false);
 assert.equal(assemblyTimeline(0).interactive,true);
 assert.equal(assemblyTimeline(1).interactive,true);
});
test("timeline reverses without history and clamps outside the sequence",()=>{
 const positions=[0,.2,.35,.6,.75,.9,1];
 const forward=positions.map(assemblyTimeline);
 const reverse=[...positions].reverse().map(assemblyTimeline).reverse();
 assert.deepEqual(forward,reverse);
 assert.equal(assemblyTimeline(-5).explosion,0);assert.equal(assemblyTimeline(5).explosion,0);
 for(const boundary of [.2,.65,.85]){
  assert.ok(Math.abs(assemblyTimeline(boundary-1e-6).explosion-assemblyTimeline(boundary+1e-6).explosion)<1e-6);
 }
});
