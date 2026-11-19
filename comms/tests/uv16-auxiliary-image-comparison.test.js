import test from 'node:test';
import assert from 'node:assert/strict';
import {captureUV16ReadRegions} from '../uv16-read-regions.js';
import {compareUV16CHIRPAuxiliary} from '../uv16-auxiliary-image-comparison.js';
const marker=Uint8Array.from([0xff,99,104,105,114,112,0xee,105,109,103,0,1]);
function fixture(){
 const channels=new Uint8Array(2048).fill(0xff);channels.set([0,0x25,0x52,0x14,0,0x25,0x52,0x14],32);
 const payload=new Uint8Array(6473).fill(0xff);payload.set([0xaa,0x30,0x76,4,0,5,0x20,0xdd]);payload.set(channels,8);
 const aux=new Map([[0x1e80,new Uint8Array(64).fill(0xb5)],[0x1ec0,new Uint8Array(64).fill(0x65)],[0x1fc0,new Uint8Array(64).fill(0x36)]]);
 payload.set(aux.get(0x1ec0),6152);payload.set(aux.get(0x1fc0),6408);
 const snapshot=captureUV16ReadRegions({firmware:'HN5RV01',channelBytes:channels,auxiliary:aux});
 const meta=Buffer.from(JSON.stringify({rclass:'BaofengBFF8HPRadio',model:'BF-F8HP',chirp_version:'next-20261030'})).toString('base64');
 const image=new Uint8Array(payload.length+marker.length+meta.length);image.set(payload);image.set(marker,payload.length);image.set(Buffer.from(meta),payload.length+marker.length);
 return {image,snapshot};
}
test('report two matching aux blocks and one unmatched without claiming write safety',()=>{
 const {image,snapshot}=fixture();const r=compareUV16CHIRPAuxiliary(image,snapshot);
 assert.equal(r.channelSpanAtFileOffset8,true);
 assert.deepEqual(r.auxiliary.map(x=>x.candidateFileOffset),[6088,6152,6408]);
 assert.deepEqual(r.auxiliary.map(x=>x.candidateExact),[false,true,true]);
 assert.equal(r.auxiliary[0].matchedBytes,0);
 assert.deepEqual(r.referenceAddressesWithoutBSGCapture,[0x1f00,0x1f40,0x1f80]);
 assert.equal(r.linearOffsetHypothesisVerified,false);assert.equal(r.canWrite,false);
});
test('reject corrupted BSG snapshot and invalid image',()=>{
 const {image,snapshot}=fixture();
 assert.throws(()=>compareUV16CHIRPAuxiliary(image,{...snapshot,integrity:{...snapshot.integrity,value:'wrong'}}),/integrity/);
 assert.throws(()=>compareUV16CHIRPAuxiliary(image,new Uint8Array(3)),/snapshot/);
});
