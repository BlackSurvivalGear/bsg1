import test from 'node:test';
import assert from 'node:assert/strict';
import {UV16ReadOnlySession} from '../uv16-read-only-wire.js';
const fromHex=s=>Uint8Array.from(s.split(' ').map(x=>parseInt(x,16)));
const rows=[
'00 25 01 14 00 25 01 14 00 00 00 00 00 00 00 44',
'00 25 52 14 00 25 52 14 00 00 00 00 00 00 00 44',
'00 25 03 15 00 25 03 15 00 00 00 00 00 00 00 44',
'ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff',
'00 25 01 44 00 25 01 44 00 00 00 00 00 00 00 44',
'00 25 52 44 00 25 52 44 00 00 00 00 00 00 00 44',
'00 25 03 45 00 25 03 45 00 00 00 00 00 00 00 44',
'ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff'
];
function device({badHeader=false,badFirmware=false,badIdentity=false,failAt=-1,extraSlot=-1}={}){
 const chunks=[];let writes=[];let magic=0;let idAck=false;
 const queue=arr=>chunks.push(Uint8Array.from(arr));
 const port={
  readable:{getReader:()=>({read:async()=>({done:false,value:chunks.shift()??new Uint8Array(0)}),releaseLock(){},cancel:async()=>{}})},
  writable:{getWriter:()=>({write:async b=>{
   const data=[...b];writes.push(data);
   if(data.length===1&&magic<7){if(data[0]!==[0x50,0xbb,0xff,0x20,0x12,0x07,0x25][magic])throw Error('Bad magic');magic++;if(magic===7)queue([6]);return;}
   if(data.length===1&&data[0]===2){queue(badIdentity?[0,0,0,0,0,0,0,0]:[0xaa,0x30,0x76,4,0,5,0x20,0xdd]);return;}
   if(data.length===1&&data[0]===6&&!idAck){idAck=true;queue([6]);return;}
   if(data.length===4&&data[0]===0x53){
    const addr=data[1]*256+data[2],body=new Uint8Array(64).fill(255);
    if(addr===0x1ec0)body.set([...Buffer.from(badFirmware?'UNKNOWN':'HN5RV01')].slice(0,7),48);
    if(addr===failAt)throw Error('Simulated missing read block');
    if(addr===0)for(let i=0;i<4;i++)body.set(fromHex(rows[i]),i*16);
    if(addr===64)for(let i=0;i<4;i++)body.set(fromHex(rows[i+4]),i*16);
    if(extraSlot>=8&&addr===Math.floor(extraSlot/4)*64)body.set(fromHex(rows[0]),(extraSlot%4)*16);
    queue([6,badHeader?0x59:0x58,data[1],data[2],64,...body]);return;
   }
   if(data.length===1&&data[0]===6)return;
   throw Error('Unexpected protocol command');
  },releaseLock(){}})}
 };
 return {port,writes};
}
test('reads all 128 memory slots and returns exactly six populated channels',async()=>{
 const d=device(),session=new UV16ReadOnlySession({port:d.port});
 const result=await session.readMemory();
 assert.deepEqual(result.channels.map(c=>c.rx),[140.125,145.225,150.325,440.125,445.225,450.325]);
 assert.deepEqual(result.channels.map(c=>c.tx),result.channels.map(c=>c.rx));
 assert.equal(result.hardwareVerified,false);
 assert.equal(result.capacity,128);
 assert.equal(d.writes.filter(x=>x[0]===0x53).length,35);
 assert.equal(d.writes.some(x=>x[0]===0x53&&x[1]===0x07&&x[2]===0xc0),true);
 assert.equal(d.writes.some(x=>x.includes(0x57)),false);
});
test('reject corrupt frame',async()=>{
 await assert.rejects(new UV16ReadOnlySession({port:device({badHeader:true}).port}).readMemory(),{code:'BAD_FRAME'});
});
test('reject unknown firmware',async()=>{
 await assert.rejects(new UV16ReadOnlySession({port:device({badFirmware:true}).port}).readMemory(),{code:'WRONG_FIRMWARE'});
});
test('reject wrong identity before memory requests',async()=>{
 const d=device({badIdentity:true});
 await assert.rejects(new UV16ReadOnlySession({port:d.port}).readMemory(),{code:'WRONG_IDENTITY'});
 assert.equal(d.writes.some(x=>x[0]===0x53),false);
});
test('cancelled session sends no bytes',async()=>{
 const controller=new AbortController();controller.abort();
 const d=device();
 await assert.rejects(new UV16ReadOnlySession({port:d.port}).readMemory({signal:controller.signal}),{code:'ABORTED'});
 assert.equal(d.writes.length,0);
});
test('session is single-use and cannot write arbitrary commands',async()=>{
 const session=new UV16ReadOnlySession({port:device().port});
 assert.equal('write' in session,false);
 await session.readMemory();
 await assert.rejects(session.readMemory(),{code:'SESSION_USED'});
});

test('finds additional programmed memories beyond the original first eight',async()=>{
 const d=device({extraSlot:127}),progress=[];
 const result=await new UV16ReadOnlySession({port:d.port}).readMemory({onProgress:p=>progress.push(p)});
 assert.equal(result.channels.length,7);
 assert.equal(result.channels.at(-1).slot,127);
 assert.equal(progress.length,32);
 assert.deepEqual(progress.at(-1),{blocksRead:32,totalBlocks:32});
});
test('incomplete full-memory transfer rejects without returning partial channels',async()=>{
 const d=device({failAt:128});
 await assert.rejects(new UV16ReadOnlySession({port:d.port}).readMemory(),/Simulated missing read block/);
 assert.equal(d.writes.some(x=>x[0]===0x57),false);
});

test('identify checks firmware with one allowlisted read and no channel scan',async()=>{
 const d=device();
 const session=new UV16ReadOnlySession({port:d.port});
 const identity=await session.identify();
 assert.equal(identity.firmware,'HN5RV01');
 assert.equal(identity.model,'uv-16-pro-v2');
 assert.equal(identity.readOnly,true);
 assert.equal(identity.hardwareVerified,false);
 const reads=d.writes.filter(cmd=>cmd[0]===0x53);
 assert.equal(reads.length,1);
 assert.deepEqual(reads[0],[0x53,0x1e,0xc0,64]);
 assert.equal(d.writes.some(cmd=>cmd[0]===0x57),false);
 await assert.rejects(session.identify(),{code:'SESSION_USED'});
});
test('identity rejects wrong firmware without scanning memories',async()=>{
 const d=device({badFirmware:true});
 await assert.rejects(new UV16ReadOnlySession({port:d.port}).identify(),{code:'WRONG_FIRMWARE'});
 assert.equal(d.writes.filter(cmd=>cmd[0]===0x53).length,1);
});
test('identity rejects unexpected handshake and sends no memory commands',async()=>{
 const d=device({badIdentity:true});
 await assert.rejects(new UV16ReadOnlySession({port:d.port}).identify(),{code:'WRONG_IDENTITY'});
 assert.equal(d.writes.some(cmd=>cmd[0]===0x53),false);
});

test('read reuses identified session and does not issue another magic handshake',async()=>{
 const d=device(),session=new UV16ReadOnlySession({port:d.port});
 const identity=await session.identify();
 assert.equal(identity.firmware,'HN5RV01');
 const result=await session.readMemory();
 assert.equal(result.capacity,128);
 assert.equal(result.channels.length,6);
 assert.equal(d.writes.filter(x=>x.length===1&&x[0]===0x50).length,1);
 assert.equal(d.writes.filter(x=>x[0]===0x53).length,36); // one identify firmware + 3 aux + 32 memories
 assert.equal(d.writes.some(x=>x[0]===0x57),false);
 await assert.rejects(session.readMemory(),{code:'SESSION_USED'});
});
test('failed identification closes session and cannot continue into read',async()=>{
 const d=device({badFirmware:true}),session=new UV16ReadOnlySession({port:d.port});
 await assert.rejects(session.identify(),{code:'WRONG_FIRMWARE'});
 await assert.rejects(session.readMemory(),{code:'SESSION_USED'});
});
