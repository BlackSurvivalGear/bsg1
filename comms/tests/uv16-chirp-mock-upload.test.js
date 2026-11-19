import test from 'node:test';
import assert from 'node:assert/strict';
import {createUV16MockRadio,simulateCHIRPUpload} from '../uv16-chirp-mock-upload.js';
function fixture(){
 const before=new Uint8Array(2048).fill(0xff);
 before.set([0x50,0x22,0x45,0x01,0x50,0x22,0x45,0x01,0,0,0,0,0,0,0,0x44],32);
 const after=before.slice();after[34]=0x46;
 return {before,after};
}
test('single RX frequency byte change is simulated and preserved outside target',()=>{
 const {before,after}=fixture();
 const simulator=createUV16MockRadio({memory:before});
 const report=simulateCHIRPUpload({before,after,simulator});
 assert.deepEqual(report.changedByteOffsets,[34]);
 assert.equal(report.steps.length,1);
 assert.equal(report.steps[0].address,0);
 assert.equal(report.simulatedReadbackMatches,true);
 assert.equal(report.canWrite,false);
 assert.equal(report.deviceProtocolVerified,false);
 assert.equal(report.restorableBackupVerified,false);
 assert.deepEqual(simulator.snapshot(),after);
 assert.equal(before[34],0x45);
});
test('mock NAK stops and never claims successful readback',()=>{
 const {before,after}=fixture();
 const simulator=createUV16MockRadio({memory:before,ackFailures:[0]});
 const report=simulateCHIRPUpload({before,after,simulator});
 assert.equal(report.stopped,true);
 assert.match(report.error,/NAK/);
 assert.equal(report.simulatedReadbackMatches,false);
 assert.deepEqual(simulator.snapshot(),before);
});
test('mock interruption stops and does not pretend rollback',()=>{
 const {before,after}=fixture();
 const simulator=createUV16MockRadio({memory:before,interruptAt:0});
 const report=simulateCHIRPUpload({before,after,simulator});
 assert.equal(report.stopped,true);
 assert.match(report.error,/interrupted/);
 assert.equal(report.canWrite,false);
});
test('refuses invalid images, no changes, reserved fields and empty slots',()=>{
 const {before,after}=fixture();
 const simulator=createUV16MockRadio({memory:before});
 assert.throws(()=>simulateCHIRPUpload({before,after:before,simulator}),/No changed bytes/);
 const reserved=after.slice();reserved[40]=1;
 assert.throws(()=>simulateCHIRPUpload({before,after:reserved,simulator}),/outside occupied/);
 const empty=after.slice();empty[160]=0;
 assert.throws(()=>simulateCHIRPUpload({before,after:empty,simulator}),/outside occupied/);
 assert.throws(()=>simulateCHIRPUpload({before,after,simulator:{}}),/in-memory simulator/);
 assert.throws(()=>createUV16MockRadio({memory:new Uint8Array(10)}),/2048/);
});
test('stale mock baseline rejected',()=>{
 const {before,after}=fixture();
 const simulator=createUV16MockRadio({memory:after});
 assert.throws(()=>simulateCHIRPUpload({before,after,simulator}),/initial state/);
});
