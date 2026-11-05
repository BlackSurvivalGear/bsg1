import test from 'node:test';
import assert from 'node:assert/strict';
import {MODELS} from '../models.js';
import {previewRadioIdentity} from '../radio-identity-preview.js';
test('every supported radio offers an offline identity preview',async()=>{
 for(const {id} of MODELS){
  const result=await previewRadioIdentity(id,{consent:true});
  assert.equal(result.model,id);
  assert.equal(result.simulated,true);
  assert.equal(result.confirmedModel,false);
  assert.match(result.display,/no USB used/);
 }
});
test('preview requires consent and a supported model',async()=>{
 await assert.rejects(previewRadioIdentity('uv-5r'),/consent/);
 await assert.rejects(previewRadioIdentity('not-a-model',{consent:true}),/Unsupported/);
});
