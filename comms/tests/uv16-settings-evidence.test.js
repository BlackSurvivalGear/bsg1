import test from 'node:test';
import assert from 'node:assert/strict';
import {captureUV16ReadRegions} from '../uv16-read-regions.js';
import {encodeUV16FrequencyBCD} from '../uv16-offline-frequency-codec.js';
import {auditUV16ChannelSettings,compareUV16ReadSnapshots} from '../uv16-settings-evidence.js';

function fixture({changeSettings=false,changeAux=false,emptyVariation=false}={}){
 const bytes=new Uint8Array(2048).fill(255);
 for(const slot of [2,3,4]){
  const p=slot*16;bytes.set(encodeUV16FrequencyBCD(145.225+slot*0.1),p);
  bytes.set(encodeUV16FrequencyBCD(145.225+slot*0.1),p+4);
  bytes.set([0,0,0,0,0,0,0,0x44],p+8);
 }
 // First byte 0xff alone marks the slot unused. Residual bytes are not blank.
 bytes.set([0xff,0x25,0x03,0x45,0,0,0,0,0,0,0,0,0,0,0,0x44],5*16);
 if(emptyVariation)bytes[5*16+8]=42;
 if(changeSettings)bytes[3*16+9]=0x39;
 const aux=new Map([[0x1e80,new Uint8Array(64).fill(1)],
 [0x1ec0,new Uint8Array(64).fill(2)],[0x1fc0,new Uint8Array(64).fill(3)]]);
 if(changeAux)aux.get(0x1e80)[3]=7;
 return captureUV16ReadRegions({firmware:'HN5RV01',channelBytes:bytes,auxiliary:aux});
}
test('single read reports unknown settings without pretending constant bytes are decoded',()=>{
 const audit=auditUV16ChannelSettings(fixture());
 assert.equal(audit.activeCount,3);
 assert.equal(audit.unusedCount,125);
 assert.equal(audit.fullyFFUnusedCount,124);
 assert.equal(audit.residualUnusedCount,1);
 assert.deepEqual(audit.varyingUnknownOffsets,[]);
 assert.equal(audit.activeSlots.length,3);
 assert.equal(audit.activeSlots[0].settingsHex,'0000000000000044');
 assert.deepEqual(audit.unknownFieldOffsets,[8,9,10,11,12,13,14,15]);
 assert.equal(audit.settingsIdentified,false);
 assert.equal(audit.hardwareWriteEnabled,false);
 assert.equal('write' in audit,false);
});
test('two validated captures find only changed unknown field and auxiliary offset',()=>{
 const before=fixture(),after=fixture({changeSettings:true,changeAux:true});
 const original=JSON.stringify(before);
 const diff=compareUV16ReadSnapshots(before,after);
 assert.equal(diff.changedPopulatedSlots.length,1);
 assert.equal(diff.changedPopulatedSlots[0].slot,3);
 assert.equal(diff.changedPopulatedSlots[0].unknownFieldBytesChanged,true);
 assert.equal(diff.changedPopulatedSlots[0].frequencyBytesChanged,false);
 assert.deepEqual(diff.changedPopulatedSlots[0].changedOffsets,[{recordOffset:9,absoluteOffset:57,oldHex:'00',newHex:'39'}]);
 assert.deepEqual(diff.auxiliaryChanges,[{address:0x1e80,offsets:[3]}]);
 assert.equal(diff.settingsIdentified,false);
 assert.equal(diff.writeProtocolVerified,false);
 assert.equal(diff.hardwareWriteEnabled,false);
 assert.equal('writeFrame' in diff,false);
 assert.equal(JSON.stringify(before),original);
});
test('unchanged snapshots produce no false differences',()=>{
 const original=fixture();
 const comparison=compareUV16ReadSnapshots(original,JSON.parse(JSON.stringify(original)));
 assert.deepEqual(comparison.changedPopulatedSlots,[]);
 assert.deepEqual(comparison.auxiliaryChanges,[]);
});
test('unused slot residual-byte changes are ignored as potential unprogrammed settings',()=>{
 const comparison=compareUV16ReadSnapshots(fixture(),fixture({emptyVariation:true}));
 assert.deepEqual(comparison.changedPopulatedSlots,[]);
 assert.equal(comparison.skippedUnusedSlots,125);
});
test('occupancy changes, checksum tampering and unsupported firmware fail closed',()=>{
 const before=fixture();
 const altered=fixture();
 const data=Uint8Array.from(Buffer.from(altered.memory.bytesHex,'hex'));
 data[5*16]=0x00;
 const aux=new Map(altered.auxiliary.map(a=>[a.address,Uint8Array.from(Buffer.from(a.bytesHex,'hex'))]));
 const newOccupancy=captureUV16ReadRegions({firmware:'HN5RV01',channelBytes:data,auxiliary:aux});
 assert.throws(()=>compareUV16ReadSnapshots(before,newOccupancy),/Slot population changed/);
 const corrupt={...before,memory:{...before.memory,bytesHex:'00'+before.memory.bytesHex.slice(2)}};
 assert.throws(()=>auditUV16ChannelSettings(corrupt),/integrity check failed/);
 assert.throws(()=>compareUV16ReadSnapshots(before,corrupt),/integrity check failed/);
});
