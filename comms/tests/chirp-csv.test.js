import test from 'node:test';
import assert from 'node:assert/strict';
import {parseChirpCSV} from '../chirp-csv.js';
const head='Location,Name,Frequency,Duplex,Offset,Tone,rToneFreq,cToneFreq,DtcsCode,DtcsPolarity,Mode,Power,Skip,Comment';
test('CHIRP simplex, quoted names and skip flag are imported receive-only',()=>{
 const result=parseChirpCSV(head+'\n0,"HQ, MAIN",145.500000,,0.000000,,88.5,88.5,023,NN,FM,High,S,"First, channel"\n');
 assert.equal(result.length,1);assert.equal(result[0].name,'HQ, MAIN');
 assert.equal(result[0].rx,'145.5');assert.equal(result[0].tx,'145.5');
 assert.equal(result[0].scan,false);assert.equal(result[0].receiveOnly,true);
 assert.equal(result[0].notes,'First, channel');
});
test('CHIRP repeater TX is computed and CTCSS preserved',()=>{
 const c=parseChirpCSV(head+'\n1,Repeater,145.600000,-,0.600000,Tone,88.5,88.5,023,NN,NFM,Low,,Test\n')[0];
 assert.equal(c.tx,'145');assert.equal(c.direction,'Minus');assert.equal(c.offset,'0.6');
 assert.equal(c.tone,'CTCSS');assert.equal(c.toneValue,'88.5');assert.equal(c.power,'Low');
 assert.equal(c.receiveOnly,true);
});
test('CHIRP split and off remain receive-only',()=>{
 const values=parseChirpCSV(head+'\n1,Split,145.5,split,146.5,,,,,,FM,,,\n2,Off,145.6,off,0,,,,,,FM,,,\n');
 assert.equal(values[0].tx,'146.5');assert.equal(values[1].receiveOnly,true);
});
test('unsupported mode, tone and invalid input reject entire import',()=>{
 assert.throws(()=>parseChirpCSV(head+'\n1,Digital,145.5,,0,,,,,,DV,,,\n'),/Unsupported mode/);
 assert.throws(()=>parseChirpCSV(head+'\n1,Cross,145.5,,0,Cross,,,,,FM,,,\n'),/Unsupported tone/);
 assert.throws(()=>parseChirpCSV(head+'\n1,Bad,word,,0,,,,,,FM,,,\n'),/Invalid CHIRP frequency/);
 assert.throws(()=>parseChirpCSV('name,rx,tx,mode,notes'),/Missing CHIRP column/);
});
test('multiline comments and BOM work',()=>{
 const item=parseChirpCSV('\uFEFF'+head+'\r\n1,Test,145.5,,0,,,,,,FM,,,"Line one\r\nLine two"\r\n')[0];
 assert.match(item.notes,/Line two/);
});
