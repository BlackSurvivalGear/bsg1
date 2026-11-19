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
function device({badHeader=false,badFirmware=false,badIdentity=false}={}){
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
    if(addr===0)for(let i=0;i<4;i++)body.set(fromHex(rows[i]),i*16);
    if(addr===64)for(let i=0;i<4;i++)body.set(fromHex(rows[i+4]),i*16);
    queue([6,badHeader?0x59:0x58,data[1],data[2],64,...body]);return;
   }
   if(data.length===1&&data[0]===6)return;
   throw Error('Unexpected protocol command');
  },releaseLock(){}})}
 };
 return {port,writes};
}
test('replays captured wire sequence and decodes the six memories',async()=>{
 const d=device(),session=new UV16ReadOnlySession({port:d.port});
 const result=await session.readSample();
 assert.deepEqual(result.channels.map(c=>c.rx),[140.125,145.225,150.325,440.125,445.225,450.325]);
 assert.deepEqual(result.channels.map(c=>c.tx),result.channels.map(c=>c.rx));
 assert.equal(result.hardwareVerified,false);
 assert.equal(d.writes.some(x=>x.includes(0x57)),false);
});
test('reject corrupt frame',async()=>{
 await assert.rejects(new UV16ReadOnlySession({port:device({badHeader:true}).port}).readSample(),{code:'BAD_FRAME'});
});
test('reject unknown firmware',async()=>{
 await assert.rejects(new UV16ReadOnlySession({port:device({badFirmware:true}).port}).readSample(),{code:'WRONG_FIRMWARE'});
});
test('reject wrong identity before memory requests',async()=>{
 const d=device({badIdentity:true});
 await assert.rejects(new UV16ReadOnlySession({port:d.port}).readSample(),{code:'WRONG_IDENTITY'});
 assert.equal(d.writes.some(x=>x[0]===0x53),false);
});
test('cancelled session sends no bytes',async()=>{
 const controller=new AbortController();controller.abort();
 const d=device();
 await assert.rejects(new UV16ReadOnlySession({port:d.port}).readSample({signal:controller.signal}),{code:'ABORTED'});
 assert.equal(d.writes.length,0);
});
test('session is single-use and cannot write arbitrary commands',async()=>{
 const session=new UV16ReadOnlySession({port:device().port});
 assert.equal('write' in session,false);
 await session.readSample();
 await assert.rejects(session.readSample(),{code:'SESSION_USED'});
});
