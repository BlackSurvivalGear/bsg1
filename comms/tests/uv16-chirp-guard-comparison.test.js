import test from 'node:test';
import assert from 'node:assert/strict';
import {compareBFF8HPCHIRPGuard} from '../uv16-chirp-guard-comparison.js';
const marker=Uint8Array.from([0xff,99,104,105,114,112,0xee,105,109,103,0,1]);
function fixture(){
 const payload=new Uint8Array(6473).fill(255);payload.set([0xaa,0x30,0x76,4,0,5,0x20,0xdd]);
 const meta=Buffer.from(JSON.stringify({rclass:'BaofengBFF8HPRadio',model:'BF-F8HP'})).toString('base64');
 const image=Uint8Array.from([...payload,...marker,...Buffer.from(meta)]);
 const regions=[0x1f00,0x1f40,0x1f80].map(address=>({address,bytesHex:'ff'.repeat(64)}));
 return {image,capture:{format:'bsg-uv16-chirp-guard-capture-v1',firmware:'HN5RV01',readOnly:true,restorable:false,regions}};
}
test('all three fresh read-only areas match the CHIRP image',()=>{
 const {image,capture}=fixture();const r=compareBFF8HPCHIRPGuard(image,capture);
 assert.equal(r.allGuardAreasMatch,true);assert.deepEqual(r.comparisons.map(x=>x.bytes),[96,16,48]);
 assert.equal(r.canWrite,false);assert.equal(r.restorableBackupVerified,false);
});
test('one-byte difference reports exact mismatch and never authorizes writing',()=>{
 const {image,capture}=fixture();capture.regions[1].bytesHex='00'+'ff'.repeat(63);
 const r=compareBFF8HPCHIRPGuard(image,capture);
 assert.equal(r.allGuardAreasMatch,false);assert.equal(r.comparisons[0].matchingBytes,95);
 assert.deepEqual(r.comparisons[0].differingOffsets,[64]);assert.equal(r.canWrite,false);
});
test('rejects missing, corrupt and reordered auxiliary capture',()=>{
 const {image,capture}=fixture();
 assert.throws(()=>compareBFF8HPCHIRPGuard(image,{...capture,regions:[]}),/Complete/);
 assert.throws(()=>compareBFF8HPCHIRPGuard(image,{...capture,regions:[...capture.regions].reverse()}),/reordered/);
 assert.throws(()=>compareBFF8HPCHIRPGuard(image,{...capture,regions:[{...capture.regions[0],bytesHex:'ff'},...capture.regions.slice(1)]}),/64 captured/);
});
