import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeUV16FrequencyBCD} from '../uv16-offline-frequency-codec.js';
import {prepareUV16HardwareChange,writeUV16OneChannel,compareUV16HardwareReadback} from '../uv16-hardware-write.js';
const AUX=[0x1ec0,0x1f00,0x1f40,0x1f80,0x1fc0];
const toHex=b=>Buffer.from(b).toString('hex');
function setup(){
 const memory=new Uint8Array(6144).fill(255);
 memory.set(encodeUV16FrequencyBCD(145.225),16);
 memory.set(encodeUV16FrequencyBCD(145.225),20);
 memory.set(new Uint8Array(8).fill(0x44),24);
 const aux=new Map(AUX.map(x=>[x,new Uint8Array(64).fill(0)]));
 aux.get(0x1ec0).set(Buffer.from('HN5RV01'),48);
 const capture={format:'bsg-uv16-full-main-read-v1',firmware:'HN5RV01',readOnly:true,restorable:false,
  main:{start:0,length:6144,bytesHex:toHex(memory)},
  auxiliary:AUX.map(address=>({address,bytesHex:toHex(aux.get(address))}))};
 return {memory,aux,capture};
}
function radio(memory,aux,{ack=true,changed=false}={}){
 const queue=[];let magic=0,identified=false,idAck=false;
 const writes=[],buffer=memory.slice(),blocks=new Map(aux);
 if(changed)buffer[16]=0x99;
 const port={
  readable:{getReader:()=>({read:async()=>({done:false,value:queue.shift()??new Uint8Array()}),releaseLock(){},cancel:async()=>{}})},
  writable:{getWriter:()=>({write:async payload=>{
   const bytes=[...payload];writes.push(bytes);
   if(bytes.length===1&&magic<7){
    if(bytes[0]!==[0x50,0xbb,0xff,0x20,0x12,0x07,0x25][magic])throw Error('Magic mismatch');
    if(++magic===7)queue.push(Uint8Array.of(6));return;
   }
   if(bytes.length===1&&bytes[0]===2){queue.push(Uint8Array.from([0xaa,0x30,0x76,4,0,5,0x20,0xdd]));identified=true;return;}
   if(bytes.length===1&&bytes[0]===6&&!idAck){queue.push(Uint8Array.of(6));idAck=true;return;}
   if(bytes.length===4&&bytes[0]===0x53){
    const addr=bytes[1]*256+bytes[2];const data=blocks.get(addr)??buffer.slice(addr,addr+64);
    queue.push(Uint8Array.from([6,0x58,bytes[1],bytes[2],64,...data]));return;
   }
   if(bytes.length===20&&bytes[0]===0x58){
    const addr=bytes[1]*256+bytes[2];
    if(ack){buffer.set(bytes.slice(4),addr);queue.push(Uint8Array.of(6));}
    else queue.push(Uint8Array.of(0x15));
    return;
   }
   if(bytes.length===1&&bytes[0]===6)return;
   throw Error('Unexpected radio command');
  },releaseLock(){}})}
 };
 return {port,writes,buffer};
}
test('one real-protocol block only: RX changed, TX and other bytes retained; separate full readback verifies',async()=>{
 const {memory,aux,capture}=setup();const d=radio(memory,aux);
 const result=await writeUV16OneChannel({port:d.port,capture,slot:1,newRxMHz:145.325,consent:true});
 assert.equal(result.status,'ACK_RECEIVED_NOT_VERIFIED');
 assert.equal(d.writes.filter(x=>x.length===20&&x[0]===0x58).length,1);
 assert.equal(d.writes.filter(x=>x.length===20&&x[0]===0x58)[0][1]*256+d.writes.filter(x=>x.length===20&&x[0]===0x58)[0][2],16);
 assert.deepEqual(d.buffer.slice(20,32),memory.slice(20,32));
 assert.deepEqual(d.buffer.slice(0,16),memory.slice(0,16));
 const after={...capture,main:{...capture.main,bytesHex:toHex(d.buffer)}};
 assert.equal(compareUV16HardwareReadback({plan:result.plan,capture:after}).verified,true);
 after.auxiliary=[...capture.auxiliary.slice(0,1),{...capture.auxiliary[1],bytesHex:'ff'.repeat(64)},...capture.auxiliary.slice(2)];
 assert.equal(compareUV16HardwareReadback({plan:result.plan,capture:after}).verified,false);
});
test('requires consent and rejects unoccupied memory before sending bytes',async()=>{
 const {memory,aux,capture}=setup();const d=radio(memory,aux);
 await assert.rejects(writeUV16OneChannel({port:d.port,capture,slot:1,newRxMHz:145.325}),/confirmation required/);
 await assert.rejects(writeUV16OneChannel({port:d.port,capture,slot:2,newRxMHz:145.325,consent:true}),/Unused radio slot/);
 assert.equal(d.writes.length,0);
});
test('live baseline mismatch prevents any X write',async()=>{
 const {memory,aux,capture}=setup();const d=radio(memory,aux,{changed:true});
 await assert.rejects(writeUV16OneChannel({port:d.port,capture,slot:1,newRxMHz:145.325,consent:true}),/differs from captured baseline/);
 assert.equal(d.writes.some(x=>x[0]===0x58&&x.length===20),false);
});
test('NAK after one attempted write requires readback and no automatic retry',async()=>{
 const {memory,aux,capture}=setup();const d=radio(memory,aux,{ack:false});
 await assert.rejects(writeUV16OneChannel({port:d.port,capture,slot:1,newRxMHz:145.325,consent:true}),/UNKNOWN/);
 assert.equal(d.writes.filter(x=>x[0]===0x58&&x.length===20).length,1);
});
test('preflight protects all TX bytes and reserved settings',()=>{
 const {capture}=setup();
 const p=prepareUV16HardwareChange({capture,slot:1,newRxMHz:145.325});
 assert.deepEqual(Buffer.from(p.beforeHex,'hex').subarray(4),Buffer.from(p.afterHex,'hex').subarray(4));
 assert.throws(()=>prepareUV16HardwareChange({capture,slot:1,newRxMHz:145.225}),/RX frequency only/);
});

// Regression: a refused handshake never sends the X write frame. After a
// power cycle the full readback must classify the unchanged radio as intact.
test('full readback after refused handshake confirms original 6144 bytes and auxiliary regions unchanged',()=>{
 const {capture}=setup();
 const plan=prepareUV16HardwareChange({capture,slot:1,newRxMHz:145.325});
 const result=compareUV16HardwareReadback({plan,capture});
 assert.equal(result.status,'UNCHANGED');
 assert.equal(result.unchanged,true);
 assert.equal(result.readbackMatches,true);
 assert.equal(result.verified,false);
 assert.equal(result.originalMainMatches,true);
 assert.equal(result.auxiliaryMatches,true);
});
test('one-slot RX write is classified as changed only when complete main and auxiliary match',()=>{
 const {capture}=setup();
 const plan=prepareUV16HardwareChange({capture,slot:1,newRxMHz:145.325});
 const changed=Buffer.from(capture.main.bytesHex,'hex');
 Buffer.from(plan.afterHex,'hex').copy(changed,16);
 const result=compareUV16HardwareReadback({plan,capture:{...capture,main:{...capture.main,bytesHex:changed.toString('hex')}}});
 assert.equal(result.status,'CHANGE_VERIFIED');
 assert.equal(result.verified,true);
 assert.equal(result.unchanged,false);
 assert.equal(result.originalMainMatches,false);
 assert.equal(result.auxiliaryMatches,true);
});
test('unexpected main byte change or auxiliary difference is a mismatch, never unchanged or verified',()=>{
 const {capture}=setup();
 const plan=prepareUV16HardwareChange({capture,slot:1,newRxMHz:145.325});
 const changed=Buffer.from(capture.main.bytesHex,'hex');changed[4096]=0;
 const mainResult=compareUV16HardwareReadback({plan,capture:{...capture,main:{...capture.main,bytesHex:changed.toString('hex')}}});
 assert.equal(mainResult.status,'MISMATCH');
 assert.equal(mainResult.readbackMatches,false);
 assert.equal(mainResult.verified,false);
 const auxCapture={...capture,auxiliary:capture.auxiliary.map((x,i)=>i===4?{...x,bytesHex:'ff'.repeat(64)}:x)};
 const auxResult=compareUV16HardwareReadback({plan,capture:auxCapture});
 assert.equal(auxResult.status,'MISMATCH');
 assert.equal(auxResult.unchanged,false);
 assert.equal(auxResult.auxiliaryMatches,false);
});
test('invalid and truncated full readback cannot report success',()=>{
 const {capture}=setup();
 const plan=prepareUV16HardwareChange({capture,slot:1,newRxMHz:145.325});
 assert.throws(()=>compareUV16HardwareReadback({plan,capture:{...capture,main:{...capture.main,bytesHex:capture.main.bytesHex.slice(2)}}}),/Complete HN5RV01 full-read evidence required/);
 assert.throws(()=>compareUV16HardwareReadback({plan,capture:{...capture,firmware:'OTHER'}}),/Complete HN5RV01 full-read evidence required/);
 assert.throws(()=>compareUV16HardwareReadback({plan:{...plan,beforeHex:'ff'.repeat(16)},capture}),/disagree/);
});
