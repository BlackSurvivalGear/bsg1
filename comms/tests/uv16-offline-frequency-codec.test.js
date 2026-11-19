import test from 'node:test';
import assert from 'node:assert/strict';
import {captureUV16ReadRegions,validateUV16ReadRegions} from '../uv16-read-regions.js';
import {encodeUV16FrequencyBCD,decodeUV16FrequencyBCD,inspectUV16Slot,prepareUV16OfflineFrequencyDiff} from '../uv16-offline-frequency-codec.js';
function fixture(){
 const memory=new Uint8Array(2048).fill(0xff);
 const known=new Uint8Array(16);
 known.set(encodeUV16FrequencyBCD(145.5),0);
 known.set(encodeUV16FrequencyBCD(145.5),4);
 known.set([0x12,0x34,0x56,0x78,0x9a,0xbc,0xde,0x44],8);
 memory.set(known,2*16);
 // An unused record can contain retained non-FF data. Never treat it as blank.
 memory.set([0xff,0x25,0x03,0x45,0,0,0,0,0,0,0,0,0,0,0,0x44],3*16);
 const aux=new Map([[0x1e80,new Uint8Array(64).fill(1)],
  [0x1ec0,new Uint8Array(64).fill(2)],[0x1fc0,new Uint8Array(64).fill(3)]]);
 return captureUV16ReadRegions({firmware:'HN5RV01',channelBytes:memory,auxiliary:aux});
}
test('BCD encoder round-trips representative frequencies exactly',()=>{
 for(const mhz of [1,77.6875,145.5,145.225,150.325,440.125,445.225,450.325,999.99999]){
  assert.equal(decodeUV16FrequencyBCD(encodeUV16FrequencyBCD(mhz)),mhz);
 }
 assert.deepEqual([...encodeUV16FrequencyBCD(145.225)],[0x00,0x25,0x52,0x14]);
});
test('reject invalid and unrepresentable BCD inputs',()=>{
 for(const mhz of [0,-1,1000,Infinity,NaN,145.225001,0.000001,'145.225'])
  assert.throws(()=>encodeUV16FrequencyBCD(mhz));
 for(const bytes of [new Uint8Array(3),new Uint8Array([0xfa,0,0,0]),new Uint8Array(4)])
  assert.throws(()=>decodeUV16FrequencyBCD(bytes));
});
test('unchanged round trip preserves all unknown bytes and yields zero changes',()=>{
 const snapshot=fixture(), original=JSON.stringify(snapshot);
 const info=inspectUV16Slot(snapshot,2);
 const diff=prepareUV16OfflineFrequencyDiff({snapshot,slot:2,
  expectedRxMHz:info.rxMHz,expectedTxMHz:info.txMHz,
  newRxMHz:info.rxMHz,newTxMHz:info.txMHz});
 assert.equal(diff.afterRecordHex,diff.beforeRecordHex);
 assert.deepEqual(diff.changedOffsets,[]);
 assert.equal(diff.unknownFieldsPreserved,true);
 assert.equal(JSON.stringify(snapshot),original);
 assert.ok(validateUV16ReadRegions(snapshot));
 assert.equal(diff.hardwareWriteEnabled,false);
 assert.equal('memory' in diff,false);
 assert.equal('serialCommand' in diff,false);
});
test('single-channel RX change touches only BCD bytes and leaves auxiliary evidence untouched',()=>{
 const snapshot=fixture();
 const before=JSON.stringify(snapshot);
 const diff=prepareUV16OfflineFrequencyDiff({snapshot,slot:2,
  expectedRxMHz:145.5,expectedTxMHz:145.5,newRxMHz:145.225,newTxMHz:145.5});
 assert.deepEqual(diff.changedOffsets,[33,34,35]); // inspect byte-by-byte
 assert.equal(diff.beforeRecordHex.slice(16),diff.afterRecordHex.slice(16));
 assert.equal(diff.afterRecordHex.slice(8,16),diff.beforeRecordHex.slice(8,16));
 assert.equal(diff.afterRecordHex.slice(16),diff.beforeRecordHex.slice(16));
 assert.equal(JSON.stringify(snapshot),before);
});
test('refuse empty slot even with residual data, wrong slot, wrong expected values or corrupt image',()=>{
 const snap=fixture();
 for(const slot of [-1,3,128,1.5])
  assert.throws(()=>prepareUV16OfflineFrequencyDiff({snapshot:snap,slot,expectedRxMHz:145.5,expectedTxMHz:145.5,newRxMHz:145.225,newTxMHz:145.5}));
 assert.throws(()=>prepareUV16OfflineFrequencyDiff({snapshot:snap,slot:2,
  expectedRxMHz:145.225,expectedTxMHz:145.5,newRxMHz:145.225,newTxMHz:145.5}),/Expected frequencies disagree/);
 assert.throws(()=>prepareUV16OfflineFrequencyDiff({snapshot:{...snap,restorable:true},slot:2,
  expectedRxMHz:145.5,expectedTxMHz:145.5,newRxMHz:145.225,newTxMHz:145.5}),/Unsupported/);
});
