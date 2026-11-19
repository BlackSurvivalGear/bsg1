import test from 'node:test';
import assert from 'node:assert/strict';
import {parseChirpCSV} from '../chirp-csv.js';
import {compareDecodedMemories,ReadbackComparisonError} from '../radio-readback-compare.js';
const head='Location,Name,Frequency,Duplex,Offset,Tone,rToneFreq,cToneFreq,DtcsCode,DtcsPolarity,Mode,Power,Skip,Comment';
const reference=parseChirpCSV(head+'\n0,,140.125000,,0,,,,,,FM,,,\n1,,145.225000,,0,,,,,,FM,,,\n2,,150.325000,,0,,,,,,FM,,,\n3,,440.125000,,0,,,,,,FM,,,\n4,,445.225000,,0,,,,,,FM,,,\n5,,450.325000,,0,,,,,,FM,,,\n');
const copy=()=>reference.map(x=>({...x}));
test('six known CHIRP channels compare identically without changing source',()=>{
  const decoded=copy();const snapshot=JSON.stringify(decoded);
  assert.deepEqual(compareDecodedMemories({referenceChannels:reference,decodedChannels:decoded}),{match:true,compared:6,mismatches:[]});
  assert.equal(JSON.stringify(decoded),snapshot);
});
test('numeric frequency formatting is equivalent',()=>{
  const decoded=copy();decoded[0].rx='140.125';decoded[0].tx='140.125000';
  assert.equal(compareDecodedMemories({referenceChannels:reference,decodedChannels:decoded}).match,true);
});
test('single memory frequency mismatch is reported at zero-based slot',()=>{
  const decoded=copy();decoded[4].rx='445.2375';
  const result=compareDecodedMemories({referenceChannels:reference,decodedChannels:decoded});
  assert.equal(result.match,false);
  assert.deepEqual(result.mismatches,[{slot:4,field:'rx',expected:'445.225',actual:'445.2375'}]);
});
test('mode and TX mismatches are both detected',()=>{
  const decoded=copy();decoded[2].mode='NFM';decoded[2].tx='150.3375';
  assert.deepEqual(compareDecodedMemories({referenceChannels:reference,decodedChannels:decoded}).mismatches.map(m=>m.field),['tx','mode']);
});
test('missing and surplus memories fail closed',()=>{
  for(const channels of [copy().slice(0,5),[...copy(),copy()[0]]])
    assert.throws(()=>compareDecodedMemories({referenceChannels:reference,decodedChannels:channels}),{code:'MEMORY_COUNT_MISMATCH'});
});
test('malformed memory fails closed',()=>{
  const decoded=copy();decoded[1].rx='not-a-frequency';
  assert.throws(()=>compareDecodedMemories({referenceChannels:reference,decodedChannels:decoded}),{code:'INVALID_MEMORY'});
});
test('empty inputs and oversized input fail closed',()=>{
  assert.throws(()=>compareDecodedMemories(),ReadbackComparisonError);
  assert.throws(()=>compareDecodedMemories({referenceChannels:reference,decodedChannels:new Array(1001)}),{code:'INVALID_LENGTH'});
});
test('comparison has no serial or write capability',()=>{
  assert.equal(typeof compareDecodedMemories,'function');
  assert.equal('write' in compareDecodedMemories,false);
});
