import test from 'node:test';
import assert from 'node:assert/strict';
import {runBF8HPOfflineIdentification} from '../bff8hp-offline-readiness.js';
test('BF-F8HP mock handshake succeeds but never confirms hardware or model',async()=>{
 const r=await runBF8HPOfflineIdentification();
 assert.equal(r.candidateModel,'bf-f8hp');
 assert.equal(r.confirmedModel,false);
 assert.equal(r.hardwareVerified,false);
 assert.equal(r.simulated,true);
 assert.equal(r.readOnly,true);
});
test('BF-F8HP mock rejects invalid acknowledgement',async()=>{
 await assert.rejects(runBF8HPOfflineIdentification({responses:[[0],[1,2,3,4,5,6,7,8]]}),{code:'IDENTIFICATION_REJECTED'});
});
test('BF-F8HP mock rejects truncated identity',async()=>{
 await assert.rejects(runBF8HPOfflineIdentification({responses:[[6],[1,2]]}),{code:'INVALID_RESPONSE'});
});
test('BF-F8HP mock rejects extra fixture data',async()=>{
 await assert.rejects(runBF8HPOfflineIdentification({responses:[[6],[1,2,3,4,5,6,7,8],[6]]}),{code:'INVALID_RESPONSE'});
});
test('BF-F8HP mock enforces timeout',async()=>{
 await assert.rejects(runBF8HPOfflineIdentification({delayMs:40,timeoutMs:5}),{code:'TIMEOUT'});
});
test('BF-F8HP mock supports cancellation',async()=>{
 const c=new AbortController();
 const p=runBF8HPOfflineIdentification({delayMs:40,signal:c.signal});
 c.abort();
 await assert.rejects(p,{code:'ABORTED'});
});
test('BF-F8HP mock refuses invalid timeouts',async()=>{
 await assert.rejects(runBF8HPOfflineIdentification({timeoutMs:0}),{code:'INVALID_TIMEOUT'});
});
