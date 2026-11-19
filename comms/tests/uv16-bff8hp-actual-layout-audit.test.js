import test from 'node:test';
import assert from 'node:assert/strict';
import {captureUV16ReadRegions} from '../uv16-read-regions.js';
import {inspectBFF8HPActualLayout,auditBFF8HPUploadDecision} from '../uv16-bff8hp-actual-layout-audit.js';
const marker=Uint8Array.from([0xff,99,104,105,114,112,0xee,105,109,103,0,1]);
function fixture(){
 const channels=new Uint8Array(2048).fill(0xff);channels.set([0,0x25,0x52,0x14,0,0x25,0x52,0x14],32);
 const payload=new Uint8Array(6473).fill(0xff);payload.set([0xaa,0x30,0x76,4,0,5,0x20,0xdd]);payload.set(channels,8);
 const aux=new Map([[0x1e80,new Uint8Array(64).fill(0xb5)],[0x1ec0,new Uint8Array(64).fill(0x65)],[0x1fc0,new Uint8Array(64).fill(0x36)]]);
 payload.set(aux.get(0x1ec0),0x1808);payload.set(aux.get(0x1fc0),0x1908);
 const snapshot=captureUV16ReadRegions({firmware:'HN5RV01',channelBytes:channels,auxiliary:aux});
 const meta=Buffer.from(JSON.stringify({rclass:'BaofengBFF8HPRadio',model:'BF-F8HP',chirp_version:'next-20261030'})).toString('base64');
 const image=new Uint8Array(payload.length+marker.length+meta.length);image.set(payload);image.set(marker,payload.length);image.set(Buffer.from(meta),payload.length+marker.length);
 const comparison=[[0x1f00,0x1f60],[0x1f70,0x1f80],[0x1f90,0x1fc0]].map(([a,b])=>image.slice(0x1808+a-0x1ec0,0x1808+b-0x1ec0));
 return {image,snapshot,comparison};
}
test('actual BF-F8HP image maps aux from 1ec0, not 1e80',()=>{
 const {image,snapshot}=fixture();const r=inspectBFF8HPActualLayout(image,{snapshot});
 assert.equal(r.main.fileStart,8);assert.equal(r.main.fileEndExclusive,0x1808);
 assert.equal(r.auxiliary.fileStart,0x1808);assert.equal(r.auxiliary.fileEndExclusive,0x1948);
 assert.equal(r.trailingPreMetadataBytes,1);
 assert.deepEqual(r.snapshotRegions.map(x=>[x.radioAddress,x.fileOffset,x.exactMatch]),[[0x1e80,null,null],[0x1ec0,0x1808,true],[0x1fc0,0x1908,true]]);
 assert.deepEqual(r.channelSpanOffsets,[8]);assert.equal(r.canWrite,false);
});
test('matching guard allows 1ec0 onward but never 1e80',()=>{
 const {image,comparison}=fixture();const r=auditBFF8HPUploadDecision({image,radioComparisonAreas:comparison});
 assert.equal(r.auxMatched,true);assert.deepEqual(r.defaultAuxiliaryRanges,[[0x1ec0,0x2000]]);
 assert.equal(r.defaultWouldWrite1E80,false);assert.equal(r.defaultWouldWrite1EC0,true);assert.equal(r.canWrite,false);
});
test('mismatching guard limits auxiliary writes to four small ranges',()=>{
 const {image,comparison}=fixture();comparison[0][0]^=1;
 const r=auditBFF8HPUploadDecision({image,radioComparisonAreas:comparison});
 assert.equal(r.auxMatched,false);assert.deepEqual(r.defaultAuxiliaryRanges,[[0x1ee0,0x1ef0],[0x1f60,0x1f70],[0x1f80,0x1f90],[0x1fc0,0x1fd0]]);
});
test('dropped-byte mismatch blocks default upload',()=>{
 const {image,comparison}=fixture();comparison[1][0]^=1;
 const r=auditBFF8HPUploadDecision({image,radioComparisonAreas:comparison,hasDroppedByte:true});
 assert.equal(r.blockedByCHIRPGuard,true);assert.equal(r.canWrite,false);
});
test('range override is flagged and never authorizes writing',()=>{
 const {image,comparison}=fixture();const r=auditBFF8HPUploadDecision({image,radioComparisonAreas:comparison,rangeOverride:true});
 assert.equal(r.rangeOverrideRequiresSeparateReview,true);assert.equal(r.canWrite,false);
});
test('rejects incomplete comparison, corrupted image, or altered snapshot',()=>{
 const {image,snapshot}=fixture();
 assert.throws(()=>auditBFF8HPUploadDecision({image,radioComparisonAreas:[]}),/Three fresh/);
 assert.throws(()=>inspectBFF8HPActualLayout(image.slice(0,0x1948)),/marker/);
 assert.throws(()=>inspectBFF8HPActualLayout(image,{snapshot:{...snapshot,integrity:{...snapshot.integrity,value:'bad'}}}),/integrity/);
});
