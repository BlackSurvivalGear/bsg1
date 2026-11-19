import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeKnownUV16Memories,extractReadBlocks} from '../uv16-trace-decoder.js';
// Minimal, anonymised fixture reconstructed from the six channel bytes in
// the owner's successful CHIRP read. All other memory bytes are omitted.
const block0=[
  '00 25 01 14 00 25 01 14 00 00 00 00 00 00 00 44',
  '00 25 52 14 00 25 52 14 00 00 00 00 00 00 00 44',
  '00 25 03 15 00 25 03 15 00 00 00 00 00 00 00 44',
  'ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff'
];
const block1=[
  '00 25 01 44 00 25 01 44 00 00 00 00 00 00 00 44',
  '00 25 52 44 00 25 52 44 00 00 00 00 00 00 00 44',
  '00 25 03 45 00 25 03 45 00 00 00 00 00 00 00 44',
  'ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff'
];
function frame(addr,rows){
  const x=addr.toString(16).padStart(4,'0'),hi=x.slice(0,2),lo=x.slice(2);
  return [' 0.000 W 000: 53 '+hi+' '+lo+' 40',' 0.100 R 000: 06',
    ' 0.200 R 000: 58 '+hi+' '+lo+' 40',
    ...rows.map((s,i)=>' 0.300 R '+String(i*16).padStart(3,'0')+': '+s),
    ' 0.400 W 000: 06'].join('\n');
}
const trace='Radio Version is HN5RV01\n'+frame(0,block0)+'\n'+frame(64,block1);
test('decode six reference frequencies from framed read bytes',()=>{
  const result=decodeKnownUV16Memories(trace);
  assert.equal(result.firmware,'HN5RV01');
  assert.deepEqual(result.channels.map(c=>c.rx),[140.125,145.225,150.325,440.125,445.225,450.325]);
  assert.deepEqual(result.channels.map(c=>c.tx),result.channels.map(c=>c.rx));
});
test('reject a frame with missing radio acknowledgement',()=>{
  assert.throws(()=>extractReadBlocks(trace.replace('0.100 R 000: 06','0.100 R 000: 07')),{code:'INVALID_FRAME'});
});
test('reject missing second memory block',()=>{
  assert.throws(()=>decodeKnownUV16Memories('HN5RV01\n'+frame(0,block0)),{code:'MISSING_BLOCK'});
});
test('reject incorrect firmware identification',()=>{
  assert.throws(()=>decodeKnownUV16Memories(trace.replace('HN5RV01','UNKNOWN')),{code:'UNKNOWN_FIRMWARE'});
});
test('reject invalid BCD and duplicate read frames',()=>{
  const bad=trace.replace('00 25 01 14','fa 25 01 14');
  assert.throws(()=>decodeKnownUV16Memories(bad),{code:'INVALID_BCD'});
  assert.throws(()=>extractReadBlocks(trace+'\n'+frame(0,block0)),{code:'DUPLICATE_BLOCK'});
});
test('reject truncated frames and unsupported channel counts',()=>{
  assert.throws(()=>decodeKnownUV16Memories(trace.slice(0,-50)),{code:'INVALID_FRAME'});
  assert.throws(()=>decodeKnownUV16Memories(trace,{count:7}),{code:'UNSUPPORTED_COUNT'});
});
