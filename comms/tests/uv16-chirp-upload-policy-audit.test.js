import test from 'node:test';
import assert from 'node:assert/strict';
import {auditCHIRPBaofengUploadPolicy as audit} from '../uv16-chirp-upload-policy-audit.js';
function fixture(){
 const image=new Uint8Array(8192).fill(0xff);
 const areas=[[0x1f00,0x1f60],[0x1f70,0x1f80],[0x1f90,0x1fc0]].map(([a,b])=>image.slice(a,b));
 return {image,areas};
}
test('matching comparison areas select full CHIRP reference ranges including 1e80',()=>{
 const {image,areas}=fixture();const r=audit({image,radioAreas:areas});
 assert.equal(r.auxMatched,true);assert.equal(r.wouldInclude1E80,true);
 assert.equal(r.block1E80WasCompared,false);assert.equal(r.canWrite,false);
 assert.deepEqual(r.selectedReferenceRanges,[[0,0xdf0],[0xe00,0x1800],[0x1e80,0x2000]]);
});
test('a mismatch skips full auxiliary region without dropped-byte condition',()=>{
 const {image,areas}=fixture();areas[0][0]=0;
 const r=audit({image,radioAreas:areas});
 assert.equal(r.auxMatched,false);assert.equal(r.wouldInclude1E80,false);assert.equal(r.blockedByCHIRPGuard,false);
});
test('dropped byte plus mismatch blocks the reference upload',()=>{
 const {image,areas}=fixture();areas[2][0]=0;
 const r=audit({image,radioAreas:areas,droppedByte:true});
 assert.equal(r.blockedByCHIRPGuard,true);assert.deepEqual(r.selectedReferenceRanges,[]);
});
test('dropped byte with matching auxiliary data selects full reference ranges',()=>{
 const {image,areas}=fixture();const r=audit({image,radioAreas:areas,droppedByte:true,vendor:'BTECH'});
 assert.equal(r.wouldInclude1E80,true);
});
test('BTECH without dropped byte uses fallback even when comparison matches',()=>{
 const {image,areas}=fixture();const r=audit({image,radioAreas:areas,vendor:'BTECH'});
 assert.equal(r.wouldInclude1E80,false);
});
test('fail closed for incomplete images, areas and invalid ranges',()=>{
 const {image,areas}=fixture();
 assert.throws(()=>audit({image:new Uint8Array(20),radioAreas:areas}),/8192/);
 assert.throws(()=>audit({image,radioAreas:[new Uint8Array(96)]}),/Three complete/);
 assert.throws(()=>audit({image,radioAreas:areas,fallbackRanges:[[0x1e80,0x3000]]}),/Invalid reference/);
});
