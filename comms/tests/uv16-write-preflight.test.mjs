import test from 'node:test';
import assert from 'node:assert/strict';
import {assessUV16WriteReadiness,compareUV16FrequencyReadback,WRITE_BLOCKERS} from '../uv16-write-preflight.js';
const row=(name,rx='145.50000',tx='145.50000')=>({name,rx,tx,mode:'FM',receiveOnly:true});
test('write is never enabled by unverified claims or successful read',()=>{
 const report=assessUV16WriteReadiness({model:'uv-16-pro-v2',firmware:'HN5RV01',
 editorChannels:[row('UV16-M01')],rawBackupVerified:true,writeProtocolVerified:true,allFieldsVerified:true});
 assert.equal(report.canWrite,false);
 assert.equal(report.requiresSeparateHardwareAuthorisation,true);
 assert.equal(report.prepared,1);
});
test('read-only frequency data is insufficient to authorise hardware writing',()=>{
 const report=assessUV16WriteReadiness({model:'uv-16-pro-v2',firmware:'HN5RV01',editorChannels:[row('UV16-M128')]});
 assert.equal(report.prepared,1);
 assert.equal(report.proposed[0].slot,127);
 for(const blocker of Object.values(WRITE_BLOCKERS))assert.ok(report.blockers.includes(blocker));
});
test('invalid radio or duplicate channel mapping blocks readiness',()=>{
 const report=assessUV16WriteReadiness({model:'uv-32',firmware:'OTHER',editorChannels:[row('UV16-M01'),row('UV16-M01'),row('CUSTOM')]});
 assert.equal(report.canWrite,false);
 assert.ok(report.blockers.some(s=>s.includes('Duplicate')));
 assert.ok(report.blockers.some(s=>s.includes('No unambiguous')));
});
test('readback comparison verifies frequencies only, never settings or write',()=>{
 const proposed=[{slot:0,rx:145.5,tx:145.5},{slot:127,rx:440.125,tx:440.125}];
 const readback={firmware:'HN5RV01',capacity:128,channels:[...proposed]};
 const result=compareUV16FrequencyReadback({proposed,readback});
 assert.equal(result.frequenciesMatch,true);
 assert.equal(result.settingsVerified,false);
 assert.equal(result.writeVerified,false);
 assert.equal(result.checked,2);
});
test('missing and changed channels are identified by physical slot',()=>{
 const proposed=[{slot:0,rx:145.5,tx:145.5},{slot:12,rx:440.125,tx:440.125}];
 const readback={firmware:'HN5RV01',capacity:128,channels:[{slot:0,rx:145.6,tx:145.5}]};
 const result=compareUV16FrequencyReadback({proposed,readback});
 assert.equal(result.frequenciesMatch,false);assert.deepEqual(result.differences.map(x=>x.slot),[0,12]);
});
test('partial, duplicate or malformed readback is rejected',()=>{
 const p=[{slot:0,rx:145.5,tx:145.5}];
 assert.throws(()=>compareUV16FrequencyReadback({proposed:p,readback:{capacity:8,firmware:'HN5RV01',channels:[]}}));
 assert.throws(()=>compareUV16FrequencyReadback({proposed:p,readback:{capacity:128,firmware:'HN5RV01',channels:[p[0],p[0]]}}));
});
