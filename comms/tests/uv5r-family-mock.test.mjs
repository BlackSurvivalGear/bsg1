import test from 'node:test';
import assert from 'node:assert/strict';
import {runFamilyMockRead} from '../uv5r-family-mock.js';
for(const model of ['uv-5r','bf-f8hp']){
 test(model+' offline simulator validates framed 64-byte read',async()=>{
  const result=await runFamilyMockRead(model);
  assert.equal(result.model,model);
  assert.equal(result.mock,true);
  assert.equal(result.blockLength,64);
  assert.deepEqual(result.request,[0x53,0,0x40,0x40]);
 });
}
test('unsupported radio cannot run UV-5R protocol mock',async()=>{
 await assert.rejects(runFamilyMockRead('uv-16-pro-v2'),/Unsupported mock protocol model/);
});
