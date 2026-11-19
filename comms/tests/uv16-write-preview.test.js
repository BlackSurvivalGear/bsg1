import test from 'node:test';
import assert from 'node:assert/strict';
import {captureUV16ReadRegions} from '../uv16-read-regions.js';
import {encodeUV16FrequencyBCD} from '../uv16-offline-frequency-codec.js';
import {previewUV16OfflineWrite,formatUV16OfflineWritePreview} from '../uv16-write-preview.js';

function fixture(){
 const channelBytes=new Uint8Array(2048).fill(255);
 const slot=2,offset=slot*16;
 channelBytes.set(encodeUV16FrequencyBCD(145.225),offset);
 channelBytes.set(encodeUV16FrequencyBCD(145.225),offset+4);
 channelBytes.set([0,0,0,0,0,0,0,0x44],offset+8);
 // An unused slot may contain residual bytes, never treated as writable.
 channelBytes[3*16+1]=0x42;
 const auxiliary=new Map([0x1e80,0x1ec0,0x1fc0].map(address=>[address,new Uint8Array(64)]));
 return captureUV16ReadRegions({firmware:'HN5RV01',channelBytes,auxiliary});
}
const change={slot:2,expectedRxMHz:145.225,expectedTxMHz:145.225,newRxMHz:145.325,newTxMHz:145.325};
test('explicit occupied slot yields a non-writable, minimal frequency-byte preview',()=>{
 const snapshot=fixture(),original=JSON.stringify(snapshot);
 const report=previewUV16OfflineWrite({snapshot,changes:[change]});
 assert.equal(report.previewCount,1);
 assert.equal(report.changedSlots,1);
 assert.equal(report.rows[0].displayMemory,3);
 assert.ok(report.rows[0].changedByteCount>0);
 assert.ok(report.rows[0].changedOffsets.every(x=>x>=32&&x<40));
 assert.equal(report.rows[0].unknownFieldsPreserved,true);
 assert.equal(report.hardwareWriteEnabled,false);
 assert.equal(report.canWrite,false);
 assert.equal(report.backupRestorable,false);
 assert.equal(report.writeVerified,false);
 assert.equal('afterRecordHex' in report.rows[0],false);
 assert.equal('writeFrame' in report,false);
 assert.match(formatUV16OfflineWritePreview(report),/Hardware write: BLOCKED/);
 assert.equal(JSON.stringify(snapshot),original);
});
test('no-op preview reports zero changed bytes',()=>{
 const report=previewUV16OfflineWrite({snapshot:fixture(),changes:[{...change,newRxMHz:145.225,newTxMHz:145.225}]});
 assert.equal(report.changedSlots,0);
 assert.deepEqual(report.rows[0].changedOffsets,[]);
});
test('reject stale expected frequencies, invalid resolution and unused slots',()=>{
 const snapshot=fixture();
 assert.throws(()=>previewUV16OfflineWrite({snapshot,changes:[{...change,expectedRxMHz:145.5}]}),/disagree/);
 assert.throws(()=>previewUV16OfflineWrite({snapshot,changes:[{...change,newRxMHz:145.225001}]}),/not representable/);
 assert.throws(()=>previewUV16OfflineWrite({snapshot,changes:[{...change,slot:3}]}),/Unused radio slot/);
});
test('reject duplicate, inferred, ambiguous and advanced-setting changes',()=>{
 const snapshot=fixture();
 assert.throws(()=>previewUV16OfflineWrite({snapshot,changes:[change,change]}),/duplicate/);
 assert.throws(()=>previewUV16OfflineWrite({snapshot,changes:[{...change,power:'Low'}]}),/Only explicit/);
 assert.throws(()=>previewUV16OfflineWrite({snapshot,changes:[{...change,slot:undefined}]}),/Invalid or duplicate/);
 assert.throws(()=>previewUV16OfflineWrite({snapshot,changes:[]}),/Provide 1 to 128/);
 assert.throws(()=>previewUV16OfflineWrite({snapshot,changes:[{...change,slot:128}]}),/Invalid or duplicate/);
});
test('reject tampered snapshot and never interpret it as a restorable backup',()=>{
 const snapshot=fixture();
 const tampered={...snapshot,memory:{...snapshot.memory,bytesHex:'00'+snapshot.memory.bytesHex.slice(2)}};
 assert.throws(()=>previewUV16OfflineWrite({snapshot:tampered,changes:[change]}),/integrity check failed/);
});
