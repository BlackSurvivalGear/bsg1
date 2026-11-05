import test from 'node:test';
import assert from 'node:assert/strict';
import {NativeRadioDriver} from '../native-driver.js';
import {VirtualRadio} from '../virtual-radio.js';
test('simulator identifies itself and returns isolated channel copies', async()=>{
  const radio=new VirtualRadio();
  const driver=new NativeRadioDriver({transport:radio});
  assert.deepEqual(await driver.identify(),{model:'uv-16-pro-v2',simulated:true,firmware:'BSG-VIRTUAL-1'});
  const memory=await driver.readMemory();
  assert.equal(memory.channels.length,2);
  memory.channels[0].name='CHANGED';
  assert.equal((await driver.readMemory()).channels[0].name,'SIM CALL');
});
test('rejects physical transports before protocol verification',async()=>{
  const driver=new NativeRadioDriver({transport:{kind:'usb',exchange:async()=>{throw Error('Must not execute');}}});
  await assert.rejects(driver.identify(),{code:'HARDWARE_UNVERIFIED'});
  await assert.rejects(driver.readMemory(),{code:'HARDWARE_UNVERIFIED'});
  await assert.rejects(driver.writeMemory(),{code:'WRITE_DISABLED'});
});
test('rejects mismatched model, unsupported operations and disconnects',async()=>{
  const radio=new VirtualRadio();
  await assert.rejects(radio.exchange({operation:'identify',model:'uv-5r'}),{code:'MODEL_MISMATCH'});
  await assert.rejects(radio.exchange({operation:'write-memory',model:'uv-16-pro-v2'}),{code:'UNSUPPORTED_OPERATION'});
  radio.disconnect();
  await assert.rejects(radio.exchange({operation:'identify',model:'uv-16-pro-v2'}),{code:'DISCONNECTED'});
});
test('handles cancellation and resets driver state',async()=>{
  const driver=new NativeRadioDriver({transport:new VirtualRadio()});
  const controller=new AbortController();controller.abort();
  await assert.rejects(driver.readMemory({signal:controller.signal}),{code:'ABORTED'});
  assert.equal(driver.state,'idle');
});
test('rejects invalid simulator identity and memory response',async()=>{
  const transport={kind:'simulation',exchange:async()=>({simulated:false,model:'uv-16-pro-v2'})};
  const driver=new NativeRadioDriver({transport});
  await assert.rejects(driver.identify(),{code:'IDENTITY_MISMATCH'});
  await assert.rejects(driver.readMemory(),{code:'INVALID_RESPONSE'});
});
