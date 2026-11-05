import test from 'node:test';
import assert from 'node:assert/strict';
import {previewBFF8HPIdentity} from '../bff8hp-identification-preview.js';
test('BF-F8HP preview requires explicit consent',async()=>{
 await assert.rejects(previewBFF8HPIdentity(),{code:'CONSENT_REQUIRED'});
});
test('BF-F8HP preview returns synthetic unconfirmed identity',async()=>{
 const result=await previewBFF8HPIdentity({consent:true});
 assert.equal(result.simulated,true);
 assert.equal(result.confirmedModel,false);
 assert.equal(result.readOnly,true);
 assert.equal(result.identityHex,'5052455649455700');
});
