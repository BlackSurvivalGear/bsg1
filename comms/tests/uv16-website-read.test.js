import test from 'node:test';
import assert from 'node:assert/strict';
import {readUV16WebsiteSample,formatUV16Sample} from '../uv16-website-read.js';
const connection={state:'connected',mode:'usb',port:{readable:{},writable:{}}};
const sample={readOnly:true,firmware:'HN5RV01',capacity:128,channels:Array.from({length:6},(_,slot)=>({slot,rx:140+slot,tx:140+slot}))};
function fakeSession(writes){return class{constructor({port}){assert.equal(port,connection.port);}async readMemory(){writes.push('read');return sample;}};}
test('explicit consent and real USB connection required',async()=>{
 const writes=[];
 for(const args of [{consent:false,connection,model:'uv-16-pro-v2'},
  {consent:true,connection:{...connection,mode:'simulation'},model:'uv-16-pro-v2'},
  {consent:true,connection,model:'uv-32'}]){
   await assert.rejects(readUV16WebsiteSample({...args,Session:fakeSession(writes)}));
 }
 assert.deepEqual(writes,[]);
});
test('full-memory read returns actual populated channels without touching the editor',async()=>{
 const writes=[];
 const result=await readUV16WebsiteSample({consent:true,connection,model:'uv-16-pro-v2',Session:fakeSession(writes)});
 assert.deepEqual(writes,['read']);
 assert.equal(result.channels.length,6);
 assert.equal(result.hardwareVerified,false);
 assert.match(formatUV16Sample(result),/Scanned 128 memory locations/);
 assert.match(formatUV16Sample(result),/Read complete — 6 programmed channels found/);
});
test('reject malformed response',async()=>{
 const broken={...sample,channels:[{slot:0,rx:NaN,tx:120}]};
 await assert.rejects(readUV16WebsiteSample({consent:true,connection,model:'uv-16-pro-v2',
  Session:class{async readMemory(){return broken;}}}),/Unexpected memory response|Invalid radio memory/);
});

test('empty 128-slot image is a valid read and imported count is zero',async()=>{
 const result=await readUV16WebsiteSample({consent:true,connection,model:'uv-16-pro-v2',
 Session:class{async readMemory(){return {...sample,channels:[]};}}});
 assert.equal(result.channels.length,0);
 assert.match(formatUV16Sample(result),/0 programmed channels found/);
});
test('rejects out-of-range memory slots and unsupported capacity',async()=>{
 await assert.rejects(readUV16WebsiteSample({consent:true,connection,model:'uv-16-pro-v2',
 Session:class{async readMemory(){return {...sample,channels:[{slot:128,rx:145,tx:145}]};}}}),/Invalid radio memory/);
 await assert.rejects(readUV16WebsiteSample({consent:true,connection,model:'uv-16-pro-v2',
 Session:class{async readMemory(){return {...sample,capacity:256};}}}),/Unexpected memory response/);
});

test('continues supplied identified session without creating another session',async()=>{
 const writes=[],session={readMemory:async()=>{writes.push('continue');return sample;}};
 const result=await readUV16WebsiteSample({consent:true,connection,model:'uv-16-pro-v2',
  identifiedSession:session,Session:class{constructor(){throw Error('unexpected new handshake');}}});
 assert.equal(result.channels.length,6);
 assert.deepEqual(writes,['continue']);
});
