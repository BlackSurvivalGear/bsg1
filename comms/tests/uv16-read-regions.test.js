import test from 'node:test';
import assert from 'node:assert/strict';
import {captureUV16ReadRegions,validateUV16ReadRegions,UV16_RAW_SNAPSHOT_FORMAT} from '../uv16-read-regions.js';
const memory=Uint8Array.from({length:2048},(_,i)=>i%256);
const auxiliary=()=>new Map([[0x1e80,new Uint8Array(64).fill(1)],[0x1ec0,new Uint8Array(64).fill(2)],[0x1fc0,new Uint8Array(64).fill(3)]]);
test('preserves every byte of previously read memory and all three auxiliary blocks',()=>{
 const snap=captureUV16ReadRegions({firmware:'HN5RV01',channelBytes:memory,auxiliary:auxiliary()});
 assert.equal(snap.format,UV16_RAW_SNAPSHOT_FORMAT);
 assert.equal(snap.memory.bytesHex.length,4096);
 assert.equal(snap.auxiliary.length,3);
 assert.deepEqual(snap.auxiliary.map(x=>x.address),[0x1e80,0x1ec0,0x1fc0]);
 assert.equal(snap.memory.bytesHex.slice(0,8),'00010203');
 assert.equal(snap.memory.bytesHex.slice(-8),'fcfdfeff');
 assert.equal(snap.auxiliary[0].bytesHex,'01'.repeat(64));
 assert.equal(snap.restorable,false);
 assert.equal(snap.hardwareWriteEnabled,false);
 assert.ok(validateUV16ReadRegions(JSON.parse(JSON.stringify(snap))));
 assert.ok(Object.isFrozen(snap.memory));
 assert.ok(Object.isFrozen(snap.auxiliary));
});
test('rejects truncated reads and unknown firmware without producing a snapshot',()=>{
 assert.throws(()=>captureUV16ReadRegions({firmware:'UNKNOWN',channelBytes:memory,auxiliary:auxiliary()}),/Incomplete or unexpected/);
 assert.throws(()=>captureUV16ReadRegions({firmware:'HN5RV01',channelBytes:memory.slice(0,128),auxiliary:auxiliary()}),/Incomplete or unexpected/);
 const a=auxiliary();a.delete(0x1fc0);
 assert.throws(()=>captureUV16ReadRegions({firmware:'HN5RV01',channelBytes:memory,auxiliary:a}),/Incomplete/);
});
test('import validator rejects modified bytes, unknown metadata and false restorable claims',()=>{
 const snap=captureUV16ReadRegions({firmware:'HN5RV01',channelBytes:memory,auxiliary:auxiliary()});
 for(const changed of [
  {...snap,memory:{...snap.memory,bytesHex:'ff'+snap.memory.bytesHex.slice(2)}},
  {...snap,restorable:true},
  {...snap,hardwareWriteEnabled:true},
  {...snap,auxiliary:[...snap.auxiliary].reverse()}
 ])assert.throws(()=>validateUV16ReadRegions(changed));
});
test('format contains no write commands, serial handles or writable memory payload APIs',()=>{
 const snap=captureUV16ReadRegions({firmware:'HN5RV01',channelBytes:memory,auxiliary:auxiliary()});
 assert.equal('write' in snap,false);
 assert.equal('port' in snap,false);
 assert.equal('encodedWrite' in snap,false);
});
