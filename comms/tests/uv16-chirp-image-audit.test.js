import test from 'node:test';
import assert from 'node:assert/strict';
import {captureUV16ReadRegions} from '../uv16-read-regions.js';
import {inspectUV16CHIRPImage} from '../uv16-chirp-image-audit.js';
const marker=Uint8Array.from([0xff,99,104,105,114,112,0xee,105,109,103,0,1]);
function fixture(){
 const channels=new Uint8Array(2048).fill(0xff);
 channels.set([0,0x25,0x52,0x14,0,0x25,0x52,0x14,0,0,0,0,0,0,0,0x44],32);
 const payload=new Uint8Array(6473).fill(0xff);
 payload.set([0xaa,0x30,0x76,4,0,5,0x20,0xdd],0);
 payload.set(channels,8);payload.set(Buffer.from('HN5RV01'),6200);
 const metadata={rclass:'BaofengBFF8HPRadio',vendor:'Baofeng',model:'BF-F8HP',chirp_version:'next-20261030'};
 const encoded=Buffer.from(JSON.stringify(metadata)).toString('base64');
 const file=new Uint8Array(payload.length+marker.length+encoded.length);
 file.set(payload);file.set(marker,payload.length);file.set(Buffer.from(encoded),payload.length+marker.length);
 const auxiliary=new Map([0x1e80,0x1ec0,0x1fc0].map(a=>[a,new Uint8Array(64)]));
 const snapshot=captureUV16ReadRegions({firmware:'HN5RV01',channelBytes:channels,auxiliary});
 return {file,snapshot};
}
test('inspect CHIRP image metadata, firmware and exact 2048-byte channel alignment',()=>{
 const {file,snapshot}=fixture();const report=inspectUV16CHIRPImage(file,{snapshot});
 assert.equal(report.payloadBytes,6473);
 assert.equal(report.metadata.model,'BF-F8HP');
 assert.equal(report.metadata.chirpVersion,'next-20261030');
 assert.deepEqual(report.firmwareOffsets,[6200]);
 assert.deepEqual(report.exactChannelSpanOffsets,[8]);
 assert.equal(report.radioIdentityMatches,true);
 assert.equal(report.restorableBackupVerified,false);
 assert.equal(report.canWrite,false);
});
test('inspect without a previous snapshot does not assert channel alignment',()=>{
 const {file}=fixture();const report=inspectUV16CHIRPImage(file);
 assert.equal(report.snapshotCompared,false);
 assert.deepEqual(report.exactChannelSpanOffsets,[]);
});
test('mismatched snapshot cannot be reported as matching',()=>{
 const {file,snapshot}=fixture();const channels=Uint8Array.from(snapshot.memory.bytesHex.match(/../g),v=>parseInt(v,16));channels[33]^=1;
 const auxiliary=new Map([0x1e80,0x1ec0,0x1fc0].map(a=>[a,new Uint8Array(64)]));
 const different=captureUV16ReadRegions({firmware:'HN5RV01',channelBytes:channels,auxiliary});
 assert.deepEqual(inspectUV16CHIRPImage(file,{snapshot:different}).exactChannelSpanOffsets,[]);
});
test('reject malformed metadata, missing marker and tampered snapshot',()=>{
 const {file,snapshot}=fixture();
 assert.throws(()=>inspectUV16CHIRPImage(file.slice(0,6473)),/marker/);
 const corrupt=file.slice();corrupt[corrupt.length-1]=33;
 assert.throws(()=>inspectUV16CHIRPImage(corrupt),/metadata/);
 assert.throws(()=>inspectUV16CHIRPImage(file,{snapshot:{...snapshot,integrity:{...snapshot.integrity,value:'bad'}}}),/integrity/);
});
