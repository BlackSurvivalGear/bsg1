import test from 'node:test';
import assert from 'node:assert/strict';
import {captureUV16ReadRegions} from '../uv16-read-regions.js';
import {assessUV16BackupCoverage,simulateUV16MockRecovery} from '../uv16-backup-recovery-audit.js';
function fixture(){
 const baseline=new Uint8Array(2048).fill(0xff);
 for(const slot of [2,5])baseline.set([0x50,0x22,0x45,0x01,0x50,0x22,0x45,0x01,0,0,0,0,0,0,0,0x44],slot*16);
 const target=baseline.slice();target[34]=0x46;target[82]=0x46;
 return {baseline,target};
}
test('snapshot coverage detects missing CHIRP reference regions without claiming full backup',()=>{
 const {baseline}=fixture();
 const auxiliary=new Map([0x1e80,0x1ec0,0x1fc0].map(address=>[address,new Uint8Array(64)]));
 const snapshot=captureUV16ReadRegions({firmware:'HN5RV01',channelBytes:baseline,auxiliary});
 const report=assessUV16BackupCoverage(snapshot);
 assert.deepEqual(report.additionalCHIRPReferenceRegions,[0x1f00,0x1f40,0x1f80]);
 assert.equal(report.restorable,false);
 assert.equal(report.fullMemoryMapVerified,false);
 assert.equal(report.canWrite,false);
 assert.throws(()=>assessUV16BackupCoverage({...snapshot,integrity:{...snapshot.integrity,value:'00000000'}}),/integrity/);
});
test('partial mock upload can be reversed with separate simulated transfer',()=>{
 const {baseline,target}=fixture();
 const report=simulateUV16MockRecovery({baseline,target,failAt:64});
 assert.equal(report.uploadStopped,true);
 assert.equal(report.partialStateMatchesBaseline,false);
 assert.equal(report.partialStateMatchesTarget,false);
 assert.equal(report.simulatedRestoreAttempted,true);
 assert.equal(report.simulatedRestoreStopped,false);
 assert.equal(report.simulatedRestorationMatchesBaseline,true);
 assert.equal(report.realRestorationDemonstrated,false);
 assert.equal(report.canWrite,false);
});
test('interruption before first block requires no simulated restore',()=>{
 const {baseline,target}=fixture();
 const report=simulateUV16MockRecovery({baseline,target,failAt:0});
 assert.equal(report.partialStateMatchesBaseline,true);
 assert.equal(report.simulatedRestoreAttempted,false);
 assert.equal(report.realRestorationDemonstrated,false);
});
test('invalid mock inputs fail closed',()=>{
 const {baseline,target}=fixture();
 assert.throws(()=>simulateUV16MockRecovery({baseline,target,failAt:3}),/failure address/);
 assert.throws(()=>simulateUV16MockRecovery({baseline:new Uint8Array(3),target}),/2048-byte/);
});
