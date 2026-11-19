import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareUV16WritePlan,formatUV16WritePlan,WRITE_PREP_FORMAT} from '../uv16-write-preparation.js';
const channel=(overrides={})=>({
 name:'M03',rx:'145.22500',tx:'145.22500',mode:'FM',notes:'',
 power:'Default',tone:'None',toneValue:'',direction:'Simplex',offset:'0',
 scan:true,receiveOnly:true,...overrides
});
test('offline write plan validates a safe receive-only editor row without exposing writable bytes',()=>{
 const p=prepareUV16WritePlan({model:'uv-16-pro-v2',channels:[channel()]});
 assert.equal(p.format,WRITE_PREP_FORMAT);
 assert.equal(p.kind,'OFFLINE_DRY_RUN_ONLY');
 assert.equal(p.readyForHardware,false);
 assert.equal(p.writeEnabled,false);
 assert.equal(p.rawMemoryBackupAvailable,false);
 assert.equal(p.firmwareMatchedEncoderVerified,false);
 assert.equal(p.editorCount,1);
 assert.equal(p.validatedCount,1);
 assert.equal(p.radioCapacity,128);
 assert.equal(p.entries[0].radioMemorySlot,null);
 assert.deepEqual(p.issues,[]);
 assert.ok(p.blockers.some(x=>x.includes('restorable raw radio-memory backup')));
 assert.ok(!('bytes' in p.entries[0]));
 assert.ok(!('writeCommand' in p));
 assert.ok(Object.isFrozen(p.entries));
});
test('no radio or USB object is needed; invalid and oversized plans remain blocked',()=>{
 const invalid=prepareUV16WritePlan({model:'uv-16-pro-v2',channels:[channel({rx:'invalid'})]});
 assert.equal(invalid.validatedCount,0);
 assert.match(invalid.issues.join(' '),/Channel 1/);
 const many=prepareUV16WritePlan({model:'uv-16-pro-v2',channels:Array.from({length:129},(_,i)=>channel({name:'M'+i}))});
 assert.equal(many.editorCount,129);
 assert.match(many.issues.join(' '),/only 128 memory slots/);
 assert.equal(many.readyForHardware,false);
});
test('unsupported models, empty editor and duplicate names produce explicit review issues',()=>{
 const unsupported=prepareUV16WritePlan({model:'uv-5r',channels:[]});
 assert.match(unsupported.issues.join(' '),/only for the UV-16 Pro V2/);
 assert.match(unsupported.issues.join(' '),/No channels/);
 const dup=prepareUV16WritePlan({model:'uv-16-pro-v2',channels:[channel(),channel({name:'m03'})]});
 assert.match(dup.issues.join(' '),/duplicate channel name/);
});
test('unverified transmit, tones and offsets are identified without guessing memory bytes',()=>{
 const p=prepareUV16WritePlan({model:'uv-16-pro-v2',channels:[channel({
  receiveOnly:false,power:'High',tone:'CTCSS',toneValue:'88.5',direction:'Plus',offset:'0.6'
 })]});
 assert.equal(p.validatedCount,1);
 assert.match(p.issues.join(' '),/transmit configuration/);
 assert.match(p.issues.join(' '),/advanced settings is unverified/);
 assert.equal(p.entries[0].radioMemorySlot,null);
});
test('report distinguishes editor backup from a hardware memory image',()=>{
 const p=prepareUV16WritePlan({model:'uv-16-pro-v2',channels:[channel()]});
 const report=formatUV16WritePlan(p);
 assert.match(report,/Hardware write: BLOCKED/);
 assert.match(report,/OFFLINE WRITE PREPARATION/);
 assert.match(report,/NOT a restorable radio-memory image/);
 assert.throws(()=>formatUV16WritePlan({}),/Invalid write preparation report/);
});
