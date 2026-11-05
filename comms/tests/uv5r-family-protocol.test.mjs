import test from 'node:test';
import assert from 'node:assert/strict';
import {UV5RFamilyProtocol,makeReadRequest,parseReadResponse} from '../uv5r-family-protocol.js';
const ack=Uint8Array.of(6);
function mock(reads){return {kind:'mock',writes:[],async write(b){this.writes.push([...b]);},async read(n){const next=reads.shift();assert.equal(next?.length,n);return next;}};}
test('UV-5R identification and framed read via offline byte mock',async()=>{
 const data=Uint8Array.from({length:64},(_,i)=>i);
 const transport=mock([ack,Uint8Array.of(0x50,1,2,3,4,5,6,0xDD),ack,ack,Uint8Array.of(0x58,0,0x40,0x40,...data)]);
 const driver=new UV5RFamilyProtocol({transport});
 const identity=await driver.identify();
 assert.equal(identity.model,'uv-5r');assert.equal(identity.simulated,true);
 assert.deepEqual(await driver.readBlock(0x40),data);
 assert.deepEqual(transport.writes.at(-2),[0x53,0,0x40,0x40]);
 assert.deepEqual(transport.writes.at(-1),[6]);
});
test('BF-F8HP requires explicit verified magic and accepts mock framing',async()=>{
 assert.throws(()=>new UV5RFamilyProtocol({transport:mock([]),model:'bf-f8hp'}),{code:'HANDSHAKE_UNVERIFIED'});
 const driver=new UV5RFamilyProtocol({transport:mock([ack,new Uint8Array(8),ack]),model:'bf-f8hp',magic:[1,2,3,4,5,6,7]});
 assert.equal((await driver.identify()).model,'bf-f8hp');
});
test('reject malformed frames, addresses and wrong opcodes',()=>{
 assert.deepEqual([...makeReadRequest(0x1EC0)],[0x53,0x1E,0xC0,0x40]);
 assert.throws(()=>makeReadRequest(0xFFE0),{code:'INVALID_BLOCK'});
 assert.throws(()=>parseReadResponse(new Uint8Array(68),0),{code:'INVALID_BLOCK_RESPONSE'});
});
test('reject physical transport, bad acknowledgement, and writes',async()=>{
 assert.throws(()=>new UV5RFamilyProtocol({transport:{kind:'usb',write(){},read(){}}}),{code:'HARDWARE_UNVERIFIED'});
 const driver=new UV5RFamilyProtocol({transport:mock([Uint8Array.of(0)])});
 await assert.rejects(driver.identify(),{code:'ACK_REJECTED'});
 await assert.rejects(driver.readBlock(0),{code:'NOT_IDENTIFIED'});
 await assert.rejects(driver.writeMemory(),{code:'WRITE_DISABLED'});
});
test('reject incorrect response address after identification',async()=>{
 const transport=mock([ack,new Uint8Array(8),ack,ack,Uint8Array.of(0x58,0,0x80,0x40,...new Uint8Array(64))]);
 const driver=new UV5RFamilyProtocol({transport});
 await driver.identify();
 await assert.rejects(driver.readBlock(0x40),{code:'INVALID_BLOCK_RESPONSE'});
});
