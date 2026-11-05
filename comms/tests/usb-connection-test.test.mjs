import test from 'node:test';
import assert from 'node:assert/strict';
import {ConnectionManager,SERIAL_OPTIONS} from '../connection.js';
function fixture({cancel=false,failOpen=false,failClose=false}={}){
 const calls=[],port={
  getInfo:()=>({usbVendorId:0x1a86,usbProductId:0x7523}),
  async open(options){calls.push(['open',options]);if(failOpen)throw Error('Port busy');},
  async close(){calls.push(['close']);if(failClose)throw Error('Close blocked');},
  get readable(){throw Error('Must not read from radio');},
  get writable(){throw Error('Must not write to radio');}
 };
 const serial={async requestPort(){calls.push(['request']);if(cancel){const e=Error('Cancelled');e.name='NotFoundError';throw e;}return port;}};
 return {serial,calls};
}
test('USB test opens and closes transport, reports adapter IDs, leaves connection disconnected',async()=>{
 const f=fixture(),logs=[],manager=new ConnectionManager({serial:f.serial,onLog:x=>logs.push(x)});
 const result=await manager.testUSBConnection();
 assert.deepEqual(f.calls,[['request'],['open',SERIAL_OPTIONS],['close']]);
 assert.deepEqual(result,{status:'passed',info:{vendorId:'0x1A86',productId:'0x7523'},baudRate:9600,radioIdentity:'Unverified'});
 assert.equal(manager.snapshot().state,'disconnected');
 assert.match(logs.join(' '),/no radio commands sent/);
});
test('USB test handles picker cancellation',async()=>{
 const f=fixture({cancel:true}),manager=new ConnectionManager({serial:f.serial});
 assert.deepEqual(await manager.testUSBConnection(),{status:'cancelled'});
 assert.deepEqual(f.calls,[['request']]);
});
test('USB test reports open failure and closes selected port',async()=>{
 const f=fixture({failOpen:true}),manager=new ConnectionManager({serial:f.serial});
 await assert.rejects(manager.testUSBConnection(),/Port busy/);
 assert.deepEqual(f.calls,[['request'],['open',SERIAL_OPTIONS],['close']]);
});
test('USB test reports close failure',async()=>{
 const f=fixture({failClose:true}),manager=new ConnectionManager({serial:f.serial});
 await assert.rejects(manager.testUSBConnection(),/Close blocked/);
 assert.equal(manager.snapshot().state,'disconnected');
});
test('USB test is blocked while simulator connected',async()=>{
 const f=fixture(),manager=new ConnectionManager({serial:f.serial});
 manager.connectSimulator();
 await assert.rejects(manager.testUSBConnection(),/Disconnect/);
 assert.deepEqual(f.calls,[]);
});
test('USB test fails clearly when browser lacks Web Serial',async()=>{
 await assert.rejects(new ConnectionManager().testUSBConnection(),/Web Serial is unavailable/);
});
