import test from 'node:test';
import assert from 'node:assert/strict';
import {readUV16WebsiteSample,formatUV16Sample} from '../uv16-website-read.js';
const connection={state:'connected',mode:'usb',port:{readable:{},writable:{}}};
const sample={readOnly:true,firmware:'HN5RV01',channels:Array.from({length:6},(_,slot)=>({slot,rx:140+slot,tx:140+slot}))};
function fakeSession(writes){return class{constructor({port}){assert.equal(port,connection.port);}async readSample(){writes.push('read');return sample;}};}
test('explicit consent and real USB connection required',async()=>{
 const writes=[];
 for(const args of [{consent:false,connection,model:'uv-16-pro-v2'},
  {consent:true,connection:{...connection,mode:'simulation'},model:'uv-16-pro-v2'},
  {consent:true,connection,model:'uv-32'}]){
   await assert.rejects(readUV16WebsiteSample({...args,Session:fakeSession(writes)}));
 }
 assert.deepEqual(writes,[]);
});
test('six-memory read returns preview without touching the editor',async()=>{
 const writes=[];
 const result=await readUV16WebsiteSample({consent:true,connection,model:'uv-16-pro-v2',Session:fakeSession(writes)});
 assert.deepEqual(writes,['read']);
 assert.equal(result.channels.length,6);
 assert.equal(result.hardwareVerified,false);
 assert.match(formatUV16Sample(result),/Memory 1: RX 140\.00000 MHz/);
 assert.match(formatUV16Sample(result),/Saved channel editor unchanged/);
});
test('reject malformed response',async()=>{
 const broken={...sample,channels:[{slot:0,rx:NaN,tx:120}]};
 await assert.rejects(readUV16WebsiteSample({consent:true,connection,model:'uv-16-pro-v2',
  Session:class{async readSample(){return broken;}}}),/Unexpected sample response|Invalid radio memory/);
});
