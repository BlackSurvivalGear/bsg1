import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleToEditorRows,appendSampleRows} from '../uv16-sample-import.js';
const sample={hardwareVerified:false,firmware:'HN5RV01',capacity:128,channels:[
{slot:0,rx:140.125,tx:140.125},{slot:1,rx:145.225,tx:145.225},
{slot:2,rx:150.325,tx:150.325},{slot:4,rx:440.125,tx:440.125},
{slot:5,rx:445.225,tx:445.225},{slot:6,rx:450.325,tx:450.325}]};
test('turns actual sample slots into six receive-only editor rows',()=>{
 const rows=sampleToEditorRows(sample);
 assert.equal(rows.length,6);
 assert.deepEqual(rows.map(c=>c.name),['UV16-M01','UV16-M02','UV16-M03','UV16-M05','UV16-M06','UV16-M07']);
 assert.equal(rows[3].rx,'440.12500');
 assert.equal(rows[3].tx,'440.12500');
 assert.ok(rows.every(c=>c.receiveOnly===true&&c.notes.includes('NOT verified')));
});
test('append retains all existing local rows without changing or reordering them',()=>{
 const existing=[{name:'BSG-V01',rx:'164.0500',tx:'164.0500',mode:'NFM',notes:'Existing'}];
 const snapshot=JSON.stringify(existing),rows=sampleToEditorRows(sample);
 const combined=appendSampleRows(existing,rows);
 assert.equal(combined.length,7);
 assert.deepEqual(combined[0],existing[0]);
 assert.equal(JSON.stringify(existing),snapshot);
 assert.equal(combined[1].name,'UV16-M01');
});
test('refuse missing or corrupt reads, oversized editor, or non-receive-only rows',()=>{
 assert.equal(sampleToEditorRows({...sample,channels:sample.channels.slice(0,5)}).length,5);
 assert.throws(()=>sampleToEditorRows({...sample,channels:sample.channels.map((c,i)=>i===1?{...c,slot:0}:c)}));
 assert.throws(()=>sampleToEditorRows({...sample,channels:sample.channels.map((c,i)=>i===1?{...c,rx:NaN}:c)}));
 assert.throws(()=>appendSampleRows(Array(999).fill({}),sampleToEditorRows(sample)));
 const rows=sampleToEditorRows(sample);rows[0].receiveOnly=false;
 assert.throws(()=>appendSampleRows([],rows));
});

test('second identical sample import is a no-op and never duplicates rows',()=>{
 const rows=sampleToEditorRows(sample);
 const first=appendSampleRows([],rows);
 const second=appendSampleRows(first,rows);
 assert.equal(first.length,6);
 assert.equal(second.length,6);
 assert.deepEqual(second,first);
});
test('partial previous import appends only missing samples and preserves modified rows',()=>{
 const rows=sampleToEditorRows(sample);
 const edited={...rows[0],notes:'User-edited note'};
 const result=appendSampleRows([edited,rows[1],rows[2]],rows);
 assert.equal(result.length,6);
 assert.equal(result[0].notes,'User-edited note');
 assert.deepEqual(result.slice(3).map(r=>r.name),rows.slice(3).map(r=>r.name));
});

test('accepts empty radio and a high memory slot without inventing missing rows',()=>{
 assert.deepEqual(sampleToEditorRows({...sample,channels:[]}),[]);
 const onlyHigh=sampleToEditorRows({...sample,channels:[{slot:127,rx:145.5,tx:145.5}]});
 assert.equal(onlyHigh.length,1);
 assert.equal(onlyHigh[0].name,'UV16-M128');
});
test('rejects excessive and out-of-range memory data',()=>{
 assert.throws(()=>sampleToEditorRows({...sample,channels:[{slot:128,rx:145.5,tx:145.5}]}));
 assert.throws(()=>sampleToEditorRows({...sample,channels:Array(129).fill({slot:0,rx:145,tx:145})}));
 assert.throws(()=>sampleToEditorRows({...sample,capacity:256}));
});
