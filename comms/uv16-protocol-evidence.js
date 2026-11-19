// Offline protocol-evidence classifier for UV-16 / HN5RV01.
// Does not derive or generate write commands. Never opens serial ports.
import {extractReadBlocks} from './uv16-trace-decoder.js';

export const UV16_PROTOCOL_EVIDENCE_FORMAT='bsg-uv16-protocol-evidence-v1';
const LINE=/^\s*\d+(?:\.\d+)?\s+([WR])\s+\d{3}:\s*((?:[\da-fA-F]{2}(?:\s+|$))+)/;
function parseTrace(trace){
 if(typeof trace!=='string'||!trace.length||trace.length>5_000_000)throw Error('Invalid trace size');
 const entries=[];
 for(const line of trace.split(/\r?\n/)){
  const match=line.match(LINE);
  if(!match)continue;
  entries.push({direction:match[1],bytes:match[2].trim().split(/\s+/).map(x=>parseInt(x,16))});
 }
 if(!entries.length)throw Error('No supported serial trace entries');
 return entries;
}
/**
 * Classifies observed host->radio traffic, never guesses opcodes.
 * A trace that only contains the known read session cannot establish a write
 * protocol, ACK/commit sequence, restore path or writable address range.
 */
export function auditUV16ProtocolTrace(trace){
 const entries=parseTrace(trace);
 const readRequests=[],unclassified=[];
 for(const [index,entry] of entries.entries()){
  if(entry.direction!=='W')continue;
  const b=entry.bytes;
  if(b.length===4&&b[0]===0x53&&b[3]===0x40){
   readRequests.push(Object.freeze({index,address:(b[1]<<8)|b[2]}));
  }else if(!(b.length===1&&([0x06,0x02,0x50,0xbb,0xff,0x20,0x12,0x07,0x25].includes(b[0])))){
   unclassified.push(Object.freeze({index,length:b.length,firstByteHex:b[0].toString(16).padStart(2,'0')}));
  }
 }
 let verifiedReadBlocks=0,readFrameError=null;
 try{verifiedReadBlocks=extractReadBlocks(trace).size;}
 catch(error){readFrameError=error.message;}
 return Object.freeze({
  format:UV16_PROTOCOL_EVIDENCE_FORMAT,kind:'OFFLINE_EVIDENCE_AUDIT_ONLY',
  traceEntries:entries.length,readRequests:Object.freeze(readRequests),
  verifiedReadBlocks,readFrameError,
  unclassifiedHostFrames:Object.freeze(unclassified),
  unclassifiedFramesAreWriteProof:false,
  writeOpcodeVerified:false,writeAcknowledgementsVerified:false,
  writeAddressBoundsVerified:false,commitVerified:false,recoveryVerified:false,
  restorableBackupVerified:false,hardwareWriteEnabled:false,canWrite:false,
  nextEvidence:'Obtain independently documented HN5RV01 write-session evidence and a proven restorable backup before any physical write.',
  warning:'Unclassified frames are NOT evidence of a valid write opcode. Never replay them against a radio.'
 });
}
export function formatUV16ProtocolAudit(report){
 if(report?.format!==UV16_PROTOCOL_EVIDENCE_FORMAT||report.canWrite!==false)throw Error('Invalid protocol audit');
 return [
  'UV-16 HN5RV01 — OFFLINE WRITE-PROTOCOL EVIDENCE',
  'Hardware write: BLOCKED',
  'Parsed trace entries: '+report.traceEntries,
  'Observed read requests: '+report.readRequests.length,
  'Validated read blocks: '+report.verifiedReadBlocks,
  'Unclassified host frames (NOT write proof): '+report.unclassifiedHostFrames.length,
  ...(report.readFrameError?['Read-frame warning: '+report.readFrameError]:[]),
  'Write opcode, ACK, writable bounds, commit and recovery: UNVERIFIED',
  report.nextEvidence
 ].join('\n');
}
