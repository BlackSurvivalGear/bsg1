import test from 'node:test';
import assert from 'node:assert/strict';
import {captureUV16ReadRegions} from '../uv16-read-regions.js';
import {encodeUV16FrequencyBCD} from '../uv16-offline-frequency-codec.js';
import {createUV16WriteRehearsalDevice,rehearseUV16SingleChannelWrite} from '../uv16-single-channel-write-rehearsal.js';
function setup({ack=true,interrupt=false}={}){
 const bytes=new Uint8Array(2048).fill(255),slot=4,offset=slot*16;
 bytes.set(encodeUV16FrequencyBCD(145.225),offset);
 bytes.set(encodeUV16FrequencyBCD(145.225),offset+4);
 bytes.set(new Uint8Array(8).fill(0x44),offset+8);
 const auxiliary=new Map([0x1e80,0x1ec0,0x1fc0].map(x=>[x,new Uint8Array(64)]));
 const snapshot=captureUV16ReadRegions({firmware:'HN5RV01',channelBytes:bytes,auxiliary});
 return {snapshot,bytes,device:createUV16WriteRehearsalDevice({baseline:bytes,ack,interrupt}),args:{snapshot,slot,expectedRxMHz:145.225,expectedTxMHz:145.225,newRxMHz:145.325,newTxMHz:145.225}};
}
test('single occupied channel changes only RX BCD bytes; mock ACK and full readback pass',()=>{
 const {device,args,bytes}=setup();
 const r=rehearseUV16SingleChannelWrite({...args,device});
 assert.equal(r.pass,true);assert.equal(r.mockAck,true);assert.equal(r.canWrite,false);
 assert.equal(r.otherSlotsUnchanged,true);
 assert.deepEqual([...device.readback().slice(4*16+8,4*16+16)],[...bytes.slice(4*16+8,4*16+16)]);
});
test('mock NAK fails closed and leaves original bytes untouched',()=>{
 const {device,args,bytes}=setup({ack:false});
 const r=rehearseUV16SingleChannelWrite({...args,device});
 assert.equal(r.pass,false);assert.equal(r.mockAck,false);assert.deepEqual(device.readback(),bytes);
});
test('mock interruption fails closed',()=>{
 const {device,args}=setup({interrupt:true});
 const r=rehearseUV16SingleChannelWrite({...args,device});
 assert.equal(r.pass,false);assert.equal(r.interrupted,true);
});
test('rejects stale expected frequency, empty slot, and no-op',()=>{
 const {device,args,snapshot}=setup();
 assert.throws(()=>rehearseUV16SingleChannelWrite({...args,expectedRxMHz:145.125,device}),/stale slot/);
 assert.throws(()=>rehearseUV16SingleChannelWrite({...args,slot:5,device}),/Unused radio slot/);
 assert.throws(()=>rehearseUV16SingleChannelWrite({...args,newRxMHz:145.225,device}),/No frequency change/);
});
test('rejects arbitrary device or incorrect baseline',()=>{
 const {args,bytes}=setup();
 assert.throws(()=>rehearseUV16SingleChannelWrite({...args,device:{}}),/In-memory/);
 const altered=bytes.slice();altered[0]=0;
 assert.throws(()=>rehearseUV16SingleChannelWrite({...args,device:createUV16WriteRehearsalDevice({baseline:altered})}),/baseline differs/);
});
