import test from 'node:test';
import assert from 'node:assert/strict';
import {auditUV16ProtocolTrace,formatUV16ProtocolAudit} from '../uv16-protocol-evidence.js';
const row=(direction,bytes)=>'1.000 '+direction+' 000: '+bytes.map(x=>x.toString(16).padStart(2,'0')).join(' ');
function readTrace(){
 const request=row('W',[0x53,0,0,0x40]);
 const ack=row('R',[6]);
 const header=row('R',[0x58,0,0,0x40]);
 const payload=row('R',new Array(64).fill(0xff));
 return [request,ack,header,payload,row('W',[6])].join('\n');
}
test('read-only traffic never establishes write protocol',()=>{
 const report=auditUV16ProtocolTrace(readTrace());
 assert.equal(report.verifiedReadBlocks,1);
 assert.equal(report.readRequests.length,1);
 assert.equal(report.unclassifiedHostFrames.length,0);
 assert.equal(report.writeOpcodeVerified,false);
 assert.equal(report.commitVerified,false);
 assert.equal(report.recoveryVerified,false);
 assert.equal(report.canWrite,false);
 assert.match(formatUV16ProtocolAudit(report),/Hardware write: BLOCKED/);
});
test('unknown host frames are evidence to investigate, not write commands',()=>{
 const report=auditUV16ProtocolTrace(readTrace()+'\n'+row('W',[0x57,0,0,0x40,1,2]));
 assert.equal(report.unclassifiedHostFrames.length,1);
 assert.equal(report.unclassifiedHostFrames[0].length,6);
 assert.equal(report.unclassifiedFramesAreWriteProof,false);
 assert.equal(report.hardwareWriteEnabled,false);
 assert.equal('writeFrame' in report,false);
});
test('invalid traces fail closed and incomplete read sessions report warnings',()=>{
 assert.throws(()=>auditUV16ProtocolTrace(''),/Invalid trace size/);
 assert.throws(()=>auditUV16ProtocolTrace('not a trace'),/No supported serial trace/);
 const report=auditUV16ProtocolTrace(row('W',[0x53,0,0,0x40]));
 assert.equal(report.verifiedReadBlocks,0);
 assert.ok(report.readFrameError);
 assert.equal(report.canWrite,false);
});
