import test from 'node:test';
import assert from 'node:assert/strict';
import {OfflineCapturedPeer,replayCapturedRead} from '../uv16-captured-read-sim.js';
const hex=s=>Uint8Array.from(s.split(' ').map(x=>parseInt(x,16)));
const blocks=()=>new Map([
 [0,hex('00 25 01 14 00 25 01 14 00 00 00 00 00 00 00 44 00 25 52 14 00 25 52 14 00 00 00 00 00 00 00 44 00 25 03 15 00 25 03 15 00 00 00 00 00 00 00 44 ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff')],
 [64,hex('00 25 01 44 00 25 01 44 00 00 00 00 00 00 00 44 00 25 52 44 00 25 52 44 00 00 00 00 00 00 00 44 00 25 03 45 00 25 03 45 00 00 00 00 00 00 00 44 ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff')]
]);
test('replay handshake, firmware marker and two reference blocks',async()=>{
 const peer=new OfflineCapturedPeer({blocks:blocks()});
 const result=await replayCapturedRead(peer);
 assert.equal(result.firmware,'HN5RV01');assert.equal(result.simulated,true);
 assert.deepEqual(result.blocks.get(0),blocks().get(0));
 assert.deepEqual(result.blocks.get(64),blocks().get(64));
 assert.equal(peer.sent.some(a=>a[0]===0x57),false);
});
test('reject external transport regardless of its interface',async()=>{
 await assert.rejects(replayCapturedRead({request:async()=>Uint8Array.of(6)}),{code:'HARDWARE_DISABLED'});
});
test('reject missing reference block',()=>assert.throws(()=>new OfflineCapturedPeer({blocks:new Map()}),{code:'INVALID_FIXTURE'}));
test('reject corrupt response header',async()=>assert.rejects(replayCapturedRead(new OfflineCapturedPeer({blocks:blocks(),corruptFrame:true})),{code:'INVALID_FRAME'}));
test('disconnect fails closed',async()=>assert.rejects(replayCapturedRead(new OfflineCapturedPeer({blocks:blocks(),disconnectAfter:2})),{code:'DISCONNECTED'}));
test('block address outside allowlist rejected',async()=>{
 const peer=new OfflineCapturedPeer({blocks:blocks()});
 await assert.rejects(peer.request(Uint8Array.of(0x53,0,128,64),1),{code:'ADDRESS_DENIED'});
});
