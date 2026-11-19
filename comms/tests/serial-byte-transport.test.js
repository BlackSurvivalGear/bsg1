import test from 'node:test';
import assert from 'node:assert/strict';
import {SerialByteTransport} from '../serial-byte-transport.js';
function port(values=[]){
 const state={reads:0,cancelled:false};
 return {state,readable:{getReader(){return {
  read:async()=>{state.reads++;return values.shift()??{done:true};},
  cancel:async()=>{state.cancelled=true;},
  releaseLock(){}
 };}},writable:{}};
}
test('reads exact bytes and buffers extras',async()=>{
 const p=port([{value:Uint8Array.of(1,2,3,4),done:false}]),t=new SerialByteTransport({port:p});
 assert.deepEqual([...await t.read(2)],[1,2]);assert.deepEqual([...await t.read(2)],[3,4]);
 assert.equal(p.state.reads,1);
});
test('assembles fragmented reads',async()=>{
 const p=port([{value:Uint8Array.of(1),done:false},{value:Uint8Array.of(2,3),done:false}]);
 assert.deepEqual([...await new SerialByteTransport({port:p}).read(3)],[1,2,3]);
});
test('fails on device disconnect',async()=>{
 await assert.rejects(new SerialByteTransport({port:port([])}).read(1),{code:'DISCONNECTED'});
});
test('rejects outgoing commands and excessive read lengths',async()=>{
 const t=new SerialByteTransport({port:port([]),maxRead:64});
 await assert.rejects(t.write(Uint8Array.of(1)),{code:'HARDWARE_UNVERIFIED'});
 await assert.rejects(t.read(65),{code:'INVALID_LENGTH'});
});
test('pre-aborted read cannot access radio',async()=>{
 const p=port([]),t=new SerialByteTransport({port:p}),controller=new AbortController();controller.abort();
 await assert.rejects(t.read(1,{signal:controller.signal}),{code:'ABORTED'});assert.equal(p.state.reads,0);
});
test('times out and cancels a pending reader',async()=>{
 const state={cancelled:false};let finish;
 const p={readable:{getReader(){return {read:()=>new Promise(resolve=>finish=resolve),cancel:async()=>{state.cancelled=true;finish?.({done:true});},releaseLock(){}};}},writable:{}};
 await assert.rejects(new SerialByteTransport({port:p,timeoutMs:100}).read(1),{code:'TIMEOUT'});
 assert.equal(state.cancelled,true);
});
test('refuses operations after close',async()=>{
 const t=new SerialByteTransport({port:port([])});t.close();
 await assert.rejects(t.read(1),{code:'CLOSED'});
});
